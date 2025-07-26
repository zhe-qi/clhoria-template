import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { PermissionActionType, PermissionResourceType } from "@/lib/enums";

import db from "@/db";
import {
  assignPermissionsToRole as assignPermissionsToRoleLib,
  assignUsersToRole as assignUsersToRoleLib,
} from "@/lib/permissions";
import * as rbac from "@/lib/permissions/casbin/rbac";
import * as menuService from "@/services/menu";

import type { AuthorizationRouteHandlerType } from "./authorization.index";

// 分配权限给角色
export const assignPermissionsToRole: AuthorizationRouteHandlerType<"assignPermissionsToRole"> = async (c) => {
  const { roleId } = c.req.valid("param");
  const { permissions, domain } = c.req.valid("json");
  const userDomain = c.get("userDomain");
  const currentDomain = domain || userDomain;

  // 检查角色是否存在
  const role = await db.query.sysRole.findFirst({
    where: (table, { eq }) => eq(table.id, roleId),
  });

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 将权限字符串转换为对象格式
  const permissionObjects = permissions.map((perm: string) => {
    const [resource, action] = perm.split(":");
    return {
      resource: resource as PermissionResourceType,
      action: action as PermissionActionType,
    };
  });

  const result = await assignPermissionsToRoleLib(roleId, permissionObjects, currentDomain);

  return c.json(result, HttpStatusCodes.OK);
};

// 分配路由给角色
export const assignRoutesToRole: AuthorizationRouteHandlerType<"assignRoutesToRole"> = async (c) => {
  const { roleId } = c.req.valid("param");
  const { menuIds, domain } = c.req.valid("json");
  const userDomain = c.get("userDomain");
  const currentDomain = domain || userDomain;

  // 检查角色是否存在
  const role = await db.query.sysRole.findFirst({
    where: (table, { eq }) => eq(table.id, roleId),
  });

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const result = await menuService.assignMenusToRole(roleId, menuIds, currentDomain);

  return c.json({ success: result.success, added: result.count, removed: 0 }, HttpStatusCodes.OK); // TODO: 计算实际删除的数量
};

// 分配用户给角色
export const assignUsersToRole: AuthorizationRouteHandlerType<"assignUsersToRole"> = async (c) => {
  const { roleId } = c.req.valid("param");
  const { userIds } = c.req.valid("json");
  const domain = c.get("userDomain");

  // 检查角色是否存在
  const role = await db.query.sysRole.findFirst({
    where: (table, { eq }) => eq(table.id, roleId),
  });

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  const result = await assignUsersToRoleLib(roleId, userIds, domain);

  return c.json(result, HttpStatusCodes.OK);
};

// 获取用户路由
export const getUserRoutes: AuthorizationRouteHandlerType<"getUserRoutes"> = async (c) => {
  const { userId } = c.req.valid("param");
  const { domain: queryDomain } = c.req.valid("query");
  const userDomain = c.get("userDomain");
  const domain = queryDomain || userDomain;

  // 检查用户是否存在
  const user = await db.query.sysUser.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  });

  if (!user) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 获取用户路由
  const userRoutes = await menuService.getUserRoutes(userId, domain);

  return c.json(userRoutes, HttpStatusCodes.OK);
};

// 获取角色权限
export const getRolePermissions: AuthorizationRouteHandlerType<"getRolePermissions"> = async (c) => {
  const { roleId } = c.req.valid("param");
  const { domain: queryDomain } = c.req.valid("query");
  const userDomain = c.get("userDomain");
  const domain = queryDomain || userDomain;

  // 检查角色是否存在
  const role = await db.query.sysRole.findFirst({
    where: (table, { eq }) => eq(table.id, roleId),
  });

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 获取角色权限
  const permissions = await rbac.getPermissionsForUserInDomain(roleId, domain);
  const permissionStrings = permissions.map(p => `${p[1]}:${p[2]}`);

  return c.json({ domain: domain as string, permissions: permissionStrings }, HttpStatusCodes.OK);
};

// 获取角色菜单
export const getRoleMenus: AuthorizationRouteHandlerType<"getRoleMenus"> = async (c) => {
  const { roleId } = c.req.valid("param");
  const { domain: queryDomain } = c.req.valid("query");
  const userDomain = c.get("userDomain");
  const domain = queryDomain || userDomain;

  // 检查角色是否存在
  const role = await db.query.sysRole.findFirst({
    where: (table, { eq }) => eq(table.id, roleId),
  });

  if (!role) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  // 获取角色菜单
  const menuIds = await menuService.getRoleMenuIds(roleId, domain);

  return c.json({ domain: domain as string, menuIds }, HttpStatusCodes.OK);
};
