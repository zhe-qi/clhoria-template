import type { z } from "@hono/zod-openapi";
import type { InferSelectModel } from "drizzle-orm";

import { and, eq, inArray } from "drizzle-orm";

import type { insertSystemMenuSchema, menuItemSchema, patchSystemMenuSchema, routeMetaSchema } from "@/db/schema";

import db from "@/db";
import { systemMenu, systemRoleMenu } from "@/db/schema";
import { getUserMenusKey, Status } from "@/lib/enums";
import paginatedQuery from "@/lib/pagination";
import * as rbac from "@/lib/permissions/casbin/rbac";
import { redisClient } from "@/lib/redis";

import { getUserRolesFromCache } from "./user";

// 菜单相关类型定义
type InsertSysMenuData = z.infer<typeof insertSystemMenuSchema>;
type UpdateSysMenuData = z.infer<typeof patchSystemMenuSchema>;
type SelectMenuData = InferSelectModel<typeof systemMenu>;

type MenuItem = z.infer<typeof menuItemSchema>;
type RouteMeta = z.infer<typeof routeMetaSchema>;

/**
 * 将数据库菜单数据转换为菜单项格式
 */
function transformToMenuItem(menu: SelectMenuData): MenuItem {
  const meta: RouteMeta = {
    title: menu.meta?.title || "", // 使用 meta.title，如果没有则为空字符串
    order: menu.meta?.order ?? 0,
    ...menu.meta, // 展开 jsonb 中的 meta 属性
  };

  return {
    name: menu.name,
    path: menu.path,
    component: menu.component || undefined,
    redirect: menu.redirect || undefined,
    meta,
  };
}

/**
 * 构建菜单树
 */
interface TreeNode<T> {
  children?: TreeNode<T>[];
}

function buildMenuTree<T extends { id: string; pid: string | null; meta?: { order?: number } | null }>(items: T[]): Array<T & TreeNode<T>> {
  // 预排序，避免后续递归排序
  const sortedItems = [...items].sort((a, b) => ((a.meta?.order ?? 0) - (b.meta?.order ?? 0)));

  const map = new Map<string, T & TreeNode<T>>();
  const roots: Array<T & TreeNode<T>> = [];

  // 第一次遍历：创建所有节点的映射
  for (const item of sortedItems) {
    const node = { ...item, children: [] } as T & TreeNode<T>;
    map.set(item.id, node);
  }

  // 第二次遍历：构建父子关系
  for (const item of sortedItems) {
    const node = map.get(item.id)!;

    if (item.pid === null) {
      roots.push(node);
    }
    else {
      const parent = map.get(item.pid);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
      else {
        // 父节点不存在时作为根节点
        roots.push(node);
      }
    }
  }

  return roots;
}

/**
 * 公共函数：根据角色获取菜单数据
 */
async function getMenusByRoles(roles: string[], domain: string, includeConstant: boolean = true): Promise<SelectMenuData[]> {
  if (roles.length === 0) {
    return [];
  }

  // 角色级缓存key
  const rolesCacheKey = `role_menus:${domain}:${roles.sort().join(",")}:${includeConstant ? "all" : "no-constant"}`;
  const cachedRoleMenus = await redisClient.get(rolesCacheKey);

  if (cachedRoleMenus) {
    return JSON.parse(cachedRoleMenus) as SelectMenuData[];
  }

  // 使用关联查询一次性获取角色菜单数据
  const roleMenus = await db.query.systemRoleMenu.findMany({
    where: and(
      inArray(systemRoleMenu.roleId, roles),
      eq(systemRoleMenu.domain, domain),
    ),
    with: {
      menu: true,
    },
  });

  // 提取去重的菜单数据并过滤状态
  const menusMap = new Map<string, SelectMenuData>();
  roleMenus.forEach((rm) => {
    if (rm.menu
      && rm.menu.status === Status.ENABLED
      && rm.menu.domain === domain
      && !menusMap.has(rm.menu.id)) {
      // 根据需要过滤常量菜单
      if (!includeConstant && rm.menu.meta?.constant === true) {
        return;
      }

      menusMap.set(rm.menu.id, rm.menu);
    }
  });

  const menus = Array.from(menusMap.values()).sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0));

  // 缓存角色菜单结果（较长缓存时间，因为角色菜单变化频率低）
  void await redisClient.setex(rolesCacheKey, 3600, JSON.stringify(menus)); // 1小时过期

  return menus;
}

/**
 * 获取用户菜单 - 返回树形结构
 */
