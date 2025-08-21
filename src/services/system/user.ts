import type { InferInsertModel } from "drizzle-orm";
import type { Context } from "hono";

import { hash, verify } from "@node-rs/argon2";
import { and, eq, inArray } from "drizzle-orm";
import { v7 as uuidV7 } from "uuid";

import db from "@/db";
import { systemUser, systemUserRole } from "@/db/schema";
import * as rbac from "@/lib/casbin/rbac";
import { getIPAddress } from "@/services/ip";
import { formatDate } from "@/utils/tools/formatter";

type CreateUserParams = InferInsertModel<typeof systemUser>;

/**
 * 日志收集工具接口
 */
interface LogContext {
  logFailure: (userId?: string) => Promise<void>;
  logSuccess: (userId: string) => Promise<void>;
  getTokenData: () => {
    ip: string;
    address: string;
    userAgent: string;
    requestId: string;
  };
}

/**
 * 创建登录日志收集上下文
 */
export async function createLoginLogContext(c: Context, username: string, domain: string): Promise<LogContext> {
  const clientIP = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const userAgent = c.req.header("user-agent") || "unknown";
  const address = await getIPAddress(clientIP);
  const requestId = c.get("requestId") || uuidV7();
  const currentTime = formatDate(new Date());

  // eslint-disable-next-line unused-imports/no-unused-vars
  const baseLogData = {
    id: uuidV7(),
    username,
    domain,
    loginTime: currentTime,
    ip: clientIP,
    address,
    userAgent,
    requestId,
    createdBy: "system" as const,
    createdAt: currentTime,
  };

  return {
    // 记录失败日志
    logFailure: (_userId: string = "00000000-0000-0000-0000-000000000000") => {
      // TODO: 你可以选择你自己的日志写入方式 比如 阿里云 sls
      return Promise.resolve();
    },

    // 记录成功日志
    logSuccess: (_userId: string) => {
      // TODO: 你可以选择你自己的日志写入方式 比如 阿里云 sls
      return Promise.resolve();
    },
    // 获取 token 数据
    getTokenData: () => ({
      ip: clientIP,
      address,
      userAgent,
      requestId,
    }),
  };
}

/**
 * 创建用户
 */
export async function createUser(params: CreateUserParams) {
  const hashedPassword = await hash(params.password);

  const [user] = await db.insert(systemUser).values({
    ...params,
    password: hashedPassword,
  }).returning();

  return user;
}

/**
 * 用户登出
 */
export async function logout(_userId: string, _tenantId: string, _accessToken: string) {
  // 1. 更新令牌状态

  // 2. 清理 Redis 缓存
}

/**
 * 更新用户密码
 */
export async function updatePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
) {
  const [user] = await db
    .select({ password: systemUser.password })
    .from(systemUser)
    .where(eq(systemUser.id, userId));

  if (!user) {
    throw new Error("用户不存在");
  }

  // 验证旧密码
  const isValidPassword = await verify(user.password, oldPassword);
  if (!isValidPassword) {
    throw new Error("旧密码错误");
  }

  // 更新密码
  const hashedPassword = await hash(newPassword);
  await db
    .update(systemUser)
    .set({ password: hashedPassword })
    .where(eq(systemUser.id, userId));
}

/**
 * 为用户分配角色
 */
export async function assignRolesToUser(
  userId: string,
  roleIds: string[],
  tenantId: string,
  _operatorId: string,
) {
  return db.transaction(async (tx) => {
    // 1. 获取当前用户的角色
    const currentRoles = await rbac.getRolesForUser(userId, tenantId);
    const currentRoleSet = new Set(currentRoles);
    const newRoleSet = new Set(roleIds);

    // 2. 找出需要添加的角色
    const toAdd = roleIds.filter(roleId => !currentRoleSet.has(roleId));

    // 3. 找出需要删除的角色
    const toRemove = currentRoles.filter(roleId => !newRoleSet.has(roleId));

    // 4. 更新 Casbin
    const casbinOps = await Promise.all([
      ...toAdd.map(roleId => rbac.addRoleForUser(userId, roleId, tenantId)),
      ...toRemove.map(roleId => rbac.deleteRoleForUser(userId, roleId, tenantId)),
    ]);

    // 5. 更新数据库
    if (toRemove.length > 0) {
      await tx
        .delete(systemUserRole)
        .where(and(
          eq(systemUserRole.userId, userId),
          eq(systemUserRole.tenantId, tenantId),
          inArray(systemUserRole.roleId, toRemove),
        ));
    }

    if (toAdd.length > 0) {
      await tx.insert(systemUserRole).values(
        toAdd.map(roleId => ({
          userId,
          roleId,
          tenantId,
        })),
      );
    }

    // 6. 更新 Redis 缓存

    return {
      success: casbinOps.every(Boolean),
      added: toAdd.length,
      removed: toRemove.length,
    };
  });
}

/**
 * 清理用户权限相关缓存
 */
export async function clearUserPermissionCache(_userId: string, _tenantId: string): Promise<void> {
}
