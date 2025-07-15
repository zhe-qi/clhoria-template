/* eslint-disable unicorn/filename-case */
/* eslint-disable no-console */

import db from "@/db";
import { sysRole } from "@/db/schema";

export async function initSysRole() {
  const data = [
    {
      code: "ROLE_SUPER",
      name: "超级管理员",
      description: "超级管理员",
      pid: "0",
      status: "ENABLED" as const,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      code: "ROLE_ADMIN",
      name: "管理员",
      description: "管理员",
      pid: "0",
      status: "ENABLED" as const,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      code: "ROLE_USER",
      name: "用户",
      description: "用户",
      pid: "0",
      status: "ENABLED" as const,
      createdBy: "-1",
      updatedBy: null,
    },
  ];

  await db.insert(sysRole).values(data).onConflictDoNothing();
  console.log("系统角色初始化完成");
}
