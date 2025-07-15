/* eslint-disable unicorn/filename-case */
/* eslint-disable no-console */

import db from "@/db";
import { sysRole, sysUser, sysUserRole } from "@/db/schema";

export async function initSysUserRole() {
  // 获取用户和角色的 ID
  const users = await db.select({ id: sysUser.id, username: sysUser.username }).from(sysUser);
  const roles = await db.select({ id: sysRole.id, code: sysRole.code }).from(sysRole);

  const soybeanUser = users.find(u => u.username === "soybean");
  const adminUser = users.find(u => u.username === "admin");
  const normalUser = users.find(u => u.username === "user");

  const superRole = roles.find(r => r.code === "ROLE_SUPER");
  const adminRole = roles.find(r => r.code === "ROLE_ADMIN");
  const userRole = roles.find(r => r.code === "ROLE_USER");

  if (!soybeanUser || !adminUser || !normalUser) {
    throw new Error("未找到必要的用户数据");
  }

  if (!superRole || !adminRole || !userRole) {
    throw new Error("未找到必要的角色数据");
  }

  const data = [
    {
      userId: soybeanUser.id,
      roleId: superRole.id,
    },
    {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
    {
      userId: normalUser.id,
      roleId: userRole.id,
    },
  ];

  await db.insert(sysUserRole).values(data).onConflictDoNothing();
  console.log("用户角色关联初始化完成");
}
