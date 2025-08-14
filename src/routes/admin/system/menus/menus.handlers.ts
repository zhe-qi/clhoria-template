import * as HttpStatusCodes from "stoker/http-status-codes";

import * as menuService from "@/services/system/menu";
import { pickContext } from "@/utils";

import type { SystemMenusRouteHandlerType as RouteHandlerType } from "./menus.index";

/** 查询菜单列表 */
export const list: RouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");
  const domain = c.get("userDomain");

  const result = await menuService.getMenuList({
    params: query,
    domain,
  });

  return c.json(result, HttpStatusCodes.OK);
};

/** 查询菜单树形结构 */
export const tree: RouteHandlerType<"tree"> = async (c) => {
  const { status } = c.req.valid("query");
  const domain = c.get("userDomain");

  const tree = await menuService.getMenuTree({
    status,
    domain,
  });

  return c.json(tree, HttpStatusCodes.OK);
};

/** 根据角色获取菜单 */
export const getMenusByRole: RouteHandlerType<"getMenusByRole"> = async (c) => {
  const { id: roleId } = c.req.valid("param");
  const domain = c.get("userDomain");

  const menus = await menuService.getMenusByRole(roleId, domain);

  return c.json(menus, HttpStatusCodes.OK);
};

/** 创建菜单 */
export const create: RouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

  const menuData = {
    ...body,
    domain,
    createdBy: userId,
  };

  const newMenu = await menuService.createMenu(menuData);

  return c.json(newMenu, HttpStatusCodes.OK);
};

/** 根据ID查询菜单 */
export const getOne: RouteHandlerType<"getOne"> = async (c) => {
  const { id } = c.req.valid("param");
  const domain = c.get("userDomain");

  const menu = await menuService.getMenuById(id, domain);

  if (!menu) {
    return c.json({ message: `菜单 ${id} 不存在` }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(menu, HttpStatusCodes.OK);
};

/** 更新菜单 */
export const patch: RouteHandlerType<"patch"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

  const existingMenu = await menuService.getMenuById(id, domain);

  if (!existingMenu) {
    return c.json({ message: `菜单 ${id} 不存在` }, HttpStatusCodes.NOT_FOUND);
  }

  const menuData = {
    ...body,
    updatedBy: userId,
  };

  const updatedMenu = await menuService.updateMenu(id, menuData, domain);

  return c.json(updatedMenu, HttpStatusCodes.OK);
};

/** 删除菜单 */
export const remove: RouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");
  const domain = c.get("userDomain");

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