export async function getUserMenus(userId: string, domain: string): Promise<MenuItem[]> {
  // 尝试从缓存获取菜单数据
  const cacheKey = `${getUserMenusKey(userId, domain)}:menu`;
  const cachedMenus = await redisClient.get(cacheKey);

  if (cachedMenus) {
    return JSON.parse(cachedMenus) as MenuItem[];
  }

  // 从缓存获取用户角色
  const roles = await getUserRolesFromCache(userId, domain);

  if (roles.length === 0) {
    const emptyResult: MenuItem[] = [];
    // 缓存空结果，避免重复查询
    void await redisClient.setex(cacheKey, 300, JSON.stringify(emptyResult)); // 5分钟过期
    return emptyResult;
  }

  // 使用公共函数获取菜单数据
  const menus = await getMenusByRoles(roles, domain, true);

  // 直接构建菜单树，避免多次转换
  const menuTreeData = buildMenuTree(menus);

  // 递归转换为MenuItem格式
  const transformTree = (nodes: Array<SelectMenuData & TreeNode<SelectMenuData>>): MenuItem[] => {
    return nodes.map(node => ({
      ...transformToMenuItem(node),
      children: node.children ? transformTree(node.children as Array<SelectMenuData & TreeNode<SelectMenuData>>) : undefined,
    }));
  };

  const menuTree = transformTree(menuTreeData);

  // 缓存结果
  void await redisClient.setex(cacheKey, 1800, JSON.stringify(menuTree)); // 30分钟过期

  return menuTree;
}

/**
 * 清除用户菜单缓存
 */
export async function clearUserMenuCache(userId: string, domain: string): Promise<void> {
  const keys = [
    getUserMenusKey(userId, domain),
    `${getUserMenusKey(userId, domain)}:menu`,
    `${getUserMenusKey(userId, domain)}:raw`,
  ];

  // 批量删除缓存键
  if (keys.length > 0) {
    void await redisClient.del(...keys);
  }
}

/**
 * 清除所有菜单缓存
 */
export async function clearAllMenuCache(domain: string): Promise<void> {
  const { CacheConstant } = await import("@/lib/enums");
  const patterns = [
    `${CacheConstant.USER_ROLES_PREFIX}${domain}:*`,
    `${CacheConstant.ROLE_PERMISSIONS_PREFIX}${domain}:*`,
    `${CacheConstant.USER_MENUS_PREFIX}${domain}:*`,
    `${CacheConstant.MENU_TREE_PREFIX}${domain}`,
  ];

  for (const pattern of patterns) {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      void await redisClient.del(...keys);
    }
  }
}

/**
 * 为角色分配菜单
 */
export async function assignMenusToRole(roleId: string, menuIds: string[], domain: string): Promise<{ success: boolean; added: number; removed: number }> {
  const result = await db.transaction(async (tx) => {
    // 删除现有的菜单分配并获取删除数量
    const deletedItems = await tx
      .delete(systemRoleMenu)
      .where(and(
        eq(systemRoleMenu.roleId, roleId),
        eq(systemRoleMenu.domain, domain),
      ))
      .returning({ id: systemRoleMenu.roleId });

    const removedCount = deletedItems.length;

    // 添加新的菜单分配
    if (menuIds.length > 0) {
      await tx.insert(systemRoleMenu).values(
        menuIds.map(menuId => ({
          roleId,
          menuId,
          domain,
        })),
      );
    }

    return { success: true, added: menuIds.length, removed: removedCount };
  });

  // 清除相关缓存
  void await clearAllMenuCache(domain);

  return result;
}

/**
 * 获取角色的菜单ID列表
 */
export async function getRoleMenuIds(roleId: string, domain: string): Promise<string[]> {
  const roleMenus = await db
    .select({ menuId: systemRoleMenu.menuId })
    .from(systemRoleMenu)
    .where(and(
      eq(systemRoleMenu.roleId, roleId),
      eq(systemRoleMenu.domain, domain),
    ));

  return roleMenus.map(rm => rm.menuId);
}

/**
 * 获取菜单分页列表
 */
export async function getMenuList(options: {
  params: {
    skip?: number;
    take?: number;
    where?: Record<string, any> | Record<string, never> | null;
    orderBy?: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[] | Record<string, never> | null;
    join?: Record<string, any> | Record<string, never> | null;
  };
  domain: string;
}) {
  const { params, domain } = options;

  const [error, result] = await paginatedQuery<InferSelectModel<typeof systemMenu>>({
    table: systemMenu,
    params: {
      skip: params.skip ?? 0,
      take: params.take ?? 10,
      where: params.where,
      orderBy: params.orderBy,
      join: params.join,
    },
    domain,
  });

  if (error) {
    throw new Error(`菜单列表查询失败: ${error.message}`);
  }

  return result;
}

/**
 * 获取菜单树形结构
 */
