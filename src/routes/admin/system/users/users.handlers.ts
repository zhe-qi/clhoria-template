import type { z } from "zod";

import { hash } from "@node-rs/argon2";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { responseSystemUserListItemSchema } from "@/db/schema";

import db from "@/db";
import { systemRole, systemUser, systemUserRole } from "@/db/schema";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { omit, parseTextToZodError } from "@/utils";

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
      },
      groupBy: [systemUser.id],
    },
  });
  if (error) {
    return c.json(parseTextToZodError(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  const safeData = result.data.map(({ password, ...user }) => user);
  c.header("x-total-count", result.total.toString());

  return c.json({ data: safeData }, HttpStatusCodes.OK);
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

    return c.json({ data: userWithoutPassword }, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error?.code === "23505" && error?.constraint === "system_user_username_unique") {
      return c.json(
        parseTextToZodError("用户名已存在"),
        HttpStatusCodes.CONFLICT,
      );
    }

    return c.json(
      parseTextToZodError("请求参数验证错误"),
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
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const userWithoutPassword = omit(user, ["password"]);

  return c.json({ data: userWithoutPassword }, HttpStatusCodes.OK);
};

export const update: SystemUsersRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

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
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const userWithoutPassword = omit(updated, ["password"]);

  return c.json({ data: userWithoutPassword }, HttpStatusCodes.OK);
};

export const remove: SystemUsersRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(systemUser)
    .where(eq(systemUser.id, id))
    .returning({ id: systemUser.id });

  if (!deleted) {
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json({ data: deleted }, HttpStatusCodes.OK);
};

export const addRole: SystemUsersRouteHandlerType<"addRole"> = async (c) => {
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
      return c.json(
        parseTextToZodError("用户不存在"),
        HttpStatusCodes.NOT_FOUND,
      );
    }

    // 检查所有角色是否存在
    const existingRoles = await db
      .select({ id: systemRole.id })
      .from(systemRole)
      .where(inArray(systemRole.id, roleIds));

    if (existingRoles.length !== roleIds.length) {
      const foundRoles = existingRoles.map(role => role.id);
      const notFoundRoles = roleIds.filter(roleId => !foundRoles.includes(roleId));
      return c.json(
        parseTextToZodError(`角色不存在: ${notFoundRoles.join(", ")}`),
        HttpStatusCodes.NOT_FOUND,
      );
    }

    // 检查用户是否已拥有这些角色
    const existingUserRoles = await db
      .select({ roleId: systemUserRole.roleId })
      .from(systemUserRole)
      .where(and(
        eq(systemUserRole.userId, userId),
        inArray(systemUserRole.roleId, roleIds),
      ));

    if (existingUserRoles.length > 0) {
      const existingRoleIds = existingUserRoles.map(ur => ur.roleId);
      return c.json(
        parseTextToZodError(`用户已拥有角色: ${existingRoleIds.join(", ")}`),
        HttpStatusCodes.CONFLICT,
      );
    }

    // 批量添加用户角色关联
    const valuesToInsert = roleIds.map(roleId => ({
      userId,
      roleId,
    }));

    const created = await db
      .insert(systemUserRole)
      .values(valuesToInsert)
      .returning();

    return c.json(
      parseTextToZodError(`成功添加 ${created.length} 个角色`),
      HttpStatusCodes.CREATED,
    );
  }
  catch {
    return c.json(
      parseTextToZodError("添加角色失败"),
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    );
  }
};

export const removeRole: SystemUsersRouteHandlerType<"removeRole"> = async (c) => {
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
      return c.json(
        parseTextToZodError("用户不存在"),
        HttpStatusCodes.NOT_FOUND,
      );
    }

    // 检查所有角色是否存在
    const existingRoles = await db
      .select({ id: systemRole.id })
      .from(systemRole)
      .where(inArray(systemRole.id, roleIds));

    if (existingRoles.length !== roleIds.length) {
      const foundRoles = existingRoles.map(role => role.id);
      const notFoundRoles = roleIds.filter(roleId => !foundRoles.includes(roleId));
      return c.json(
        parseTextToZodError(`角色不存在: ${notFoundRoles.join(", ")}`),
        HttpStatusCodes.NOT_FOUND,
      );
    }

    // 批量删除用户角色关联
    const result = await db
      .delete(systemUserRole)
      .where(and(
        eq(systemUserRole.userId, userId),
        inArray(systemUserRole.roleId, roleIds),
      ))
      .returning({ roleId: systemUserRole.roleId });

    return c.json({
      message: `成功删除 ${result.length} 个角色`,
      deletedCount: result.length,
    }, HttpStatusCodes.OK);
  }
  catch {
    return c.json(
      parseTextToZodError("删除角色失败"),
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    );
  }
};
