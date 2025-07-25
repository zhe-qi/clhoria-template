import type { JWTPayload } from "hono/utils/jwt/types";

import * as HttpStatusCodes from "stoker/http-status-codes";

import * as menuService from "@/services/menu";

import type { SysMenusRouteHandlerType as RouteHandlerType } from "./sys-menus.index";

/** 查询菜单列表 */
export const list: RouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");
  const payload: JWTPayload = c.get("jwtPayload");

  const result = await menuService.getMenuList({
    search: params.search,
    page: params.page,
    limit: params.limit,
    domain: payload.domain as string || "default",
  });

  return c.json(result, HttpStatusCodes.OK);
};

/** 查询菜单树形结构 */
export const tree: RouteHandlerType<"tree"> = async (c) => {
  const { status } = c.req.valid("query");
  const payload: JWTPayload = c.get("jwtPayload");

  const tree = await menuService.getMenuTree({
    status,
    domain: payload.domain as string || "default",
  });
  return c.json(tree, HttpStatusCodes.OK);
};

/** 根据角色获取菜单 */
export const getMenusByRole: RouteHandlerType<"getMenusByRole"> = async (c) => {
  const { id: roleId } = c.req.valid("param");
  const payload: JWTPayload = c.get("jwtPayload");

  const menus = await menuService.getMenusByRole(roleId, payload.domain as string || "default");
  return c.json(menus, HttpStatusCodes.OK);
};

/** 创建菜单 */
export const create: RouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const payload: JWTPayload = c.get("jwtPayload");

  const menuData = {
    ...body,
    domain: payload.domain as string || "default",
    createdBy: payload.uid as string,
  };

  const newMenu = await menuService.createMenu(menuData);
  return c.json(newMenu, HttpStatusCodes.OK);
};

/** 根据ID查询菜单 */
export const getOne: RouteHandlerType<"getOne"> = async (c) => {
  const { id } = c.req.valid("param");
  const payload: JWTPayload = c.get("jwtPayload");

  const menu = await menuService.getMenuById(id, payload.domain as string || "default");

  if (!menu) {
    return c.json({ message: `菜单 ${id} 不存在` }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(menu, HttpStatusCodes.OK);
};

/** 更新菜单 */
export const patch: RouteHandlerType<"patch"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const payload: JWTPayload = c.get("jwtPayload");
  const domain = payload.domain as string || "default";

  const existingMenu = await menuService.getMenuById(id, domain);

  if (!existingMenu) {
    return c.json({ message: `菜单 ${id} 不存在` }, HttpStatusCodes.NOT_FOUND);
  }

  const menuData = {
    ...body,
    updatedBy: payload.uid as string,
  };

  const updatedMenu = await menuService.updateMenu(id, menuData, domain);
  return c.json(updatedMenu, HttpStatusCodes.OK);
};

/** 获取常量路由 */
export const getConstantRoutes: RouteHandlerType<"getConstantRoutes"> = async (c) => {
  const payload: JWTPayload = c.get("jwtPayload");

  const routes = await menuService.getConstantRoutes(payload.domain as string || "default");
  return c.json(routes, HttpStatusCodes.OK);
};

/** 获取用户路由 */
export const getUserRoutes: RouteHandlerType<"getUserRoutes"> = async (c) => {
  const payload: JWTPayload = c.get("jwtPayload");

  const result = await menuService.getUserRoutesSimple(payload.uid as string, payload.domain as string);
  return c.json(result, HttpStatusCodes.OK);
};

/** 删除菜单 */
export const remove: RouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");
  const payload: JWTPayload = c.get("jwtPayload");
  const domain = payload.domain as string || "default";

  const existingMenu = await menuService.getMenuById(id, domain);

  if (!existingMenu) {
    return c.json({ message: `菜单 ${id} 不存在` }, HttpStatusCodes.NOT_FOUND);
  }

  // 检查是否有子菜单
  const hasChildren = await menuService.hasChildMenus(id, domain);

  if (hasChildren) {
    return c.json({ message: "该菜单包含子菜单，无法删除" }, HttpStatusCodes.CONFLICT);
  }

  await menuService.deleteMenu(id, domain);
  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
