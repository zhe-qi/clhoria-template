import { and, eq, inArray, like, or } from "drizzle-orm";

import db from "@/db";
import { sysMenu, sysRoleMenu } from "@/db/schema";
import { getUserMenusKey, Status } from "@/lib/enums";
import { pagination } from "@/lib/pagination";
import * as rbac from "@/lib/permissions/casbin/rbac";
import { redisClient } from "@/lib/redis";

/**
 * 菜单路由接口
 */
export interface MenuRoute {
  name: string;
  path: string;
  component?: string;
  meta: {
    title: string;
    icon?: string;
    order: number;
    hideInMenu?: boolean;
    keepAlive?: boolean;
    activeMenu?: string;
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
 * 获取用户的菜单ID列表
 */
async function getUserMenuIds(userId: string, domain: string): Promise<string[]> {
  // 获取用户的所有角色（包括隐式角色）
  const roles = await rbac.getImplicitRolesForUser(userId, domain);

  if (roles.length === 0) {
    return [];
  }

  // 查询角色对应的菜单
  const roleMenus = await db
    .select({ menuId: sysRoleMenu.menuId })
    .from(sysRoleMenu)
    .where(and(
      inArray(sysRoleMenu.roleId, roles),
      eq(sysRoleMenu.domain, domain),
    ));

  return [...new Set(roleMenus.map(rm => rm.menuId))];
}

/**
 * 构建菜单路由树
 */
function buildMenuRouteTree(menus: any[], pid: string | null = null): MenuRoute[] {
  const menuMap = new Map<string | null, any[]>();

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

      if (!route.children || route.children.length === 0) {
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
function buildMenuTree<T extends { id: string; pid: string | null }>(items: T[]):
Array<T & { children?: Array<T & { children?: any }> }> {
  const map = new Map<string, T & { children?: Array<T & { children?: any }> }>();
  const roots: Array<T & { children?: Array<T & { children?: any }> }> = [];

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
  function sortChildren(nodes: Array<T & { children?: Array<T & { children?: any }> }>) {
    nodes.sort((a, b) => {
      const aOrder = (a as any).order || 0;
      const bOrder = (b as any).order || 0;
      return aOrder - bOrder;
    });
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        sortChildren(node.children);
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
    return JSON.parse(cachedRoutes);
  }

  // 从数据库获取
  const menuIds = await getUserMenuIds(userId, domain);

  if (menuIds.length === 0) {
    const emptyResult: UserRoute = { home: "", routes: [] };
    // 缓存空结果，避免重复查询
    await redisClient.setex(cacheKey, 300, JSON.stringify(emptyResult)); // 5分钟过期
    return emptyResult;
  }

  // 查询菜单详情
  const menus = await db
    .select({
      id: sysMenu.id,
      menuName: sysMenu.menuName,
      routeName: sysMenu.routeName,
      routePath: sysMenu.routePath,
      component: sysMenu.component,
      icon: sysMenu.icon,
      menuType: sysMenu.menuType,
      pid: sysMenu.pid,
      order: sysMenu.order,
      hideInMenu: sysMenu.hideInMenu,
      keepAlive: sysMenu.keepAlive,
      constant: sysMenu.constant,
      activeMenu: sysMenu.activeMenu,
    })
    .from(sysMenu)
    .where(and(
      inArray(sysMenu.id, menuIds),
      eq(sysMenu.status, Status.ENABLED),
      eq(sysMenu.domain, domain),
    ))
    .orderBy(sysMenu.order);

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
export async function assignMenusToRole(roleId: string, menuIds: string[], domain: string): Promise<{ success: boolean; count: number }> {
  const result = await db.transaction(async (tx) => {
    // 删除现有的菜单分配
    await tx
      .delete(sysRoleMenu)
      .where(and(
        eq(sysRoleMenu.roleId, roleId),
        eq(sysRoleMenu.domain, domain),
      ));

    // 添加新的菜单分配
    if (menuIds.length > 0) {
      await tx.insert(sysRoleMenu).values(
        menuIds.map(menuId => ({
          roleId,
          menuId,
          domain,
        })),
      );
    }

    return { success: true, count: menuIds.length };
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
    .select({ menuId: sysRoleMenu.menuId })
    .from(sysRoleMenu)
    .where(and(
      eq(sysRoleMenu.roleId, roleId),
      eq(sysRoleMenu.domain, domain),
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

  let searchCondition = eq(sysMenu.domain, domain);

  if (search) {
    searchCondition = and(
      eq(sysMenu.domain, domain),
      or(
        like(sysMenu.menuName, `%${search}%`),
        like(sysMenu.routeName, `%${search}%`),
        like(sysMenu.routePath, `%${search}%`),
      ),
    )!;
  }

  return await pagination(
    sysMenu,
    searchCondition,
    { page, limit, orderBy: [sysMenu.order, sysMenu.id] },
  );
}

/**
 * 获取菜单树形结构
 */
export async function getMenuTree(options: { status?: string; domain: string }) {
  const { status, domain } = options;
  const whereConditions = [eq(sysMenu.domain, domain)];

  if (status !== undefined) {
    whereConditions.push(eq(sysMenu.status, status as any));
  }

  const menus = await db.query.sysMenu.findMany({
    where: and(...whereConditions),
    orderBy: [sysMenu.order, sysMenu.id],
  });

  return buildMenuTree(menus);
}

/**
 * 根据角色获取菜单
 */
export async function getMenusByRole(roleId: string, domain: string) {
  const menuIds = await db
    .select({ menuId: sysRoleMenu.menuId })
    .from(sysRoleMenu)
    .where(and(
      eq(sysRoleMenu.roleId, roleId),
      eq(sysRoleMenu.domain, domain),
    ));

  if (menuIds.length === 0) {
    return [];
  }

  return await db.query.sysMenu.findMany({
    where: and(
      eq(sysMenu.status, Status.ENABLED),
      eq(sysMenu.domain, domain),
      or(...menuIds.map(({ menuId }) => eq(sysMenu.id, menuId))),
    ),
    orderBy: [sysMenu.order, sysMenu.id],
  });
}

/**
 * 创建菜单
 */
export async function createMenu(menuData: any) {
  const [newMenu] = await db.insert(sysMenu).values(menuData).returning();

  // 清除相关缓存
  await clearAllMenuCache(menuData.domain || "default");

  return newMenu;
}

/**
 * 根据ID获取单个菜单
 */
export async function getMenuById(id: string, domain?: string) {
  const whereConditions = [eq(sysMenu.id, id)];

  if (domain) {
    whereConditions.push(eq(sysMenu.domain, domain));
  }

  return await db.query.sysMenu.findFirst({
    where: domain ? and(...whereConditions) : eq(sysMenu.id, id),
  });
}

/**
 * 更新菜单
 */
export async function updateMenu(id: string, menuData: any, domain?: string) {
  const whereConditions = [eq(sysMenu.id, id)];

  if (domain) {
    whereConditions.push(eq(sysMenu.domain, domain));
  }

  const [updatedMenu] = await db
    .update(sysMenu)
    .set(menuData)
    .where(domain ? and(...whereConditions) : eq(sysMenu.id, id))
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
  const whereConditions = [eq(sysMenu.id, id)];

  if (domain) {
    whereConditions.push(eq(sysMenu.domain, domain));
  }

  // 先获取菜单信息用于清除缓存
  const menuToDelete = await getMenuById(id, domain);

  if (!menuToDelete) {
    return null;
  }

  // 删除相关的角色菜单关联
  await db.delete(sysRoleMenu).where(eq(sysRoleMenu.menuId, id));

  // 删除菜单
  const [deletedMenu] = await db
    .delete(sysMenu)
    .where(domain ? and(...whereConditions) : eq(sysMenu.id, id))
    .returning({ id: sysMenu.id });

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
  const constantMenus = await db.query.sysMenu.findMany({
    where: and(
      eq(sysMenu.constant, true),
      eq(sysMenu.status, Status.ENABLED),
      eq(sysMenu.domain, domain),
    ),
    orderBy: [sysMenu.order, sysMenu.id],
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
  // 获取用户的菜单ID
  const menuIds = await getUserMenuIds(userId, domain);

  if (menuIds.length === 0) {
    return { routes: [], home: "/dashboard" };
  }

  // 获取菜单详情
  const menus = await db.query.sysMenu.findMany({
    where: and(
      or(...menuIds.map(id => eq(sysMenu.id, id))),
      eq(sysMenu.status, Status.ENABLED),
      eq(sysMenu.constant, false), // 排除常量菜单
      eq(sysMenu.domain, domain),
    ),
    orderBy: [sysMenu.order, sysMenu.id],
  });

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
  const whereConditions = [eq(sysMenu.pid, id)];

  if (domain) {
    whereConditions.push(eq(sysMenu.domain, domain));
  }

  const children = await db.query.sysMenu.findMany({
    where: domain ? and(...whereConditions) : eq(sysMenu.pid, id),
  });

  return children.length > 0;
}
