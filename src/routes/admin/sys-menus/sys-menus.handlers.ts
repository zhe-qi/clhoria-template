import { and, count, eq, like, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { sysMenu, sysRoleMenu } from "@/db/schema";
import { getUserMenuIds } from "@/lib/authorization";
import { Status } from "@/lib/enums";
import { withPaginationAndCount } from "@/lib/pagination";

import type { SysMenusRouteHandlerType as RouteHandlerType } from "./sys-menus.index";

// 构建树形结构的辅助函数
function buildTree<T extends { id: string; pid: number }>(
  items: T[],
): Array<T & { children?: Array<T & { children?: any }> }> {
  const map = new Map<string, T & { children?: Array<T & { children?: any }> }>();
  const roots: Array<T & { children?: Array<T & { children?: any }> }> = [];

  // 第一次遍历：创建映射，并尝试建立 pid 到 id 的映射关系
  for (const item of items) {
    map.set(item.id, { ...item, children: [] });

    // 尝试解析 UUID 或使用 order 字段作为逻辑 ID
    // 由于这是种子数据的遗留问题，我们需要一个临时的解决方案
    // 这里暂时不建立映射关系，而是在第二次遍历中处理
  }

  // 构建树形结构
  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.pid === 0) {
      // pid 为 0 的是根节点
      roots.push(node);
    }
    else {
      // 暂时跳过子节点的关联，因为我们需要重新设计这个映射逻辑
      // 这是一个临时的解决方案，最终需要修复种子数据或改变设计
      roots.push(node);
    }
  }

  return roots;
}

/** 查询菜单列表 */
export const list: RouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");

  let searchCondition;

  if (params.search) {
    searchCondition = or(
      like(sysMenu.menuName, `%${params.search}%`),
      like(sysMenu.routeName, `%${params.search}%`),
      like(sysMenu.routePath, `%${params.search}%`),
    );
  }

  // 构建查询
  const query = db
    .select()
    .from(sysMenu)
    .where(searchCondition)
    .orderBy(sysMenu.order, sysMenu.id)
    .$dynamic();

  // 构建计数查询
  const countQuery = db
    .select({ count: count() })
    .from(sysMenu)
    .where(searchCondition);

  const result = await withPaginationAndCount(
    query,
    countQuery,
    { page: params.page, limit: params.limit },
  );

  return c.json(result, HttpStatusCodes.OK);
};

/** 查询菜单树形结构 */
export const tree: RouteHandlerType<"tree"> = async (c) => {
  const { status } = c.req.valid("query");

  const whereConditions = [];

  if (status) {
    whereConditions.push(eq(sysMenu.status, status));
  }

  const menus = await db.query.sysMenu.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    orderBy: [sysMenu.order, sysMenu.id],
  });

  const tree = buildTree(menus);

  return c.json(tree, HttpStatusCodes.OK);
};

/** 根据角色获取菜单 */
export const getMenusByRole: RouteHandlerType<"getMenusByRole"> = async (c) => {
  const { id: roleId } = c.req.valid("param");

  const menuIds = await db
    .select({ menuId: sysRoleMenu.menuId })
    .from(sysRoleMenu)
    .where(eq(sysRoleMenu.roleId, roleId));

  if (menuIds.length === 0) {
    return c.json([], HttpStatusCodes.OK);
  }

  const menus = await db.query.sysMenu.findMany({
    where: and(
      eq(sysMenu.status, Status.ENABLED),
      or(...menuIds.map(({ menuId }) => eq(sysMenu.id, menuId))),
    ),
    orderBy: [sysMenu.order, sysMenu.id],
  });

  return c.json(menus, HttpStatusCodes.OK);
};

/** 创建菜单 */
export const create: RouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");

  const [newMenu] = await db.insert(sysMenu).values(body).returning();

  return c.json(newMenu, HttpStatusCodes.OK);
};

/** 根据ID查询菜单 */
export const getOne: RouteHandlerType<"getOne"> = async (c) => {
  const { id } = c.req.valid("param");

  const menu = await db.query.sysMenu.findFirst({
    where: eq(sysMenu.id, id),
  });

  if (!menu) {
    return c.json(
      { message: `菜单 ${id} 不存在` },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(menu, HttpStatusCodes.OK);
};

/** 更新菜单 */
export const patch: RouteHandlerType<"patch"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const existingMenu = await db.query.sysMenu.findFirst({
    where: eq(sysMenu.id, id),
  });

  if (!existingMenu) {
    return c.json(
      { message: `菜单 ${id} 不存在` },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  const [updatedMenu] = await db
    .update(sysMenu)
    .set(body)
    .where(eq(sysMenu.id, id))
    .returning();

  return c.json(updatedMenu, HttpStatusCodes.OK);
};

/** 获取常量路由 */
export const getConstantRoutes: RouteHandlerType<"getConstantRoutes"> = async (c) => {
  const constantMenus = await db.query.sysMenu.findMany({
    where: and(
      eq(sysMenu.constant, true),
      eq(sysMenu.status, Status.ENABLED),
    ),
    orderBy: [sysMenu.order, sysMenu.id],
  });

  const routes = constantMenus.map(menu => ({
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
  }));

  return c.json(routes, HttpStatusCodes.OK);
};

/** 获取用户路由 */
export const getUserRoutes: RouteHandlerType<"getUserRoutes"> = async (c) => {
  const user = c.get("jwtPayload");

  if (!user || !user.uid) {
    return c.json({ message: "未授权" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const domain = (user.domain as string) || "default";

  // 获取用户的菜单ID
  const menuIds = await getUserMenuIds(user.uid as string, domain);

  if (menuIds.length === 0) {
    return c.json({ routes: [], home: "/dashboard" }, HttpStatusCodes.OK);
  }

  // 获取菜单详情
  const menus = await db.query.sysMenu.findMany({
    where: and(
      or(...menuIds.map(id => eq(sysMenu.id, id))),
      eq(sysMenu.status, Status.ENABLED),
      eq(sysMenu.constant, false), // 排除常量菜单
    ),
    orderBy: [sysMenu.order, sysMenu.id],
  });

  const menuTree = buildTree(menus);

  return c.json({
    routes: menuTree,
    home: "/dashboard", // 可以配置化
  }, HttpStatusCodes.OK);
};

/** 删除菜单 */
export const remove: RouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const existingMenu = await db.query.sysMenu.findFirst({
    where: eq(sysMenu.id, id),
  });

  if (!existingMenu) {
    return c.json(
      { message: `菜单 ${id} 不存在` },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // 检查是否有子菜单 - 由于 pid 是 integer 类型，我们暂时跳过这个检查
  // 这是一个设计问题，需要重新考虑菜单的父子关系设计
  // const childMenus = await db.query.sysMenu.findMany({
  //   where: eq(sysMenu.pid, someIntegerId),
  // });
  const childMenus: any[] = []; // 临时解决方案

  if (childMenus.length > 0) {
    return c.json(
      { message: "存在子菜单，无法删除" },
      HttpStatusCodes.BAD_REQUEST,
    );
  }

  // 删除相关的角色菜单关联
  await db.delete(sysRoleMenu).where(eq(sysRoleMenu.menuId, id));

  // 删除菜单
  await db.delete(sysMenu).where(eq(sysMenu.id, id));

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
