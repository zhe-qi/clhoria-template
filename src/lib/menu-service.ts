import { and, eq, inArray } from "drizzle-orm";

import db from "@/db";
import { sysMenu, sysRoleMenu } from "@/db/schema";
import { getUserMenusKey } from "@/lib/enums";
import { redisClient } from "@/lib/redis";

import * as rbac from "./casbin/rbac";

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
 * 菜单服务类
 */
export class MenuService {
  private static _instance: MenuService;

  static get instance(): MenuService {
    if (!MenuService._instance) {
      MenuService._instance = new MenuService();
    }
    return MenuService._instance;
  }

  /**
   * 获取用户菜单路由
   */
  async getUserRoutes(userId: string, domain: string): Promise<UserRoute> {
    // 尝试从缓存获取
    const cacheKey = getUserMenusKey(userId, domain);
    const cachedRoutes = await redisClient.get(cacheKey);

    if (cachedRoutes) {
      return JSON.parse(cachedRoutes);
    }

    // 从数据库获取
    const menuIds = await this.getUserMenuIds(userId, domain);

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
        eq(sysMenu.status, "ENABLED"),
      ))
      .orderBy(sysMenu.order);

    // 构建菜单树
    const routes = this.buildMenuTree(menus);

    // 确定首页路由
    const homeRoute = this.getHomeRoute(routes);

    const result: UserRoute = {
      home: homeRoute,
      routes,
    };

    // 缓存结果
    await redisClient.setex(cacheKey, 1800, JSON.stringify(result)); // 30分钟过期

    return result;
  }

  /**
   * 获取用户的菜单ID列表
   */
  private async getUserMenuIds(userId: string, domain: string): Promise<number[]> {
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
   * 构建菜单树
   */
  private buildMenuTree(menus: any[], pid = 0): MenuRoute[] {
    const menuMap = new Map<number, any[]>();

    // 按父级ID分组
    for (const menu of menus) {
      const list = menuMap.get(menu.pid) || [];
      list.push(menu);
      menuMap.set(menu.pid, list);
    }

    // 递归构建树
    const buildTree = (parentId: number): MenuRoute[] => {
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
  private getHomeRoute(routes: MenuRoute[]): string {
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
   * 清除用户菜单缓存
   */
  async clearUserMenuCache(userId: string, domain: string): Promise<void> {
    const cacheKey = getUserMenusKey(userId, domain);
    await redisClient.del(cacheKey);
  }

  /**
   * 清除所有菜单缓存
   */
  async clearAllMenuCache(domain: string): Promise<void> {
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
  async assignMenusToRole(roleId: string, menuIds: number[], domain: string): Promise<{ success: boolean; count: number }> {
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
    await this.clearAllMenuCache(domain);

    return result;
  }

  /**
   * 获取角色的菜单ID列表
   */
  async getRoleMenuIds(roleId: string, domain: string): Promise<number[]> {
    const roleMenus = await db
      .select({ menuId: sysRoleMenu.menuId })
      .from(sysRoleMenu)
      .where(and(
        eq(sysRoleMenu.roleId, roleId),
        eq(sysRoleMenu.domain, domain),
      ));

    return roleMenus.map(rm => rm.menuId);
  }
}
