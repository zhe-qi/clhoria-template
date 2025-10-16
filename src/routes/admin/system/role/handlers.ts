import { eq } from "drizzle-orm";
import { z } from "zod";

import db from "@/db";
import { adminSystemRole } from "@/db/schema";
import { enforcerPromise } from "@/lib/casbin";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { Resp } from "@/utils";

import type { SystemRoleRouteHandlerType } from ".";
import type { selectAdminSystemRole } from "./schema";

export const list: SystemRoleRouteHandlerType<"list"> = async (c) => {
  // 获取查询参数
  const rawParams = c.req.query();

  const parseResult = RefineQueryParamsSchema.safeParse(rawParams);
  if (!parseResult.success) {
    return c.json(Resp.fail(z.prettifyError(parseResult.error)), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  // 执行查询
  const [error, result] = await executeRefineQuery<z.infer<typeof selectAdminSystemRole>>({
    table: adminSystemRole,
    queryParams: parseResult.data,
  });

  if (error) {
    return c.json(Resp.fail(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 设置 x-total-count 标头
  c.header("x-total-count", result.total.toString());

  return c.json(Resp.ok(result.data), HttpStatusCodes.OK);
};

export const create: SystemRoleRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  try {
    const [role] = await db.insert(adminSystemRole).values({
      ...body,
      createdBy: sub,
    }).returning();

    return c.json(Resp.ok(role), HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return c.json(Resp.fail("角色代码已存在"), HttpStatusCodes.CONFLICT);
    }
    throw error;
  }
};

export const get: SystemRoleRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const [role] = await db
    .select()
    .from(adminSystemRole)
    .where(eq(adminSystemRole.id, id));

  if (!role) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(role), HttpStatusCodes.OK);
};

export const update: SystemRoleRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const [updated] = await db
    .update(adminSystemRole)
    .set({
      ...body,
      updatedBy: sub,
    })
    .where(eq(adminSystemRole.id, id))
    .returning();

  if (!updated) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(updated), HttpStatusCodes.OK);
};

export const remove: SystemRoleRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [deleted] = await db
    .delete(adminSystemRole)
    .where(eq(adminSystemRole.id, id))
    .returning({ id: adminSystemRole.id });

  if (!deleted) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(deleted), HttpStatusCodes.OK);
};

export const getPermissions: SystemRoleRouteHandlerType<"getPermissions"> = async (c) => {
  const { id } = c.req.valid("param");

  try {
    const enforcer = await enforcerPromise;
    const permissions = await enforcer.getPermissionsForUser(id.toString());

    return c.json(Resp.ok(permissions), HttpStatusCodes.OK);
  }
  catch {
    return c.json(Resp.fail("获取角色权限失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const savePermissions: SystemRoleRouteHandlerType<"savePermissions"> = async (c) => {
  const { id } = c.req.valid("param");
  const { permissions } = c.req.valid("json");

  try {
    // 检查角色是否存在
    const [role] = await db.select({ id: adminSystemRole.id }).from(adminSystemRole).where(eq(adminSystemRole.id, id)).limit(1);

    if (!role) {
      return c.json(Resp.fail("角色不存在"), HttpStatusCodes.NOT_FOUND);
    }

    const enforcer = await enforcerPromise;

    // 获取角色当前的所有权限
    const currentPermissions = await enforcer.getPermissionsForUser(id.toString());

    // 构建旧权限和新权限的数组格式
    // removePolicies 需要完整的权限数组格式（包括所有字段）
    const oldPolicies = currentPermissions;
    // addPolicies 只需要前3个字段：subject, object, action
    const newPolicies = permissions.map(([resource, action]) => [id.toString(), resource, action]);

    let removedCount = 0;
    let addedCount = 0;

    // 1. 删除所有现有权限（只有当存在权限时才删除）
    if (oldPolicies.length > 0) {
      const removeSuccess = await enforcer.removePolicies(oldPolicies);
      if (!removeSuccess) {
        return c.json(Resp.fail("删除旧权限失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
      }
      removedCount = oldPolicies.length;
    }

    // 2. 添加新权限（只有当有新权限时才添加）
    if (newPolicies.length > 0) {
      const addSuccess = await enforcer.addPolicies(newPolicies);
      if (!addSuccess) {
        // 添加失败，尝试回滚：重新添加旧权限
        if (oldPolicies.length > 0) {
          await enforcer.addPolicies(oldPolicies);
        }
        return c.json(Resp.fail("添加新权限失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
      }
      addedCount = newPolicies.length;
    }

    return c.json(Resp.ok({ added: addedCount, removed: removedCount, total: permissions.length }), HttpStatusCodes.OK);
  }
  catch {
    return c.json(Resp.fail("保存权限失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};
