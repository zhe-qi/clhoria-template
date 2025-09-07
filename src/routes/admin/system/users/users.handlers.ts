import type { z } from "zod";

import { hash } from "@node-rs/argon2";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { responseSystemUserListItemSchema } from "@/db/schema";

import db from "@/db";
import { systemRole, systemUser, systemUserRole } from "@/db/schema";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { omit, Resp } from "@/utils";

import type { SystemUsersRouteHandlerType } from "./users.index";

export const list: SystemUsersRouteHandlerType<"list"> = async (c) => {
  const query = c.req.query();

  const parseResult = RefineQueryParamsSchema.safeParse(query);
  if (!parseResult.success) {
    return c.json(parseResult.error, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [error, result] = await executeRefineQuery<z.infer<typeof responseSystemUserListItemSchema>>({
    table: systemUser,
    queryParams: parseResult.data,
    joinConfig: {
      joins: [
        {
          table: systemUserRole,
          type: "left",
          on: eq(systemUser.id, systemUserRole.userId),
        },
        {
          table: systemRole,
          type: "left",
          on: eq(systemUserRole.roleId, systemRole.id),
        },
      ],
      selectFields: {
        id: systemUser.id,
        username: systemUser.username,
        nickName: systemUser.nickName,
        roles: sql`json_agg(json_build_object('id', ${systemRole.id}, 'name', ${systemRole.name}))`,
        createdAt: systemUser.createdAt,
        updatedAt: systemUser.updatedAt,
        status: systemUser.status,
        avatar: systemUser.avatar,
      },
      groupBy: [systemUser.id],
    },
  });
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

  try {
    const hashedPassword = await hash(body.password);

    const [created] = await db
      .insert(systemUser)
      .values({
        ...body,
        password: hashedPassword,
        createdBy: sub,
        updatedBy: sub,
      })
      .returning();

    const userWithoutPassword = omit(created, ["password"]);

    return c.json(Resp.ok(userWithoutPassword), HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error?.code === "23505" && error?.constraint === "system_user_username_unique") {
      return c.json(
        Resp.fail("用户名已存在"),
        HttpStatusCodes.CONFLICT,
      );
    }

    return c.json(
      Resp.fail("请求参数验证错误"),
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    );
  }
};

export const get: SystemUsersRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const [user] = await db
    .select()
    .from(systemUser)
    .where(eq(systemUser.id, id));

  if (!user) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const userWithoutPassword = omit(user, ["password"]);

  return c.json(Resp.ok(userWithoutPassword), HttpStatusCodes.OK);
};

export const update: SystemUsersRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  // 检查是否为内置用户
  const [existingUser] = await db
    .select({ builtIn: systemUser.builtIn })
    .from(systemUser)
    .where(eq(systemUser.id, id));

  if (!existingUser) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  // 内置用户不允许修改状态
  if (existingUser.builtIn && body.status !== undefined) {
    return c.json(Resp.fail("内置用户不允许修改状态"), HttpStatusCodes.FORBIDDEN);
  }

  // 不允许直接更新密码
  const updateData = omit(body, ["password"]);

  const [updated] = await db
    .update(systemUser)
    .set({
      ...updateData,
      updatedBy: sub,
    })
    .where(eq(systemUser.id, id))
    .returning();

  if (!updated) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const userWithoutPassword = omit(updated, ["password"]);

  return c.json(Resp.ok(userWithoutPassword), HttpStatusCodes.OK);
};

export const remove: SystemUsersRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  // 检查是否为内置用户
  const [existingUser] = await db
    .select({ builtIn: systemUser.builtIn })
    .from(systemUser)
    .where(eq(systemUser.id, id));

  if (!existingUser) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  if (existingUser.builtIn) {
    return c.json(Resp.fail("内置用户不允许删除"), HttpStatusCodes.FORBIDDEN);
  }

  const [deleted] = await db
    .delete(systemUser)
    .where(eq(systemUser.id, id))
    .returning({ id: systemUser.id });

  if (!deleted) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(deleted), HttpStatusCodes.OK);
};

export const saveRoles: SystemUsersRouteHandlerType<"saveRoles"> = async (c) => {
  const { userId } = c.req.valid("param");
  const { roleIds } = c.req.valid("json");

  try {
    // 检查用户是否存在
    const [user] = await db
      .select({ id: systemUser.id })
      .from(systemUser)
      .where(eq(systemUser.id, userId))
      .limit(1);

    if (!user) {
      return c.json(Resp.fail("用户不存在"), HttpStatusCodes.NOT_FOUND);
    }

    // 检查所有新角色是否存在
    if (roleIds.length > 0) {
      const existingRoles = await db
        .select({ id: systemRole.id })
        .from(systemRole)
        .where(inArray(systemRole.id, roleIds));

      if (existingRoles.length !== roleIds.length) {
        const foundRoles = existingRoles.map(role => role.id);
        const notFoundRoles = roleIds.filter(roleId => !foundRoles.includes(roleId));
        return c.json(Resp.fail(`角色不存在: ${notFoundRoles.join(", ")}`), HttpStatusCodes.NOT_FOUND);
      }
    }

    // 获取用户当前的所有角色
    const currentUserRoles = await db
      .select({ roleId: systemUserRole.roleId })
      .from(systemUserRole)
      .where(eq(systemUserRole.userId, userId));

    const currentRoleIds = currentUserRoles.map(ur => ur.roleId);
    const currentRoleSet = new Set(currentRoleIds);
    const newRoleSet = new Set(roleIds);

    // 计算需要删除的角色（在当前角色中但不在新角色中）
    const rolesToRemove = currentRoleIds.filter(roleId => !newRoleSet.has(roleId));

    // 计算需要添加的角色（在新角色中但不在当前角色中）
    const rolesToAdd = roleIds.filter(roleId => !currentRoleSet.has(roleId));

    let removedCount = 0;
    let addedCount = 0;

    // 使用事务确保数据一致性
    await db.transaction(async (tx) => {
      // 删除不需要的角色
      if (rolesToRemove.length > 0) {
        const deleteResult = await tx
          .delete(systemUserRole)
          .where(and(
            eq(systemUserRole.userId, userId),
            inArray(systemUserRole.roleId, rolesToRemove),
          ))
          .returning({ roleId: systemUserRole.roleId });
        removedCount = deleteResult.length;
      }

      // 添加新的角色
      if (rolesToAdd.length > 0) {
        const valuesToInsert = rolesToAdd.map(roleId => ({
          userId,
          roleId,
        }));

        const insertResult = await tx
          .insert(systemUserRole)
          .values(valuesToInsert)
          .returning();
        addedCount = insertResult.length;
      }
    });

    return c.json(Resp.ok({
      added: addedCount,
      removed: removedCount,
      total: roleIds.length,
    }), HttpStatusCodes.OK);
  }
  catch {
    return c.json(Resp.fail("保存角色失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};
