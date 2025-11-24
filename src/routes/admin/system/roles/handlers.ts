import type { z } from "zod";

import { eq } from "drizzle-orm";

import db from "@/db";
import { systemRoles } from "@/db/schema";
import { enforcerPromise } from "@/lib/casbin";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { Resp } from "@/utils";

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
  catch (error: any) {
    if (error.message?.includes("duplicate key")) {
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

  try {
    const enforcer = await enforcerPromise;

    // 获取直接权限（只属于该角色的）
    const directPermissions = await enforcer.getPermissionsForUser(id.toString());

    // 获取所有隐式权限（包括继承的）
    const allImplicitPermissions = await enforcer.getImplicitPermissionsForUser(id.toString());

    // 标记直接权限
    const directPerms = directPermissions.map(p => ({
      resource: p[1],
      action: p[2],
      inherited: false,
    }));

    // 过滤出继承的权限（在 allImplicitPermissions 中但不在 directPermissions 中）
    const directPermSet = new Set(directPermissions.map(p => `${p[1]}|${p[2]}`));
    const inheritedPerms = allImplicitPermissions
      .filter(p => !directPermSet.has(`${p[1]}|${p[2]}`))
      .map(p => ({
        resource: p[1],
        action: p[2],
        inherited: true,
      }));

    // 合并所有权限
    const allPerms = [...directPerms, ...inheritedPerms];

    return c.json(Resp.ok(allPerms), HttpStatusCodes.OK);
  }
  catch {
    return c.json(Resp.fail("获取角色权限失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const savePermissions: SystemRolesRouteHandlerType<"savePermissions"> = async (c) => {
  const { id } = c.req.valid("param");
  const { permissions } = c.req.valid("json");

  try {
    // 检查角色是否存在
    const [role] = await db.select({ id: systemRoles.id }).from(systemRoles).where(eq(systemRoles.id, id)).limit(1);

    if (!role) {
      return c.json(Resp.fail("角色不存在"), HttpStatusCodes.NOT_FOUND);
    }

    const enforcer = await enforcerPromise;

    // 获取角色的直接权限（不包括继承的）
    const directPermissions = await enforcer.getPermissionsForUser(id.toString());

    // 获取所有隐式权限（包括继承的）
    const allImplicitPermissions = await enforcer.getImplicitPermissionsForUser(id.toString());

    // 计算继承的权限：在 allImplicitPermissions 中但不在 directPermissions 中
    const directPermissionSet = new Set(directPermissions.map(p => JSON.stringify(p)));
    const inheritedPermissions = allImplicitPermissions.filter(p => !directPermissionSet.has(JSON.stringify(p)));

    // 将提交的权限转换为 Set，用于快速查找（格式：resource|action）
    const submittedPermissionSet = new Set(
      permissions.map(([resource, action]) => `${resource}|${action}`),
    );

    // 检查是否有继承的权限被取消了
    // 继承的权限格式：[parentRoleId, resource, action, "allow"]
    // 我们只需要检查 resource 和 action 是否在提交的权限中
    const missingInheritedPermissions = inheritedPermissions.filter(
      p => !submittedPermissionSet.has(`${p[1]}|${p[2]}`),
    );

    if (missingInheritedPermissions.length > 0) {
      const missingInfo = missingInheritedPermissions
        .map(p => `${p[1]} - ${p[2]} (来自角色: ${p[0]})`)
        .join(", ");
      return c.json(
        Resp.fail(`不能取消继承的权限: ${missingInfo}`),
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    // 将继承的权限转换为 Set（格式：resource|action）
    const inheritedPermissionSet = new Set(
      inheritedPermissions.map(p => `${p[1]}|${p[2]}`),
    );

    // 过滤出真正的直接权限：排除继承的权限
    const newDirectPermissions = permissions.filter(
      ([resource, action]) => !inheritedPermissionSet.has(`${resource}|${action}`),
    );

    // 构建旧权限和新权限的数组格式
    const oldPolicies = directPermissions;
    const newPolicies = newDirectPermissions.map(([resource, action]) => [id.toString(), resource, action, "allow"]);

    let removedCount = 0;
    let addedCount = 0;

    // 1. 删除所有现有直接权限（只有当存在权限时才删除）
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

    return c.json(Resp.ok({ added: addedCount, removed: removedCount, total: newDirectPermissions.length }), HttpStatusCodes.OK);
  }
  catch {
    return c.json(Resp.fail("保存权限失败"), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};
