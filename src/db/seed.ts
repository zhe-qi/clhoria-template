import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";

import db from "@/db";
import { adminMenu, adminRoles, adminUsers, casbinRules, userRoles } from "@/db/schema";

async function main() {
  // 1. 创建一个管理员用户
  await db.insert(adminUsers).values({
    username: "admin",
    password: await hash("123456"),
  });

  // 2. 创建一个管理员角色
  await db.insert(adminRoles).values({
    id: "admin",
    name: "管理员",
  });

  // 3. 创建一个管理员菜单
  await db.insert(adminMenu).values({
    component: "Layout",
    meta: {
      title: "管理员",
      icon: "User",
      hidden: false,
      keepAlive: true,
      order: 0,
      redirect: "",
    },
    resource: "/admin/*",
    action: "*",
    parentId: null,
  });

  // 4. 给 casbin 添加一个管理员角色
  await db.insert(casbinRules).values({
    ptype: "p",
    v0: "admin",
    v1: "/admin/*",
    v2: "*",
  });

  // 5. 创建一个后台用户
  await db.insert(adminUsers).values({
    username: "user",
    password: await hash("123456"),
  });

  // 6. 查找管理员用户
  const adminUser = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.username, "admin"),
  });

  if (!adminUser) {
    throw new Error("管理员用户不存在");
  }

  // 7. 给后台用户添加一个管理员角色
  // await db.insert(userRoles).values({
  //   userId: adminUser.id,
  //   roleId: "admin",
  // });
}

main().catch(console.error);
