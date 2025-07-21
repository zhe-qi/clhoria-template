/* eslint-disable unicorn/filename-case */
/* eslint-disable no-console */

// import db from "@/db";
// import { casbinRule, sysRole } from "@/db/schema";

export async function initCasbinRule() {
  // 权限规则已移除，现在通过 sync:permissions 脚本动态管理
  // 运行 pnpm run sync:permissions 来初始化和同步权限
  console.log("Casbin 权限规则初始化已跳过，请使用 sync:permissions 脚本管理权限");
}