export async function getMenuTree(options: { status?: number; domain: string }) {
  const { status, domain } = options;
  const whereConditions = [eq(systemMenu.domain, domain)];

  if (status !== undefined) {
    whereConditions.push(eq(systemMenu.status, status));
  }

  const menus = await db.query.systemMenu.findMany({
    where: and(...whereConditions),
    orderBy: [systemMenu.id],
  });

  return buildMenuTree(menus);
}

/**
 * 根据角色获取菜单
 */
export async function getMenusByRole(roleId: string, domain: string) {
  // 使用公共函数获取单个角色的菜单
  const menus = await getMenusByRoles([roleId], domain, true);

  return menus
    .filter(menu => menu !== null && menu.status === Status.ENABLED && menu.domain === domain)
    .sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0) || a.id.localeCompare(b.id));
}

/**
 * 创建菜单
 */
export async function createMenu(menuData: InsertSysMenuData) {
  const [newMenu] = await db.insert(systemMenu).values(menuData).returning();

  // 清除相关缓存
  void await clearAllMenuCache(menuData.domain || "default");

  return newMenu;
}

/**
 * 根据ID获取单个菜单
 */
export async function getMenuById(id: string, domain?: string) {
  const whereConditions = [eq(systemMenu.id, id)];

  if (domain) {
    whereConditions.push(eq(systemMenu.domain, domain));
  }

  return await db.query.systemMenu.findFirst({
    where: domain ? and(...whereConditions) : eq(systemMenu.id, id),
  });
}

/**
 * 更新菜单
 */
export async function updateMenu(id: string, menuData: UpdateSysMenuData, domain?: string) {
  const whereConditions = [eq(systemMenu.id, id)];

  if (domain) {
    whereConditions.push(eq(systemMenu.domain, domain));
  }

  const [updatedMenu] = await db
    .update(systemMenu)
    .set(menuData)
    .where(domain ? and(...whereConditions) : eq(systemMenu.id, id))
    .returning();

  if (updatedMenu) {
    // 清除相关缓存
    void await clearAllMenuCache(updatedMenu.domain || "default");
  }

  return updatedMenu;
}

/**
 * 删除菜单
 */
export async function deleteMenu(id: string, domain?: string) {
  const whereConditions = [eq(systemMenu.id, id)];

  if (domain) {
    whereConditions.push(eq(systemMenu.domain, domain));
  }

  // 先获取菜单信息用于清除缓存
  const menuToDelete = await getMenuById(id, domain);

  if (!menuToDelete) {
    return null;
  }

  // 删除相关的角色菜单关联
  await db.delete(systemRoleMenu).where(and(
    eq(systemRoleMenu.menuId, id),
    eq(systemRoleMenu.domain, menuToDelete.domain),
  ));

  // 删除菜单
  const [deletedMenu] = await db
    .delete(systemMenu)
    .where(domain ? and(...whereConditions) : eq(systemMenu.id, id))
    .returning({ id: systemMenu.id });

  if (deletedMenu) {
    // 清除相关缓存
    void await clearAllMenuCache(menuToDelete.domain || "default");
  }

  return deletedMenu;
}

/**
 * 获取常量路由
 */
export async function getConstantRoutes(domain: string = "default") {
  const constantMenus = await db.query.systemMenu.findMany({
    where: and(
      eq(systemMenu.status, Status.ENABLED),
      eq(systemMenu.domain, domain),
    ),
    orderBy: [systemMenu.id],
  });

  return constantMenus
    .filter(menu => menu.meta?.constant === true)
    .map(menu => transformToMenuItem(menu));
}

/**
 * 获取用户路由（简化版，用于 sys-menus handlers）
 */
export async function getUserRoutesSimple(userId: string, domain: string) {
  // 获取用户的所有角色（包括隐式角色）
  const roles = await rbac.getImplicitRolesForUser(userId, domain);

  if (roles.length < 1) {
    return { routes: [], home: "/dashboard" };
  }

  // 使用公共函数获取菜单数据（排除常量菜单）
  const menus = await getMenusByRoles(roles, domain, false);

  // 直接返回优化后的菜单树结构
  const menuTree = buildMenuTree(menus);

  return {
    routes: menuTree,
    home: "/dashboard", // 可以配置化
  };
}

/**
 * 检查菜单是否存在
 */
export async function menuExists(id: string): Promise<boolean> {
  const menu = await getMenuById(id);
  return !!menu;
}

/**
 * 检查菜单是否有子菜单
 */
export async function hasChildMenus(id: string, domain?: string): Promise<boolean> {
  const whereConditions = [eq(systemMenu.pid, id)];

  if (domain) {
    whereConditions.push(eq(systemMenu.domain, domain));
  }

  const children = await db.query.systemMenu.findMany({
    where: domain ? and(...whereConditions) : eq(systemMenu.pid, id),
  });

  return children.length > 0;
}
