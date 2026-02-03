import type { z } from "zod";

import type { systemUsersQueryResultSchema } from "./users.schema";

import type { insertSystemUsersSchema } from "@/db/schema";

import type { RefineQueryParams } from "@/lib/refine-query";
import { hash } from "@node-rs/argon2";

import { and, eq, inArray, sql } from "drizzle-orm";
import db from "@/db";
import { systemRoles, systemUserRoles, systemUsers } from "@/db/schema";
import { executeRefineQuery } from "@/lib/refine-query";

type CreateUserInput = z.infer<typeof insertSystemUsersSchema>;

/**
 * 查询用户列表（包含角色信息）
 */
export async function listUsers(queryParams: RefineQueryParams) {
  return executeRefineQuery<z.infer<typeof systemUsersQueryResultSchema>>({
    table: systemUsers,
    queryParams,
    joinConfig: {
      joins: [
        {
          table: systemUserRoles,
          type: "left",
          on: eq(systemUsers.id, systemUserRoles.userId),
        },
        {
          table: systemRoles,
          type: "left",
          on: eq(systemUserRoles.roleId, systemRoles.id),
        },
      ],
      selectFields: {
        id: systemUsers.id,
        username: systemUsers.username,
        nickName: systemUsers.nickName,
        roles: sql`json_agg(json_build_object('id', ${systemRoles.id}, 'name', ${systemRoles.name}))`,
        createdAt: systemUsers.createdAt,
        updatedAt: systemUsers.updatedAt,
        status: systemUsers.status,
        avatar: systemUsers.avatar,
      },
      groupBy: [systemUsers.id],
    },
  });
}

/**
 * 创建用户
 */
export async function createUser(data: CreateUserInput, createdBy: string) {
  const hashedPassword = await hash(data.password);

  const [created] = await db
    .insert(systemUsers)
    .values({
      ...data,
      password: hashedPassword,
      createdBy,
      updatedBy: createdBy,
    })
    .returning();

  return created;
}

/**
 * 根据 ID 获取用户（包含角色信息）
 */
export async function getUserById(id: string) {
  return db.query.systemUsers.findFirst({
    where: eq(systemUsers.id, id),
    with: {
      systemUserRoles: {
        with: {
          role: true,
        },
      },
    },
  });
}

/**
 * 检查用户是否为内置用户
 * @returns null 表示用户不存在，否则返回 builtIn 值
 */
export async function checkUserBuiltIn(id: string): Promise<boolean | null> {
  const [user] = await db
    .select({ builtIn: systemUsers.builtIn })
    .from(systemUsers)
    .where(eq(systemUsers.id, id));

  return user ? user.builtIn : null;
}

/**
 * 更新用户
 */
export async function updateUser(
  id: string,
  data: Record<string, unknown>,
  updatedBy: string,
) {
  const [updated] = await db
    .update(systemUsers)
    .set({
      ...data,
      updatedBy,
    })
    .where(eq(systemUsers.id, id))
    .returning();

  return updated ?? null;
}

/**
 * 删除用户
 */
export async function deleteUser(id: string) {
  const [deleted] = await db
    .delete(systemUsers)
    .where(eq(systemUsers.id, id))
    .returning({ id: systemUsers.id });

  return deleted ?? null;
}

/**
 * 获取用户及其当前角色
 */
export async function getUserWithRoles(userId: string) {
  return db.query.systemUsers.findFirst({
    where: eq(systemUsers.id, userId),
    columns: { id: true },
    with: {
      systemUserRoles: {
        columns: { roleId: true },
      },
    },
  });
}

/**
 * 验证角色是否存在
 * @returns null 表示全部存在，否则返回不存在的角色 ID 列表
 */
export async function validateRolesExist(roleIds: string[]): Promise<string[] | null> {
  if (roleIds.length === 0) {
    return null;
  }

  const existingRoles = await db
    .select({ id: systemRoles.id })
    .from(systemRoles)
    .where(inArray(systemRoles.id, roleIds));

  if (existingRoles.length === roleIds.length) {
    return null;
  }

  const foundRoles = new Set(existingRoles.map(role => role.id));
  return roleIds.filter(roleId => !foundRoles.has(roleId));
}

/**
 * 保存用户角色（增量更新）
 */
export async function saveUserRoles(
  userId: string,
  roleIds: string[],
  currentRoleIds: string[],
): Promise<{ added: number; removed: number; total: number }> {
  const currentRoleSet = new Set(currentRoleIds);
  const newRoleSet = new Set(roleIds);

  // 计算需要删除的角色（在当前角色中但不在新角色中）
  const rolesToRemove = currentRoleIds.filter(roleId => !newRoleSet.has(roleId));

  // 计算需要添加的角色（在新角色中但不在当前角色中）
  const rolesToAdd = roleIds.filter(roleId => !currentRoleSet.has(roleId));

  let removedCount = 0;
  let addedCount = 0;

  // 使用事务确保数据一致性
  await db.transaction(async (tx) => {
    // 删除不需要的角色
    if (rolesToRemove.length > 0) {
      const deleteResult = await tx.delete(systemUserRoles).where(
        and(
          eq(systemUserRoles.userId, userId),
          inArray(systemUserRoles.roleId, rolesToRemove),
        ),
      ).returning({ roleId: systemUserRoles.roleId });

      removedCount = deleteResult.length;
    }

    // 添加新的角色
    if (rolesToAdd.length > 0) {
      const valuesToInsert = rolesToAdd.map(roleId => ({ userId, roleId }));
      const insertResult = await tx.insert(systemUserRoles).values(valuesToInsert).returning();
      addedCount = insertResult.length;
    }
  });

  return { added: addedCount, removed: removedCount, total: roleIds.length };
}
