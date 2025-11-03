import { hash } from "@node-rs/argon2";
import db from "@/db";
import { systemUsers, systemRoles, casbinRule, systemUserRoles } from "@/db/schema";
import { Status } from "@/lib/enums/common";

async function seedUsers() {
  console.log("🌱 Seeding users...");

  // Hash passwords
  const adminPasswordHash = await hash("123456");
  const userPasswordHash = await hash("123456");

  // Create admin user
  const [adminUser] = await db.insert(systemUsers)
    .values({
      username: "admin",
      password: adminPasswordHash,
      nickName: "管理员",
      status: Status.ENABLED,
      builtIn: true,
    })
    .onConflictDoNothing()
    .returning();

  // Create regular user
  const [regularUser] = await db.insert(systemUsers)
    .values({
      username: "user",
      password: userPasswordHash,
      nickName: "普通用户",
      status: Status.ENABLED,
      builtIn: false,
    })
    .onConflictDoNothing()
    .returning();

  console.log(`✅ Created users: admin (${adminUser?.id}), user (${regularUser?.id})`);
  return { adminUser, regularUser };
}

async function seedRoles() {
  console.log("🌱 Seeding roles...");

  // Create admin role
  const [adminRole] = await db.insert(systemRoles)
    .values({
      id: "admin",
      name: "管理员",
      description: "系统管理员角色，拥有所有权限",
      status: Status.ENABLED,
    })
    .onConflictDoNothing()
    .returning();

  // Create user role
  const [userRole] = await db.insert(systemRoles)
    .values({
      id: "user",
      name: "普通用户",
      description: "普通用户角色，拥有基本权限",
      status: Status.ENABLED,
    })
    .onConflictDoNothing()
    .returning();

  console.log(`✅ Created roles: admin (${adminRole?.id}), user (${userRole?.id})`);
  return { adminRole, userRole };
}

async function seedUserRoles(users: any, roles: any) {
  console.log("🌱 Seeding user-role associations...");

  if (!users.adminUser || !users.regularUser || !roles.adminRole || !roles.userRole) {
    console.log("⚠️  Skipping user-role associations - users or roles not found");
    return;
  }

  // Associate admin user with admin role
  await db.insert(systemUserRoles)
    .values({
      userId: users.adminUser.id,
      roleId: roles.adminRole.id,
    })
    .onConflictDoNothing();

  // Associate regular user with user role
  await db.insert(systemUserRoles)
    .values({
      userId: users.regularUser.id,
      roleId: roles.userRole.id,
    })
    .onConflictDoNothing();

  console.log("✅ Created user-role associations");
}

async function seedCasbinRules(roles: any) {
  console.log("🌱 Seeding Casbin rules...");

  if (!roles.adminRole) {
    console.log("⚠️  Skipping Casbin rules - admin role not found");
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
      })
      .onConflictDoNothing();
  }

  console.log("✅ Created Casbin rules for admin role");
}

async function main() {
  try {
    console.log("🚀 Starting seed process...");

    const users = await seedUsers();
    const roles = await seedRoles();
    await seedUserRoles(users, roles);
    await seedCasbinRules(roles);

    console.log("🎉 Seed process completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during seed process:", error);
    process.exit(1);
  }
}

main();
