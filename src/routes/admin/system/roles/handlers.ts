import type { z } from "zod";

import { eq } from "drizzle-orm";

import db from "@/db";
import { systemRoles } from "@/db/schema";
import { enforcerPromise } from "@/lib/internal/casbin";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { Resp } from "@/utils";
import { mapDbError } from "@/utils/db-errors";

import type { SystemRolesRouteHandlerType } from ".";
import type { selectSystemRoles } from "./schema";

import { checkCircularInheritance, cleanRoleInheritance, enrichRolesWithParents, enrichRoleWithParents, setRoleParents } from "./helpers";

export const list: SystemRolesRouteHandlerType<"list"> = async (c) => {
  // 获取查询参数
  const rawParams = c.req.query();

  const parseResult = RefineQueryParamsSchema.safeParse(rawParams);
  if (!parseResult.success) {
    return c.json(Resp.fail(parseResult.error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  // 执行查询
  const [error, result] = await executeRefineQuery<z.infer<typeof selectSystemRoles>>({
    table: systemRoles,
    queryParams: parseResult.data,
  });

  if (error) {
    return c.json(Resp.fail(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  // 批量添加上级角色信息
  const rolesWithParents = await enrichRolesWithParents(result.data);

  // 设置 x-total-count 标头
  c.header("x-total-count", result.total.toString());

  return c.json(Resp.ok(rolesWithParents), HttpStatusCodes.OK);
};

export const create: SystemRolesRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  // 提取 parentRoleIds（如果有）
  const { parentRoleIds, ...roleData } = body;

  // 如果有上级角色，先检查是否会产生循环继承
  if (parentRoleIds && parentRoleIds.length > 0) {
    // 新创建的角色不会有循环继承问题，但要检查父角色是否存在
    const parentRoles = await db
      .select({ id: systemRoles.id })
      .from(systemRoles);

    const existingIds = new Set(parentRoles.map(r => r.id));
    const invalidIds = parentRoleIds.filter(pid => !existingIds.has(pid));

    if (invalidIds.length > 0) {
      return c.json(Resp.fail(`上级角色不存在: ${invalidIds.join(", ")}`), HttpStatusCodes.BAD_REQUEST);
    }
  }

  try {
    const [role] = await db.insert(systemRoles).values({
      ...roleData,
      createdBy: sub,
    }).returning();

    // 如果有上级角色，设置继承关系
    if (parentRoleIds && parentRoleIds.length > 0) {
      await setRoleParents(role.id, parentRoleIds);
    }

    // 返回包含上级角色信息的完整对象
    const roleWithParents = await enrichRoleWithParents(role);

    return c.json(Resp.ok(roleWithParents), HttpStatusCodes.CREATED);
  }
  catch (error) {
    const pgError = mapDbError(error);

    if (pgError?.type === "UniqueViolation") {
      return c.json(Resp.fail("角色代码已存在"), HttpStatusCodes.CONFLICT);
    }

    throw error;
  }
};

export const get: SystemRolesRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const [role] = await db
    .select()
    .from(systemRoles)
    .where(eq(systemRoles.id, id));

  if (!role) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  // 添加上级角色信息
  const roleWithParents = await enrichRoleWithParents(role);

  return c.json(Resp.ok(roleWithParents), HttpStatusCodes.OK);
};

export const update: SystemRolesRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  // 提取 parentRoleIds（如果有）
  const { parentRoleIds, ...roleData } = body;

  // 如果有上级角色，检查是否会产生循环继承
  if (parentRoleIds !== undefined) {
    if (parentRoleIds.length > 0) {
      // 检查是否会产生循环继承
      const hasCircular = await checkCircularInheritance(id, parentRoleIds);
      if (hasCircular) {
        return c.json(Resp.fail("设置的上级角色会产生循环继承"), HttpStatusCodes.BAD_REQUEST);
      }

      // 检查父角色是否存在
      const parentRoles = await db
        .select({ id: systemRoles.id })
        .from(systemRoles);

      const existingIds = new Set(parentRoles.map(r => r.id));
      const invalidIds = parentRoleIds.filter(pid => !existingIds.has(pid));

      if (invalidIds.length > 0) {
        return c.json(Resp.fail(`上级角色不存在: ${invalidIds.join(", ")}`), HttpStatusCodes.BAD_REQUEST);
      }
    }

    // 更新角色继承关系
    await setRoleParents(id, parentRoleIds);
  }

  // 如果有其他字段需要更新
  let updated;
  if (Object.keys(roleData).length > 0) {
    [updated] = await db
      .update(systemRoles)
      .set({
        ...roleData,
        updatedBy: sub,
      })
      .where(eq(systemRoles.id, id))
      .returning();
  }
  else {
    // 只更新了上级角色，获取角色数据
    [updated] = await db
      .select()
      .from(systemRoles)
      .where(eq(systemRoles.id, id));
  }

  if (!updated) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  // 返回包含上级角色信息的完整对象
  const roleWithParents = await enrichRoleWithParents(updated);

  return c.json(Resp.ok(roleWithParents), HttpStatusCodes.OK);
};

export const remove: SystemRolesRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  // 先清理角色的所有继承关系
  await cleanRoleInheritance(id);

  const [deleted] = await db
    .delete(systemRoles)
    .where(eq(systemRoles.id, id))
    .returning({ id: systemRoles.id });

  if (!deleted) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(deleted), HttpStatusCodes.OK);
};

export const getPermissions: SystemRolesRouteHandlerType<"getPermissions"> = async (c) => {
  const { id } = c.req.valid("param");

  const enforcer = await enforcerPromise;

  // 获取所有隐式权限（包括继承的）
  const allImplicitPermissions = await enforcer.getImplicitPermissionsForUser(id.toString());

  // 转换为简单的权限对象数组
  const permissions = allImplicitPermissions.map(p => ({
    resource: p[1],
    action: p[2],
  }));

  // 获取所有角色继承关系（g 策略）
  const allGroupings = await enforcer.getGroupingPolicy();
  const groupings = allGroupings.map(g => ({
    child: g[0],
    parent: g[1],
  }));

  return c.json(Resp.ok({ permissions, groupings }), HttpStatusCodes.OK);
};

export const savePermissions: SystemRolesRouteHandlerType<"savePermissions"> = async (c) => {
  const { id } = c.req.valid("param");
  const { permissions, parentRoleIds } = c.req.valid("json");

  // 检查角色是否存在
  const [role] = await db.select({ id: systemRoles.id }).from(systemRoles).where(eq(systemRoles.id, id)).limit(1);

  if (!role) {
    return c.json(Resp.fail("角色不存在"), HttpStatusCodes.NOT_FOUND);
  }

  const enforcer = await enforcerPromise;

  // 1. 处理角色继承关系（g 策略）
  if (parentRoleIds !== undefined) {
    // 检查循环继承
    const hasCircular = await checkCircularInheritance(id, parentRoleIds);
    if (hasCircular) {
      return c.json(Resp.fail("不能设置循环继承的角色关系"), HttpStatusCodes.BAD_REQUEST);
    }

    // 保存上级角色
    await setRoleParents(id, parentRoleIds);
  }

  // 2. 处理权限（p 策略）
  // 获取角色的直接权限（不包括继承的）
  const directPermissions = await enforcer.getPermissionsForUser(id.toString());

  // 获取所有隐式权限（包括继承的）
  const allImplicitPermissions = await enforcer.getImplicitPermissionsForUser(id.toString());
  const directPermSet = new Set(
    directPermissions.map(p => `${p[1]}:${p[2]}`),
  );
  const inheritedPermSet = new Set(
    allImplicitPermissions
      .filter(p => !directPermSet.has(`${p[1]}:${p[2]}`))
      .map(p => `${p[1]}:${p[2]}`),
  );

  // 检查是否尝试添加已经继承的权限
  const duplicateInheritedPerms: string[] = [];
  for (const [resource, action] of permissions) {
    const key = `${resource}:${action}`;
    if (inheritedPermSet.has(key)) {
      duplicateInheritedPerms.push(key);
    }
  }

  if (duplicateInheritedPerms.length > 0) {
    return c.json(
      Resp.fail(`不能重复添加已继承的权限: ${duplicateInheritedPerms.join(", ")}`),
      HttpStatusCodes.BAD_REQUEST,
    );
  }

  // 构建新权限的数组格式（所有权限都是直接权限）
  const oldPolicies = directPermissions;
  const newPolicies = permissions.map(([resource, action]) => [id.toString(), resource, action, "allow"]);

  let removedCount = 0;
  let addedCount = 0;

  // 删除所有现有直接权限
  if (oldPolicies.length > 0) {
    const removeSuccess = await enforcer.removePolicies(oldPolicies);
    if (!removeSuccess) {
      return c.json(Resp.fail("删除旧权限失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }
    removedCount = oldPolicies.length;
  }

  // 添加新权限
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

  return c.json(Resp.ok({ added: addedCount, removed: removedCount, total: newPolicies.length }), HttpStatusCodes.OK);
};
