import type { z } from "zod";

import { eq } from "drizzle-orm";

import type { selectSystemRoleSchema } from "@/db/schema";

import db from "@/db";
import { systemRole } from "@/db/schema";
import { enforcerPromise } from "@/lib/casbin";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { parseTextToZodError } from "@/utils";

import type { SystemRolesRouteHandlerType } from "./roles.index";

export const list: SystemRolesRouteHandlerType<"list"> = async (c) => {
  // 获取查询参数
  const rawParams = c.req.query();

  const parseResult = RefineQueryParamsSchema.safeParse(rawParams);
  if (!parseResult.success) {
    return c.json(parseResult.error, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  // 执行查询
  const [error, result] = await executeRefineQuery<z.infer<typeof selectSystemRoleSchema>>({
    table: systemRole,
    queryParams: parseResult.data,
  });

  if (error) {
    return c.json(parseTextToZodError(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 设置 x-total-count 标头
  c.header("x-total-count", result.total.toString());

  return c.json({ data: result.data }, HttpStatusCodes.OK);
};

export const create: SystemRolesRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  try {
    const [role] = await db.insert(systemRole).values({
      ...body,
      createdBy: sub,
    }).returning();

    return c.json({ data: role }, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return c.json(parseTextToZodError("角色代码已存在"), HttpStatusCodes.CONFLICT);
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
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json({ data: role }, HttpStatusCodes.OK);
};

export const update: SystemRolesRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const [updated] = await db
    .update(systemRole)
    .set({
      ...body,
      updatedBy: sub,
    })
    .where(eq(systemRole.id, id))
    .returning();

  if (!updated) {
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json({ data: updated }, HttpStatusCodes.OK);
};

export const remove: SystemRolesRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(systemRole)
    .where(eq(systemRole.id, id))
    .returning({ id: systemRole.id });

  if (!deleted) {
    return c.json(parseTextToZodError(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json({ data: deleted }, HttpStatusCodes.OK);
};

export const getPermissions: SystemRolesRouteHandlerType<"getPermissions"> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const enforcer = await enforcerPromise;
    const permissions = await enforcer.getPermissionsForUser(id.toString());

    return c.json({ data: permissions }, HttpStatusCodes.OK);
  }
  catch {
    return c.json(parseTextToZodError("获取角色权限失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const addPermissions: SystemRolesRouteHandlerType<"addPermissions"> = async (c) => {
  const { id } = c.req.valid("param");
  const { permissions } = c.req.valid("json");

  try {
    // 检查角色是否存在
    const [role] = await db
      .select({ id: systemRole.id })
      .from(systemRole)
      .where(eq(systemRole.id, id))
      .limit(1);

    if (!role) {
      return c.json(parseTextToZodError("角色不存在"), HttpStatusCodes.NOT_FOUND);
    }

    const enforcer = await enforcerPromise;

    // 将权限格式转换为 casbin 策略格式: [subject, object, action]
    const policiesForAdd = permissions.map(([resource, action]) => [id, resource, action]);

    // 批量添加权限
    const success = await enforcer.addPolicies(policiesForAdd);

    if (success) {
      return c.json({ data: { count: permissions.length } }, HttpStatusCodes.CREATED);
    }
    else {
      return c.json(parseTextToZodError("部分或全部权限已存在"), HttpStatusCodes.CONFLICT);
    }
  }
  catch {
    return c.json(parseTextToZodError("添加权限失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const removePermissions: SystemRolesRouteHandlerType<"removePermissions"> = async (c) => {
  const { id } = c.req.valid("param");
  const { permissions } = c.req.valid("json");

  try {
    // 检查角色是否存在
    const [role] = await db
      .select({ id: systemRole.id })
      .from(systemRole)
      .where(eq(systemRole.id, id))
      .limit(1);

    if (!role) {
      return c.json(parseTextToZodError("角色不存在"), HttpStatusCodes.NOT_FOUND);
    }

    const enforcer = await enforcerPromise;

    // 将权限格式转换为 casbin 策略格式: [subject, object, action]
    const policiesForRemove = permissions.map(([resource, action]) => [id, resource, action]);

    // 批量删除权限
    const success = await enforcer.removePolicies(policiesForRemove);

    if (success) {
      return c.json({ data: { count: permissions.length } }, HttpStatusCodes.OK);
    }
    else {
      return c.json(parseTextToZodError("部分或全部权限不存在"), HttpStatusCodes.NOT_FOUND);
    }
  }
  catch {
    return c.json(parseTextToZodError("删除权限失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};
