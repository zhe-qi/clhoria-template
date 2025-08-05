import type { z } from "@hono/zod-openapi";
import type { InferSelectModel } from "drizzle-orm";

import { and, eq, inArray, like, or } from "drizzle-orm";

import type { insertSystemMenuSchema, patchSystemMenuSchema } from "@/db/schema";

import db from "@/db";
import { systemMenu, systemRoleMenu } from "@/db/schema";
import { getUserMenusKey, Status } from "@/lib/enums";
import { pagination } from "@/lib/pagination";
import * as rbac from "@/lib/permissions/casbin/rbac";
import { redisClient } from "@/lib/redis";

import { getUserRolesFromCache } from "./user";

// 菜单相关类型定义
type InsertSysMenuData = z.infer<typeof insertSystemMenuSchema>;
type UpdateSysMenuData = z.infer<typeof patchSystemMenuSchema>;

// 用于构建路由树的菜单数据类型
interface MenuDataForRoute {
  id: string;
  menuName: string;
  routeName: string;
  routePath: string;
  component: string;
  icon: string | null;
  menuType: "directory" | "menu";
  pid: string | null;
  order: number;
  hideInMenu: boolean | null;
  keepAlive: boolean | null;
  constant: boolean;
  activeMenu: string | null;
}

/**
 * 菜单路由接口
 */
export interface MenuRoute {
  name: string;
  path: string;
  component?: string;
  meta: {
    title: string;
    icon?: string | null;
    order: number;
    hideInMenu?: boolean | null;
    keepAlive?: boolean | null;
    activeMenu?: string | null;
    constant?: boolean;
  };
  children?: MenuRoute[];
}

/**
 * 用户路由响应接口
 */
export interface UserRoute {
  home: string;
  routes: MenuRoute[];
}

/**
 * 构建菜单路由树
 */
function buildMenuRouteTree(menus: MenuDataForRoute[], pid: string | null = null): MenuRoute[] {
  const menuMap = new Map<string | null, MenuDataForRoute[]>();

  // 按父级ID分组
  for (const menu of menus) {
    const list = menuMap.get(menu.pid) || [];
    list.push(menu);
    menuMap.set(menu.pid, list);
  }

  // 递归构建树
  const buildTree = (parentId: string | null): MenuRoute[] => {
    const children = menuMap.get(parentId) || [];
    children.sort((a, b) => a.order - b.order);

    return children.map(menu => ({
      name: menu.routeName,
      path: menu.routePath,
      component: menu.component,
      meta: {
        title: menu.menuName,
        icon: menu.icon,
        order: menu.order,
        hideInMenu: menu.hideInMenu,
        keepAlive: menu.keepAlive,
        activeMenu: menu.activeMenu,
        constant: menu.constant,
      },
      children: buildTree(menu.id),
    }));
  };

  return buildTree(pid);
}

/**
 * 获取首页路由
 */
function getHomeRoute(routes: MenuRoute[]): string {
  // 查找第一个非隐藏的叶子节点作为首页
  const findFirstLeaf = (routes: MenuRoute[]): string => {
    for (const route of routes) {
      if (route.meta.hideInMenu) {
        continue;
      }

      if (!route.children || route.children.length < 1) {
        return route.name;
      }

      const childHome = findFirstLeaf(route.children);
      if (childHome) {
        return childHome;
      }
    }
    return "";
  };

  return findFirstLeaf(routes) || "home";
}

/**
 * 构建通用菜单树
 */
interface TreeNode<T> {
  children?: TreeNode<T>[];
}

interface HasOrder {
  order?: number;
}

function buildMenuTree<T extends { id: string; pid: string | null } & HasOrder>(items: T[]): Array<T & TreeNode<T>> {
  const map = new Map<string, T & TreeNode<T>>();
  const roots: Array<T & TreeNode<T>> = [];

  // 第一次遍历：创建映射
  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  // 第二次遍历：构建树形结构
  for (const item of items) {
    const node = map.get(item.id)!;

    if (item.pid === null) {
      // 根节点
      roots.push(node);
    }
    else {
      // 子节点
      const parent = map.get(item.pid);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      }
      else {
        // 找不到父节点，当作根节点处理
        roots.push(node);
      }
    }
  }

  // 递归排序所有层级
  function sortChildren(nodes: Array<T & TreeNode<T>>) {
    nodes.sort((a, b) => {
      const aOrder = a.order || 0;
      const bOrder = b.order || 0;
      return aOrder - bOrder;
    });
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        sortChildren(node.children as Array<T & TreeNode<T>>);
      }
    }
  }

  sortChildren(roots);

  return roots;
}

