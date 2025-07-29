import type { InferSelectModel } from "drizzle-orm";

import { eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { systemRole } from "@/db/schema";
import { getDuplicateKeyError } from "@/lib/enums";
import { pagination } from "@/lib/pagination";
import { assignMenusToRole, assignPermissionsToRole, assignUsersToRole } from "@/lib/permissions";

import type { SystemRolesRouteHandlerType } from "./roles.index";

export const list: SystemRolesRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");

  let whereCondition;

  // 搜索条件
  if (params.search) {
    whereCondition = or(
      ilike(systemRole.code, `%${params.search}%`),
      ilike(systemRole.name, `%${params.search}%`),
    );
  }

  const result = await pagination<InferSelectModel<typeof systemRole>>(
    systemRole,
    whereCondition,
    { page: params.page, limit: params.limit },
  );

  return c.json(result, HttpStatusCodes.OK);
};

export const create: SystemRolesRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const userId = c.get("userId");

  try {
    const [role] = await db.insert(systemRole).values({
      ...body,
      createdBy: userId,
    }).returning();

    return c.json(role, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return c.json(
        getDuplicateKeyError("code", "角色代码已存在"),
        HttpStatusCodes.CONFLICT,
      );
    }
    throw error;
  }
};

export const get: SystemRolesRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const [role] = await db
    .select()
    .from(systemRole)
    .where(eq(systemRole.id, id));

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(role, HttpStatusCodes.OK);
};

export const update: SystemRolesRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const userId = c.get("userId");

  const [updated] = await db
    .update(systemRole)
    .set({
      ...body,
      updatedBy: userId,
    })
    .where(eq(systemRole.id, id))
    .returning();

  if (!updated) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(updated, HttpStatusCodes.OK);
};

export const remove: SystemRolesRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(systemRole)
    .where(eq(systemRole.id, id))
    .returning({ id: systemRole.id });

  if (!deleted) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const assignPermissions: SystemRolesRouteHandlerType<"assignPermissions"> = async (c) => {
  const { id } = c.req.valid("param");
  const { permissions } = c.req.valid("json");
  const domain = c.get("userDomain");

  // 检查角色是否存在
  const [role] = await db
    .select({ id: systemRole.id })
    .from(systemRole)
    .where(eq(systemRole.id, id));

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const result = await assignPermissionsToRole(id, permissions, domain);
  return c.json(result, HttpStatusCodes.OK);
};

export const assignMenus: SystemRolesRouteHandlerType<"assignMenus"> = async (c) => {
  const { id } = c.req.valid("param");
  const { menuIds } = c.req.valid("json");
  const domain = c.get("userDomain");

  // 检查角色是否存在
  const [role] = await db
    .select({ id: systemRole.id })
    .from(systemRole)
    .where(eq(systemRole.id, id));

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const result = await assignMenusToRole(id, menuIds, domain);
  return c.json(result, HttpStatusCodes.OK);
};

export const assignUsers: SystemRolesRouteHandlerType<"assignUsers"> = async (c) => {
  const { id } = c.req.valid("param");
  const { userIds } = c.req.valid("json");
  const domain = c.get("userDomain");

  // 检查角色是否存在
  const [role] = await db
    .select({ id: systemRole.id })
    .from(systemRole)
    .where(eq(systemRole.id, id));

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const result = await assignUsersToRole(id, userIds, domain);
  return c.json(result, HttpStatusCodes.OK);
};
