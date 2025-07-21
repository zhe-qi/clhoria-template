import type { JWTPayload } from "hono/utils/jwt/types";

import { count, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { sysRole } from "@/db/schema";
import { getDuplicateKeyError } from "@/lib/constants";
import { withPaginationAndCount } from "@/lib/pagination";
import { assignMenusToRole, assignPermissionsToRole, assignUsersToRole } from "@/lib/permissions";

import type { SysRolesRouteHandlerType } from "./sys-roles.index";

export const list: SysRolesRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");

  let whereCondition;

  // 搜索条件
  if (params.search) {
    whereCondition = or(
      ilike(sysRole.code, `%${params.search}%`),
      ilike(sysRole.name, `%${params.search}%`),
    );
  }

  const query = db
    .select()
    .from(sysRole)
    .$dynamic();

  if (whereCondition) {
    query.where(whereCondition);
  }

  const countQuery = db
    .select({ count: count() })
    .from(sysRole);

  if (whereCondition) {
    countQuery.where(whereCondition);
  }

  const result = await withPaginationAndCount(
    query,
    countQuery,
    { page: params.page, limit: params.limit },
  );

  return c.json(result, HttpStatusCodes.OK);
};

export const create: SysRolesRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const payload: JWTPayload = c.get("jwtPayload");
  const operatorId = payload.sub as string;

  try {
    const [role] = await db.insert(sysRole).values({
      ...body,
      createdBy: operatorId,
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

export const get: SysRolesRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const [role] = await db
    .select()
    .from(sysRole)
    .where(eq(sysRole.id, id));

  if (!role) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(role, HttpStatusCodes.OK);
};

export const update: SysRolesRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const payload: JWTPayload = c.get("jwtPayload");
  const operatorId = payload.sub as string;

  const [updated] = await db
    .update(sysRole)
    .set({
      ...body,
      updatedBy: operatorId,
    })
    .where(eq(sysRole.id, id))
    .returning();

  if (!updated) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(updated, HttpStatusCodes.OK);
};

export const remove: SysRolesRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(sysRole)
    .where(eq(sysRole.id, id))
    .returning({ id: sysRole.id });

  if (!deleted) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const assignPermissions: SysRolesRouteHandlerType<"assignPermissions"> = async (c) => {
  const { id } = c.req.valid("param");
  const { permissions } = c.req.valid("json");
  const payload: JWTPayload = c.get("jwtPayload");
  const domain = (payload.domain as string) || "default";

  // 检查角色是否存在
  const [role] = await db
    .select({ id: sysRole.id })
    .from(sysRole)
    .where(eq(sysRole.id, id));

  if (!role) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  const result = await assignPermissionsToRole(id, permissions, domain);
  return c.json(result, HttpStatusCodes.OK);
};

export const assignMenus: SysRolesRouteHandlerType<"assignMenus"> = async (c) => {
  const { id } = c.req.valid("param");
  const { menuIds } = c.req.valid("json");
  const payload: JWTPayload = c.get("jwtPayload");
  const domain = (payload.domain as string) || "default";

  // 检查角色是否存在
  const [role] = await db
    .select({ id: sysRole.id })
    .from(sysRole)
    .where(eq(sysRole.id, id));

  if (!role) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  const result = await assignMenusToRole(id, menuIds, domain);
  return c.json(result, HttpStatusCodes.OK);
};

export const assignUsers: SysRolesRouteHandlerType<"assignUsers"> = async (c) => {
  const { id } = c.req.valid("param");
  const { userIds } = c.req.valid("json");
  const payload: JWTPayload = c.get("jwtPayload");
  const domain = (payload.domain as string) || "default";

  // 检查角色是否存在
  const [role] = await db
    .select({ id: sysRole.id })
    .from(sysRole)
    .where(eq(sysRole.id, id));

  if (!role) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  const result = await assignUsersToRole(id, userIds, domain);
  return c.json(result, HttpStatusCodes.OK);
};
