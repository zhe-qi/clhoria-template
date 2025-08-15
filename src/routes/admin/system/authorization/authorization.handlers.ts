import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { systemUser } from "@/db/schema";
import {
  assignPermissionsToRole as assignPermissionsToRoleLib,
  assignUsersToRole as assignUsersToRoleLib,
} from "@/lib/permissions";
import * as rbac from "@/lib/permissions/casbin/rbac";
import * as menuService from "@/services/system/menu";
import { assignRolesToUser as assignRolesToUserService, clearUserPermissionCache } from "@/services/system/user";
import { pickContext } from "@/utils";
import { parsePermissions } from "@/utils/tools/permission";

import type { SystemAuthorizationRouteHandlerType } from "./authorization.index";

// 分配权限给角色
export const assignPermissionsToRole: SystemAuthorizationRouteHandlerType<"assignPermissionsToRole"> = async (c) => {
  const { roleId } = c.req.valid("param");
  const { permissions, domain } = c.req.valid("json");
  const userDomain = c.get("userDomain");
  const currentDomain = domain || userDomain;

  // 检查角色是否存在
  const role = await db.query.systemRole.findFirst({
    where: (table, { eq }) => eq(table.id, roleId),
  });

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 将权限字符串转换为对象格式
  const permissionObjects = parsePermissions(permissions);

  const result = await assignPermissionsToRoleLib(roleId, permissionObjects, currentDomain);

  return c.json(result, HttpStatusCodes.OK);
};

// 分配路由给角色
export const assignRoutesToRole: SystemAuthorizationRouteHandlerType<"assignRoutesToRole"> = async (c) => {
  const { roleId } = c.req.valid("param");
  const { menuIds, domain } = c.req.valid("json");
  const userDomain = c.get("userDomain");
  const currentDomain = domain || userDomain;

  // 检查角色是否存在
  const role = await db.query.systemRole.findFirst({
    where: (table, { eq }) => eq(table.id, roleId),
  });

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const result = await menuService.assignMenusToRole(roleId, menuIds, currentDomain);

  return c.json({ success: result.success, added: result.added, removed: result.removed }, HttpStatusCodes.OK);
};

// 分配用户给角色
export const assignUsersToRole: SystemAuthorizationRouteHandlerType<"assignUsersToRole"> = async (c) => {
  const { roleId } = c.req.valid("param");
  const { userIds } = c.req.valid("json");
  const domain = c.get("userDomain");

  // 检查角色是否存在
  const role = await db.query.systemRole.findFirst({
    where: (table, { eq }) => eq(table.id, roleId),
  });

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const result = await assignUsersToRoleLib(roleId, userIds, domain);

  return c.json(result, HttpStatusCodes.OK);
};

// 获取用户路由
export const getUserRoutes: SystemAuthorizationRouteHandlerType<"getUserRoutes"> = async (c) => {
  const { id } = c.req.valid("param");
  const { domain: queryDomain } = c.req.valid("query");
  const userDomain = c.get("userDomain");
  const domain = queryDomain || userDomain;

  // 检查用户是否存在
  const user = await db.query.systemUser.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });

  if (!user) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 获取用户路由
  const userRoutes = await menuService.getUserRoutesSimple(id, domain);

  return c.json(userRoutes, HttpStatusCodes.OK);
};

/** 获取用户的角色列表 */
export const getUserRoles: SystemAuthorizationRouteHandlerType<"getUserRoles"> = async (c) => {
  const { userId } = c.req.valid("param");
  const { domain: queryDomain } = c.req.valid("query");
  const userDomain = c.get("userDomain");
  const domain = queryDomain || userDomain;

  // 检查用户是否存在
  const user = await db.query.systemUser.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  });

  if (!user) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 获取用户角色
  const userRoles = await db.query.systemUserRole.findMany({
    where: (table, { eq, and }) => and(
      eq(table.userId, userId),
      eq(table.domain, domain),
    ),
    with: {
      role: {
        columns: {
          id: true,
          code: true,
          name: true,
          description: true,
          status: true,
        },
      },
    },
  });

  // 过滤掉空的角色数据，确保返回的都是有效角色
  const roles = userRoles
    .map(ur => ur.role)
    .filter(role => role !== null);

  return c.json(roles, HttpStatusCodes.OK);
}; ;

// 获取角色权限
export const getRolePermissions: SystemAuthorizationRouteHandlerType<"getRolePermissions"> = async (c) => {
  const { roleId } = c.req.valid("param");
  const { domain: queryDomain } = c.req.valid("query");
  const userDomain = c.get("userDomain");
  const domain = queryDomain || userDomain;

  // 检查角色是否存在
  const role = await db.query.systemRole.findFirst({
    where: (table, { eq }) => eq(table.id, roleId),
  });

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 获取角色权限
  const permissions = await rbac.getPermissionsForUserInDomain(roleId, domain);
  const permissionStrings = permissions.map(p => `${p[1]}:${p[2]}`);

  return c.json({ domain, permissions: permissionStrings }, HttpStatusCodes.OK);
};

// 获取角色菜单
export const getRoleMenus: SystemAuthorizationRouteHandlerType<"getRoleMenus"> = async (c) => {
  const { roleId } = c.req.valid("param");
  const { domain: queryDomain } = c.req.valid("query");
  const userDomain = c.get("userDomain");
  const domain = queryDomain || userDomain;

  // 检查角色是否存在
  const role = await db.query.systemRole.findFirst({
    where: (table, { eq }) => eq(table.id, roleId),
  });

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 获取角色菜单
  const menuIds = await menuService.getRoleMenuIds(roleId, domain);

  return c.json({ domain, menuIds }, HttpStatusCodes.OK);
};

/** 为用户分配角色 */
export const assignRolesToUser: SystemAuthorizationRouteHandlerType<"assignRolesToUser"> = async (c) => {
  const { userId } = c.req.valid("param");
  const { roleIds } = c.req.valid("json");
  const [domain, currentUserId] = pickContext(c, ["userDomain", "userId"]);

  // 检查用户是否存在
  const [user] = await db
    .select({ id: systemUser.id })
    .from(systemUser)
    .where(and(
      eq(systemUser.id, userId),
      eq(systemUser.domain, domain),
    ));

  if (!user) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const result = await assignRolesToUserService(userId, roleIds, domain, currentUserId);

  // 清理用户相关缓存
  void await clearUserPermissionCache(userId, domain);

  return c.json(result, HttpStatusCodes.OK);
};
