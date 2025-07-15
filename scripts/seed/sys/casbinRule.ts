/* eslint-disable unicorn/filename-case */
/* eslint-disable no-console */

import db from "@/db";
import { casbinRule, sysRole } from "@/db/schema";

export async function initCasbinRule() {
  // 获取角色数据
  const roles = await db.select({ id: sysRole.id, code: sysRole.code }).from(sysRole);

  const superRole = roles.find(r => r.code === "ROLE_SUPER");
  const adminRole = roles.find(r => r.code === "ROLE_ADMIN");
  const userRole = roles.find(r => r.code === "ROLE_USER");

  if (!superRole || !adminRole || !userRole) {
    throw new Error("未找到必要的角色数据");
  }

  const data = [
    // 超级管理员拥有所有权限
    {
      ptype: "p",
      v0: superRole.id,
      v1: "/*",
      v2: "GET",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    {
      ptype: "p",
      v0: superRole.id,
      v1: "/*",
      v2: "POST",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    {
      ptype: "p",
      v0: superRole.id,
      v1: "/*",
      v2: "PATCH",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    {
      ptype: "p",
      v0: superRole.id,
      v1: "/*",
      v2: "DELETE",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    // 普通管理员权限
    {
      ptype: "p",
      v0: adminRole.id,
      v1: "/admin/sys-users",
      v2: "GET",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    {
      ptype: "p",
      v0: adminRole.id,
      v1: "/admin/sys-users/*",
      v2: "GET",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    {
      ptype: "p",
      v0: adminRole.id,
      v1: "/admin/sys-users",
      v2: "POST",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    {
      ptype: "p",
      v0: adminRole.id,
      v1: "/admin/sys-users/*",
      v2: "PATCH",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    {
      ptype: "p",
      v0: adminRole.id,
      v1: "/admin/sys-roles",
      v2: "GET",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    {
      ptype: "p",
      v0: adminRole.id,
      v1: "/admin/sys-roles",
      v2: "POST",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    {
      ptype: "p",
      v0: adminRole.id,
      v1: "/admin/sys-roles/*",
      v2: "PATCH",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    {
      ptype: "p",
      v0: adminRole.id,
      v1: "/admin/sys-menus",
      v2: "GET",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    // 普通用户权限
    {
      ptype: "p",
      v0: userRole.id,
      v1: "/client/*",
      v2: "GET",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    {
      ptype: "p",
      v0: userRole.id,
      v1: "/client/tasks",
      v2: "POST",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
    {
      ptype: "p",
      v0: userRole.id,
      v1: "/client/tasks/*",
      v2: "PATCH",
      v3: "built-in",
      v4: "allow",
      v5: null,
    },
  ];

  await db.insert(casbinRule).values(data).onConflictDoNothing();
  console.log("Casbin 权限规则初始化完成");
}
