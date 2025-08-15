import db from "@/db";
import * as rbac from "@/lib/permissions/casbin/rbac";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import * as menuService from "@/services/system/menu";

import type { SystemAuthorizationRouteHandlerType } from "./authorization.index";

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
