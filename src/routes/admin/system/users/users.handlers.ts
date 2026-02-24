import type { SystemUsersRouteHandlerType } from "./users.types";

import { eq } from "drizzle-orm";

import db from "@/db";
import { systemUsers } from "@/db/schema";
import { RefineQueryParamsSchema } from "@/lib/core/refine-query";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/core/stoker/http-status-phrases";
import { omit, Resp } from "@/utils";

import { createUser, listUsers, saveUserRoles, validateRolesExist } from "./users.helpers";

export const list: SystemUsersRouteHandlerType<"list"> = async (c) => {
  const query = c.req.query();

  const parseResult = RefineQueryParamsSchema.safeParse(query);
  if (!parseResult.success) {
    return c.json(Resp.fail(parseResult.error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [error, result] = await listUsers(parseResult.data);
  if (error) {
    return c.json(Resp.fail(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  const safeData = result.data.map(({ password, ...user }) => user);
  c.header("x-total-count", result.total.toString());

  return c.json(Resp.ok(safeData), HttpStatusCodes.OK);
};

export const create: SystemUsersRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const created = await createUser(body, sub);
  const userWithoutPassword = omit(created, ["password"]);

  return c.json(Resp.ok(userWithoutPassword), HttpStatusCodes.CREATED);
};

export const get: SystemUsersRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const user = await db.query.systemUsers.findFirst({
    where: eq(systemUsers.id, id),
    with: {
      systemUserRoles: {
        with: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const roles = user.systemUserRoles.map(({ role: { id, name } }) => ({ id, name }));
  const userWithoutPassword = omit(user, ["password", "systemUserRoles"]);

  return c.json(Resp.ok({ ...userWithoutPassword, roles }), HttpStatusCodes.OK);
};

export const update: SystemUsersRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  // Check if built-in user / 检查是否为内置用户
  const [user] = await db
    .select({ builtIn: systemUsers.builtIn })
    .from(systemUsers)
    .where(eq(systemUsers.id, id));

  if (!user) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  // Built-in users cannot have their status modified / 内置用户不允许修改状态
  if (user.builtIn && body.status !== undefined) {
    return c.json(Resp.fail("内置用户不允许修改状态"), HttpStatusCodes.FORBIDDEN);
  }

  // Direct password update not allowed / 不允许直接更新密码
  const updateData = omit(body, ["password"]);

  const [updated] = await db
    .update(systemUsers)
    .set({
      ...updateData,
      updatedBy: sub,
    })
    .where(eq(systemUsers.id, id))
    .returning();

  if (!updated) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const userWithoutPassword = omit(updated, ["password"]);

  return c.json(Resp.ok(userWithoutPassword), HttpStatusCodes.OK);
};

export const remove: SystemUsersRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  // Check if built-in user / 检查是否为内置用户
  const [user] = await db
    .select({ builtIn: systemUsers.builtIn })
    .from(systemUsers)
    .where(eq(systemUsers.id, id));

  if (!user) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  if (user.builtIn) {
    return c.json(Resp.fail("内置用户不允许删除"), HttpStatusCodes.FORBIDDEN);
  }

  const [deleted] = await db
    .delete(systemUsers)
    .where(eq(systemUsers.id, id))
    .returning({ id: systemUsers.id });

  if (!deleted) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(deleted), HttpStatusCodes.OK);
};

export const saveRoles: SystemUsersRouteHandlerType<"saveRoles"> = async (c) => {
  const { userId } = c.req.valid("param");
  const { roleIds } = c.req.valid("json");

  // Get user and their current roles / 获取用户及其当前角色
  const userWithRoles = await db.query.systemUsers.findFirst({
    where: eq(systemUsers.id, userId),
    columns: { id: true },
    with: {
      systemUserRoles: {
        columns: { roleId: true },
      },
    },
  });

  if (!userWithRoles) {
    return c.json(Resp.fail("用户不存在"), HttpStatusCodes.NOT_FOUND);
  }

  // Validate role existence / 验证角色存在性
  const invalidRoleIds = await validateRolesExist(roleIds);
  if (invalidRoleIds) {
    return c.json(Resp.fail(`角色不存在: ${invalidRoleIds.join(", ")}`), HttpStatusCodes.NOT_FOUND);
  }

  // Save user roles / 保存用户角色
  const currentRoleIds = userWithRoles.systemUserRoles.map(ur => ur.roleId);
  const result = await saveUserRoles(userId, roleIds, currentRoleIds);

  return c.json(Resp.ok(result), HttpStatusCodes.OK);
};
