import type { InferSelectModel } from "drizzle-orm";

import { and, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { sysUser } from "@/db/schema";
import { getDuplicateKeyError } from "@/lib/enums";
import { pagination } from "@/lib/pagination";
import { assignRolesToUser, createUser } from "@/services/user";
import { pickContext } from "@/utils";

import type { SysUsersRouteHandlerType } from "./sys-users.index";

export const list: SysUsersRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");
  const domain = c.get("userDomain");

  let whereCondition = eq(sysUser.domain, domain);

  // 搜索条件
  if (params.search) {
    const searchCondition = or(
      ilike(sysUser.username, `%${params.search}%`),
      ilike(sysUser.nickName, `%${params.search}%`),
    );
    whereCondition = and(whereCondition, searchCondition)!;
  }

  const result = await pagination<InferSelectModel<typeof sysUser>>(
    sysUser,
    whereCondition,
    { page: params.page, limit: params.limit },
  );

  // 移除密码字段
  const data = result.data.map(({ password, ...user }) => user);

  return c.json({ data, meta: result.meta }, HttpStatusCodes.OK);
};

export const create: SysUsersRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

  try {
    const user = await createUser({
      ...body,
      domain,
      createdBy: userId,
      // 处理可选字段
      avatar: body.avatar || undefined,
    });

    const { password, ...userWithoutPassword } = user;
    return c.json(userWithoutPassword, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return c.json(getDuplicateKeyError("username", "用户名已存在"), HttpStatusCodes.CONFLICT);
    }
    throw error;
  }
};

export const get: SysUsersRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");
  const domain = c.get("userDomain");

  const [user] = await db
    .select()
    .from(sysUser)
    .where(and(
      eq(sysUser.id, id),
      eq(sysUser.domain, domain),
    ));

  if (!user) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const { password, ...userWithoutPassword } = user;
  return c.json(userWithoutPassword, HttpStatusCodes.OK);
};

export const update: SysUsersRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

  // 不允许直接更新密码
  const { password, ...updateData } = body as any;

  const [updated] = await db
    .update(sysUser)
    .set({
      ...updateData,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(and(
      eq(sysUser.id, id),
      eq(sysUser.domain, domain),
    ))
    .returning();

  if (!updated) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const { password: _, ...userWithoutPassword } = updated;
  return c.json(userWithoutPassword, HttpStatusCodes.OK);
};

export const remove: SysUsersRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");
  const domain = c.get("userDomain");

  const [deleted] = await db
    .delete(sysUser)
    .where(and(
      eq(sysUser.id, id),
      eq(sysUser.domain, domain),
    ))
    .returning({ id: sysUser.id });

  if (!deleted) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const assignRoles: SysUsersRouteHandlerType<"assignRoles"> = async (c) => {
  const { id } = c.req.valid("param");
  const { roleIds } = c.req.valid("json");
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

  // 检查用户是否存在
  const [user] = await db
    .select({ id: sysUser.id })
    .from(sysUser)
    .where(and(
      eq(sysUser.id, id),
      eq(sysUser.domain, domain),
    ));

  if (!user) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const result = await assignRolesToUser(id, roleIds, domain, userId);
  return c.json(result, HttpStatusCodes.OK);
};
