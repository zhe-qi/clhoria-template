/* eslint-disable unicorn/filename-case */
/* eslint-disable no-console */

import { eq } from "drizzle-orm";

import db from "@/db";
import { sysRole } from "@/db/schema";

export async function initSysRole() {
  const data = [
    {
      code: "ROLE_SUPER",
      name: "超级管理员",
      description: "超级管理员",
      pid: null,
      status: 1,
      createdBy: "-1",
      updatedBy: null,
    },
  ];

  // 先插入超级管理员角色
  await db.insert(sysRole).values(data).onConflictDoNothing();

  // 获取超级管理员角色的 ID
  const superRole = await db.select({ id: sysRole.id }).from(sysRole).where(eq(sysRole.code, "ROLE_SUPER"));
  
  if (superRole.length > 0) {
    // 插入其他角色，pid 指向超级管理员
    const otherRoles = [
      {
        code: "ROLE_ADMIN",
        name: "管理员",
        description: "管理员",
        pid: superRole[0].id,
        status: 1,
        createdBy: "-1",
        updatedBy: null,
      },
      {
        code: "ROLE_USER",
        name: "用户",
        description: "用户",
        pid: superRole[0].id,
        status: 1,
        createdBy: "-1",
        updatedBy: null,
      },
    ];

    await db.insert(sysRole).values(otherRoles).onConflictDoNothing();
  }

  console.log("系统角色初始化完成");
}
