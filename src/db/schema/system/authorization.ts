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

// 菜单路由Schema
const menuRouteMetaSchema = z.object({
  title: z.string().describe("菜单标题"),
  icon: z.string().optional().describe("图标"),
  order: z.number().describe("排序"),
  hideInMenu: z.boolean().optional().describe("是否在菜单中隐藏"),
  keepAlive: z.boolean().optional().describe("是否缓存"),
  activeMenu: z.string().optional().describe("激活菜单"),
  constant: z.boolean().optional().describe("是否常量路由"),
}).describe("路由元信息");

interface MenuRouteType {
  name: string;
  path: string;
  component?: string;
  meta: z.infer<typeof menuRouteMetaSchema>;
  children?: MenuRouteType[];
}

export const menuRouteSchema: z.ZodType<MenuRouteType> = z.lazy(() => z.object({
  name: z.string().describe("路由名称"),
  path: z.string().describe("路由路径"),
  component: z.string().optional().describe("组件路径"),
  meta: menuRouteMetaSchema,
  children: z.array(menuRouteSchema).optional().describe("子路由"),
})).openapi({
  type: "object",
  properties: {
    name: { type: "string", description: "路由名称" },
    path: { type: "string", description: "路由路径" },
    component: { type: "string", description: "组件路径" },
    meta: {
      type: "object",
      properties: {
        title: { type: "string", description: "菜单标题" },
        icon: { type: "string", description: "图标" },
        order: { type: "number", description: "排序" },
        hideInMenu: { type: "boolean", description: "是否在菜单中隐藏" },
        keepAlive: { type: "boolean", description: "是否缓存" },
        activeMenu: { type: "string", description: "激活菜单" },
        constant: { type: "boolean", description: "是否常量路由" },
      },
      required: ["title", "order"],
    },
    children: {
      type: "array",
      items: { $ref: "#/components/schemas/MenuRoute" },
      description: "子路由",
    },
  },
  required: ["name", "path", "meta"],
  description: "菜单路由配置",
});

// 用户路由响应Schema - 包含首页和路由列表
export const userRoutesResponseSchema = z.object({
  home: z.string().describe("首页路由"),
  routes: z.array(menuRouteSchema).describe("路由列表"),
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
  menuIds: z.array(z.number()).describe("菜单ID列表"),
});
