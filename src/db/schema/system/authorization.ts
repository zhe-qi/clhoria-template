import { z } from "@hono/zod-openapi";

// 分配权限给角色的Schema
export const assignPermissionsToRoleSchema = z.object({
  roleId: z.string().describe("角色ID"),
  domain: z.string().describe("域/租户"),
  permissions: z.array(z.string()).describe("权限列表"),
});

// 分配路由给角色的Schema
export const assignRoutesToRoleSchema = z.object({
  roleId: z.string().describe("角色ID"),
  domain: z.string().describe("域/租户"),
  menuIds: z.array(z.string()).describe("菜单ID列表"),
});

// 分配用户给角色的Schema
export const assignUsersToRoleSchema = z.object({
  roleId: z.string().describe("角色ID"),
  userIds: z.array(z.string()).describe("用户ID列表"),
});

// 获取用户路由的Schema
export const getUserRoutesSchema = z.object({
  userId: z.string().describe("用户ID"),
  domain: z.string().describe("域/租户"),
});

// 通用响应Schema
export const assignmentResponseSchema = z.object({
  success: z.boolean().describe("是否成功"),
  added: z.number().describe("新增数量"),
  removed: z.number().describe("移除数量"),
});

// 菜单路由Schema
export const menuRouteMetaSchema = z.object({
  title: z.string().describe("菜单标题"),
  icon: z.string().nullable().optional().describe("图标"),
  order: z.number().describe("排序"),
  hideInMenu: z.boolean().nullable().optional().describe("是否在菜单中隐藏"),
  keepAlive: z.boolean().nullable().optional().describe("是否缓存"),
  activeMenu: z.string().nullable().optional().describe("激活菜单"),
  constant: z.boolean().optional().describe("是否常量路由"),
}).describe("路由元信息");

export const menuRouteSchema = z.object({
  name: z.string().describe("路由名称"),
  path: z.string().describe("路由路径"),
  component: z.string().optional().describe("组件路径"),
  meta: menuRouteMetaSchema,
  get children() {
    return z.array(menuRouteSchema).optional().describe("子路由");
  },
});

// 用户路由响应Schema - 避免循环引用，直接定义类型
export const userRoutesResponseSchema = z.object({
  home: z.string().describe("首页路由"),
  routes: z.array(z.any()).describe("路由列表"),
});

// 角色权限查询Schema
export const rolePermissionsSchema = z.object({
  roleId: z.string().describe("角色ID"),
  domain: z.string().describe("域/租户"),
  permissions: z.array(z.string()).describe("权限列表"),
});

// 角色菜单查询Schema
export const roleMenusSchema = z.object({
  roleId: z.string().describe("角色ID"),
  domain: z.string().describe("域/租户"),
  menuIds: z.array(z.string()).describe("菜单ID列表"),
});
