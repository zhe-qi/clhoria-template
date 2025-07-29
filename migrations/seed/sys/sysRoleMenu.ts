/* eslint-disable unicorn/filename-case */
/* eslint-disable no-console */

import db from "@/db";
import { systemMenu, systemRole, systemRoleMenu } from "@/db/schema";

export async function initSysRoleMenu() {
  // 获取角色和菜单的 ID
  const roles = await db.select({ id: systemRole.id, code: systemRole.code }).from(systemRole);
  const menus = await db.select({ id: systemMenu.id, routeName: systemMenu.routeName }).from(systemMenu);

  const superRole = roles.find(r => r.code === "ROLE_SUPER");
  const userRole = roles.find(r => r.code === "ROLE_USER");

  if (!superRole || !userRole) {
    throw new Error("未找到必要的角色数据");
  }

  const data = [];

  // 超级管理员拥有所有菜单权限
  for (const menu of menus) {
    data.push({
      roleId: superRole.id,
      menuId: menu.id,
      domain: "default",
    });
  }

  // 普通用户只有首页权限
  const userMenus = menus.filter(m => m.routeName === "home");

  for (const menu of userMenus) {
    data.push({
      roleId: userRole.id,
      menuId: menu.id,
      domain: "default",
    });
  }

  await db.insert(systemRoleMenu).values(data).onConflictDoNothing();
  console.log("角色菜单权限初始化完成");
}
