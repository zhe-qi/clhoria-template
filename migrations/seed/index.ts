import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import db from "@/db";
import { systemUsers, systemRoles, casbinRule, systemUserRoles } from "@/db/schema";
import { Status } from "@/lib/enums/common";

// 使用 logger，避免 console.log。这里只为 seed 脚本，允许必要时用 console，但建议更换 logger
const logPrefix = "[数据种子]";

async function seedUsers() {
  try {
    console.info(`${logPrefix} 开始写入用户...`);
    const adminPasswordHash = await hash("123456");
    const userPasswordHash = await hash("123456");

    let [adminUser] = await db.insert(systemUsers)
      .values({
        username: "admin",
        password: adminPasswordHash,
        nickName: "管理员",
        status: Status.ENABLED,
        builtIn: true,
      })
      .onConflictDoNothing()
      .returning();

    // 如果插入冲突，从数据库查询
    if (!adminUser) {
      [adminUser] = await db.select().from(systemUsers).where(eq(systemUsers.username, "admin"));
    }

    let [regularUser] = await db.insert(systemUsers)
      .values({
        username: "user",
        password: userPasswordHash,
        nickName: "普通用户",
        status: Status.ENABLED,
        builtIn: false,
      })
      .onConflictDoNothing()
      .returning();

    // 如果插入冲突，从数据库查询
    if (!regularUser) {
      [regularUser] = await db.select().from(systemUsers).where(eq(systemUsers.username, "user"));
    }

    console.info(`${logPrefix} 已创建用户 admin (${adminUser?.id}), user (${regularUser?.id})`);
    return { adminUser, regularUser };
  } catch (error) {
    console.error(`${logPrefix} 写入用户失败:`, error);
    return { adminUser: null, regularUser: null };
  }
}

async function seedRoles() {
  try {
    console.info(`${logPrefix} 开始写入角色...`);

    let [adminRole] = await db.insert(systemRoles)
      .values({
        id: "admin",
        name: "管理员",
        description: "系统管理员角色，拥有所有权限",
        status: Status.ENABLED,
      })
      .onConflictDoNothing()
      .returning();

    // 如果插入冲突，从数据库查询
    if (!adminRole) {
      [adminRole] = await db.select().from(systemRoles).where(eq(systemRoles.id, "admin"));
    }

    let [userRole] = await db.insert(systemRoles)
      .values({
        id: "user",
        name: "普通用户",
        description: "普通用户角色，拥有基本权限",
        status: Status.ENABLED,
      })
      .onConflictDoNothing()
      .returning();

    // 如果插入冲突，从数据库查询
    if (!userRole) {
      [userRole] = await db.select().from(systemRoles).where(eq(systemRoles.id, "user"));
    }

    console.info(`${logPrefix} 已创建角色 admin (${adminRole?.id}), user (${userRole?.id})`);
    return { adminRole, userRole };
  } catch (error) {
    console.error(`${logPrefix} 写入角色失败:`, error);
    return { adminRole: null, userRole: null };
  }
}

async function seedUserRoles(users: any, roles: any) {
  try {
    console.info(`${logPrefix} 开始写入用户-角色关联...`);
    if (!users?.adminUser || !users?.regularUser || !roles?.adminRole || !roles?.userRole) {
      console.warn(`${logPrefix} 跳过用户-角色关联：未找到用户或角色`);
      return;
    }
    await db.insert(systemUserRoles)
      .values({
        userId: users.adminUser.id,
        roleId: roles.adminRole.id,
      })
      .onConflictDoNothing();
    await db.insert(systemUserRoles)
      .values({
        userId: users.regularUser.id,
        roleId: roles.userRole.id,
      })
      .onConflictDoNothing();
    console.info(`${logPrefix} 已创建用户-角色关联`);
  } catch (error) {
    console.error(`${logPrefix} 写入用户-角色关联失败:`, error);
  }
}

async function seedCasbinRules(roles: any) {
  try {
    console.info(`${logPrefix} 开始写入 Casbin 规则...`);
    if (!roles?.adminRole) {
      console.warn(`${logPrefix} 跳过 Casbin 规则 seed：未找到 admin 角色`);
      return;
    }
    const adminRules = [
      { v1: "/system/roles", v2: "GET" },
      { v1: "/system/roles", v2: "POST" },
      { v1: "/system/roles/{id}", v2: "DELETE" },
      { v1: "/system/roles/{id}", v2: "GET" },
      { v1: "/system/roles/{id}", v2: "PATCH" },
      { v1: "/system/roles/{id}/permissions", v2: "GET" },
      { v1: "/system/roles/{id}/permissions", v2: "PUT" },
      { v1: "/system/users", v2: "GET" },
      { v1: "/system/users", v2: "POST" },
      { v1: "/system/users/{id}", v2: "DELETE" },
      { v1: "/system/users/{id}", v2: "GET" },
      { v1: "/system/users/{id}", v2: "PATCH" },
      { v1: "/system/users/{id}/roles", v2: "PUT" },
    ];
    for (const rule of adminRules) {
      await db.insert(casbinRule)
        .values({
          ptype: "p",
          v0: "admin",
          v1: rule.v1,
          v2: rule.v2,
          v3: "",
          v4: "",
          v5: "",
        })
        .onConflictDoNothing();
    }
    console.info(`${logPrefix} 已为 admin 角色创建 ${adminRules.length} 条 Casbin 规则`);
  } catch (error) {
    console.error(`${logPrefix} 写入 Casbin 规则失败:`, error);
    throw error;
  }
}

async function main() {
  // 标记整体 process 是否有 seed 失败
  let hasError = false;
  console.info(`${logPrefix} 🚀 开始种子数据写入...`);
  // 每个 seed 单独 try-catch，任何失败不影响下一个
  let users: any = {};
  let roles: any = {};
  try {
    users = await seedUsers();
  } catch (e) {
    hasError = true;
  }
  try {
    roles = await seedRoles();
  } catch (e) {
    hasError = true;
  }
  try {
    await seedUserRoles(users, roles);
  } catch (e) {
    hasError = true;
  }
  try {
    await seedCasbinRules(roles);
  } catch (e) {
    hasError = true;
  }

  if (hasError) {
    console.error(`${logPrefix} ❌ 部分数据种子写入失败，请检查上方日志`);
    process.exit(1);
  } else {
    console.info(`${logPrefix} 🎉 全部数据种子写入成功！`);
    process.exit(0);
  }
}

main();
