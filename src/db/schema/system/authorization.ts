import { z } from "zod";

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
  menuIds: z.array(z.number()).describe("菜单ID列表"),
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

// 用户路由响应Schema
export const userRouteSchema = z.object({
  id: z.number().describe("菜单ID"),
  menuName: z.string().describe("菜单名称"),
  routeName: z.string().describe("路由名称"),
  routePath: z.string().describe("路由路径"),
  component: z.string().describe("组件路径"),
  icon: z.string().optional().describe("图标"),
  menuType: z.enum(["directory", "menu"]).describe("菜单类型"),
  pid: z.number().describe("父级菜单ID"),
  order: z.number().describe("排序"),
  hideInMenu: z.boolean().describe("是否在菜单中隐藏"),
  keepAlive: z.boolean().describe("是否缓存"),
  children: z.array(z.any()).optional().describe("子菜单"),
});

export const userRoutesResponseSchema = z.array(userRouteSchema);

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
  menuIds: z.array(z.number()).describe("菜单ID列表"),
});