/**
 * 获取用户菜单路由
 */
export async function getUserRoutes(userId: string, domain: string): Promise<UserRoute> {
  // 尝试从缓存获取
  const cacheKey = getUserMenusKey(userId, domain);
  const cachedRoutes = await redisClient.get(cacheKey);

  if (cachedRoutes) {
    return JSON.parse(cachedRoutes) as UserRoute;
  }

  // 获取用户的所有角色（包括隐式角色）
  const roles = await rbac.getImplicitRolesForUser(userId, domain);

  if (roles.length === 0) {
    const emptyResult: UserRoute = { home: "", routes: [] };
    // 缓存空结果，避免重复查询
    await redisClient.setex(cacheKey, 300, JSON.stringify(emptyResult)); // 5分钟过期
    return emptyResult;
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
  const menusMap = new Map<string, MenuDataForRoute>();
  roleMenus.forEach((rm) => {
    if (rm.menu
      && rm.menu.status === Status.ENABLED
      && rm.menu.domain === domain
      && !menusMap.has(rm.menu.id)) {
      menusMap.set(rm.menu.id, {
        id: rm.menu.id,
        menuName: rm.menu.menuName,
        routeName: rm.menu.routeName,
        routePath: rm.menu.routePath,
        component: rm.menu.component,
        icon: rm.menu.icon,
        menuType: rm.menu.menuType,
        pid: rm.menu.pid,
        order: rm.menu.order,
        hideInMenu: rm.menu.hideInMenu,
        keepAlive: rm.menu.keepAlive,
        constant: rm.menu.constant,
        activeMenu: rm.menu.activeMenu,
      });
    }
  });

  const menus = Array.from(menusMap.values()).sort((a, b) => a.order - b.order);

  // 构建菜单路由树
  const routes = buildMenuRouteTree(menus);

  // 确定首页路由
  const homeRoute = getHomeRoute(routes);

  const result: UserRoute = {
    home: homeRoute,
    routes,
  };

  // 缓存结果
  await redisClient.setex(cacheKey, 1800, JSON.stringify(result)); // 30分钟过期

  return result;
}

/**
 * 获取用户菜单原始数据
 */
export async function getUserMenus(userId: string, domain: string) {
  // 尝试从缓存获取菜单数据
  const cacheKey = `${getUserMenusKey(userId, domain)}:raw`;
  const cachedMenus = await redisClient.get(cacheKey);

  if (cachedMenus) {
    return JSON.parse(cachedMenus);
  }

  // 从缓存获取用户角色
  const roles = await getUserRolesFromCache(userId, domain);

  if (roles.length === 0) {
    const emptyResult: any[] = [];
    // 缓存空结果，避免重复查询
    await redisClient.setex(cacheKey, 300, JSON.stringify(emptyResult)); // 5分钟过期
    return emptyResult;
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
  const menusMap = new Map();
  roleMenus.forEach((rm) => {
    if (rm.menu
      && rm.menu.status === Status.ENABLED
      && rm.menu.domain === domain
      && !menusMap.has(rm.menu.id)) {
      menusMap.set(rm.menu.id, {
        id: rm.menu.id,
        menuType: rm.menu.menuType,
        menuName: rm.menu.menuName,
        iconType: rm.menu.iconType,
        icon: rm.menu.icon,
        routeName: rm.menu.routeName,
        routePath: rm.menu.routePath,
        component: rm.menu.component,
        pathParam: rm.menu.pathParam,
        status: rm.menu.status,
        activeMenu: rm.menu.activeMenu,
        hideInMenu: rm.menu.hideInMenu,
        pid: rm.menu.pid,
        order: rm.menu.order,
        i18nKey: rm.menu.i18nKey,
        keepAlive: rm.menu.keepAlive,
        constant: rm.menu.constant,
        href: rm.menu.href,
        multiTab: rm.menu.multiTab,
      });
    }
  });

  const menus = Array.from(menusMap.values()).sort((a, b) => a.order - b.order);

  // 缓存结果
  await redisClient.setex(cacheKey, 1800, JSON.stringify(menus)); // 30分钟过期

  return menus;
}

/**
 * 清除用户菜单缓存
 */
export async function clearUserMenuCache(userId: string, domain: string): Promise<void> {
  const cacheKey = getUserMenusKey(userId, domain);
  await redisClient.del(cacheKey);
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
      await redisClient.del(...keys);
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
  await clearAllMenuCache(domain);

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
  search?: string;
  page: number;
  limit: number;
  domain: string;
}) {
  const { search, page, limit, domain } = options;

  let searchCondition = eq(systemMenu.domain, domain);
  if (search) {
    searchCondition = and(
      eq(systemMenu.domain, domain),
      or(
        like(systemMenu.menuName, `%${search}%`),
        like(systemMenu.routeName, `%${search}%`),
        like(systemMenu.routePath, `%${search}%`),
      ),
    )!;
  }

  return await pagination<InferSelectModel<typeof systemMenu>>(
    systemMenu,
    searchCondition,
    { page, limit, orderBy: [systemMenu.order, systemMenu.id] },
  );
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
    orderBy: [systemMenu.order, systemMenu.id],
  });

  return buildMenuTree(menus);
}

