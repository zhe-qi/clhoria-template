import { z } from "@hono/zod-openapi";

// 分配权限给角色的Schema
export const assignPermissionsToRoleSchema = z.object({
  roleId: z.string().meta({ description: "角色ID" }),
  domain: z.string().meta({ description: "域/租户" }),
  permissions: z.array(z.string()).meta({ description: "权限列表" }),
});

// 分配路由给角色的Schema
export const assignRoutesToRoleSchema = z.object({
  roleId: z.string().meta({ description: "角色ID" }),
  domain: z.string().meta({ description: "域/租户" }),
  menuIds: z.array(z.string()).meta({ description: "菜单ID列表" }),
});

// 分配用户给角色的Schema
export const assignUsersToRoleSchema = z.object({
  roleId: z.string().meta({ description: "角色ID" }),
  userIds: z.array(z.string()).meta({ description: "用户ID列表" }),
});

// 获取用户路由的Schema
export const getUserRoutesSchema = z.object({
  userId: z.string().meta({ description: "用户ID" }),
  domain: z.string().meta({ description: "域/租户" }),
});

// 通用响应Schema
export const assignmentResponseSchema = z.object({
  success: z.boolean().meta({ description: "是否成功" }),
  added: z.number().meta({ description: "新增数量" }),
  removed: z.number().meta({ description: "移除数量" }),
});

// 角色权限查询Schema
export const rolePermissionsSchema = z.object({
  roleId: z.string().meta({ description: "角色ID" }),
  domain: z.string().meta({ description: "域/租户" }),
  permissions: z.array(z.string()).meta({ description: "权限列表" }),
});

// 角色菜单查询Schema
export const roleMenusSchema = z.object({
  roleId: z.string().meta({ description: "角色ID" }),
  domain: z.string().meta({ description: "域/租户" }),
  menuIds: z.array(z.string()).meta({ description: "菜单ID列表" }),
});

// 路由Meta属性Schema
export const routeMetaSchema = z.object({
  title: z.string().meta({ description: "页面标题，显示在菜单和标签页中" }),
  order: z.number().meta({ description: "排序权重，用于菜单排序" }),
  icon: z.string().optional().meta({ description: "图标" }),
  activeIcon: z.string().optional().meta({ description: "激活状态图标" }),
  keepAlive: z.boolean().optional().meta({ description: "是否开启 KeepAlive 缓存" }),
  hideInMenu: z.boolean().optional().meta({ description: "是否在菜单中隐藏" }),
  hideInTab: z.boolean().optional().meta({ description: "是否在标签页中隐藏" }),
  hideInBreadcrumb: z.boolean().optional().meta({ description: "是否在面包屑中隐藏" }),
  hideChildrenInMenu: z.boolean().optional().meta({ description: "子菜单是否在菜单中隐藏" }),
  authority: z.array(z.string()).optional().meta({ description: "需要的权限角色数组" }),
  badge: z.string().optional().meta({ description: "徽章内容" }),
  badgeType: z.enum(["dot", "normal"]).optional().meta({ description: "徽章类型" }),
  badgeVariants: z.enum(["default", "destructive", "primary", "success", "warning"]).or(z.string()).optional().meta({ description: "徽章颜色变体" }),
  affixTab: z.boolean().optional().meta({ description: "是否固定标签页" }),
  affixTabOrder: z.number().optional().meta({ description: "固定标签页的排序" }),
  activePath: z.string().optional().meta({ description: "当前激活的菜单路径" }),
  link: z.string().optional().meta({ description: "外链地址" }),
  openInNewWindow: z.boolean().optional().meta({ description: "是否在新窗口打开" }),
  iframeSrc: z.string().optional().meta({ description: "iframe 嵌入地址" }),
  ignoreAccess: z.boolean().optional().meta({ description: "是否忽略权限，直接可访问" }),
  menuVisibleWithForbidden: z.boolean().optional().meta({ description: "菜单可见但访问会被重定向到403" }),
  maxNumOfOpenTab: z.number().optional().meta({ description: "标签页最大打开数量" }),
  query: z.record(z.string(), z.any()).optional().meta({ description: "菜单携带的查询参数" }),
  i18nKey: z.string().optional().meta({ description: "国际化键值" }),
  constant: z.boolean().optional().meta({ description: "是否常量菜单（不可删除）" }),
  multiTab: z.boolean().optional().meta({ description: "是否多标签模式" }),
});

// 菜单项Schema
export const menuItemSchema = z.object({
  name: z.string().meta({ description: "路由名称" }),
  path: z.string().meta({ description: "路由路径" }),
  redirect: z.string().optional().meta({ description: "重定向路径" }),
  component: z.string().optional().meta({ description: "组件路径" }),
  meta: routeMetaSchema,
  get children() {
    return z.array(menuItemSchema).optional().meta({
      describe: "子菜单",
      openapi: {
        description: "子菜单项列表",
        type: "array",
        items: {
          $ref: "#/components/schemas/menuItemSchema",
        },
      },
    });
  },
});

// 用户路由响应Schema - 避免循环引用，直接定义类型
export const userRoutesResponseSchema = z.object({
  home: z.string().meta({ description: "首页路由" }),
  routes: z.array(z.any()).meta({ description: "路由列表" }),
});
// 获取用户角色的Schema
export const getUserRolesSchema = z.object({
  userId: z.string().meta({ description: "用户ID" }),
  domain: z.string().optional().meta({ description: "域/租户" }),
});

// 用户角色响应Schema
export const userRolesResponseSchema = z.array(
  z.object({
    id: z.string().meta({ description: "角色ID" }),
    code: z.string().meta({ description: "角色代码" }),
    name: z.string().meta({ description: "角色名称" }),
    description: z.string().nullable().meta({ description: "角色描述" }),
    status: z.number().meta({ description: "状态: 1=启用 0=禁用" }),
  }),
);