/**
 * 根据角色获取菜单
 */
export async function getMenusByRole(roleId: string, domain: string) {
  const roleMenus = await db.query.systemRoleMenu.findMany({
    where: and(
      eq(systemRoleMenu.roleId, roleId),
      eq(systemRoleMenu.domain, domain),
    ),
    with: {
      menu: true,
    },
  });

  return roleMenus
    .map(rm => rm.menu)
    .filter(menu => menu !== null && menu.status === Status.ENABLED && menu.domain === domain)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/**
 * 创建菜单
 */
export async function createMenu(menuData: InsertSysMenuData) {
  const [newMenu] = await db.insert(systemMenu).values(menuData).returning();

  // 清除相关缓存
  await clearAllMenuCache(menuData.domain || "default");

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
    await clearAllMenuCache(updatedMenu.domain || "default");
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
  await db.delete(systemRoleMenu).where(eq(systemRoleMenu.menuId, id));

  // 删除菜单
  const [deletedMenu] = await db
    .delete(systemMenu)
    .where(domain ? and(...whereConditions) : eq(systemMenu.id, id))
    .returning({ id: systemMenu.id });

  if (deletedMenu) {
    // 清除相关缓存
    await clearAllMenuCache(menuToDelete.domain || "default");
  }

  return deletedMenu;
}

/**
 * 获取常量路由
 */
export async function getConstantRoutes(domain: string = "default") {
  const constantMenus = await db.query.systemMenu.findMany({
    where: and(
      eq(systemMenu.constant, true),
      eq(systemMenu.status, Status.ENABLED),
      eq(systemMenu.domain, domain),
    ),
    orderBy: [systemMenu.order, systemMenu.id],
  });

  return constantMenus.map(menu => ({
    id: menu.id,
    menuName: menu.menuName,
    routeName: menu.routeName,
    routePath: menu.routePath,
    component: menu.component,
    icon: menu.icon,
    iconType: menu.iconType,
    i18nKey: menu.i18nKey,
    hideInMenu: menu.hideInMenu,
    keepAlive: menu.keepAlive,
    href: menu.href,
    multiTab: menu.multiTab,
    order: menu.order,
    pid: menu.pid,
    pathParam: menu.pathParam,
    activeMenu: menu.activeMenu,
    domain: menu.domain,
  }));
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

  // 提取去重的菜单数据并过滤
  const menusMap = new Map();
  roleMenus.forEach((rm) => {
    const isHandlerExists = rm.menu
      && rm.menu.status === Status.ENABLED
      && !rm.menu.constant
      && rm.menu.domain === domain
      && !menusMap.has(rm.menu.id);

    if (isHandlerExists) {
      menusMap.set(rm.menu.id, rm.menu);
    }
  });

  const menus = Array.from(menusMap.values()).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  // 直接返回数据库菜单结构而不是 MenuRoute 结构
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
