import { hash, verify } from "@node-rs/argon2";
import { and, eq, inArray } from "drizzle-orm";
import { sign } from "hono/jwt";
import { v7 as uuidV7 } from "uuid";

import db from "@/db";
import { sysLoginLog, sysTokens, sysUser, sysUserRole } from "@/db/schema";
import env from "@/env";
import { Status, TokenStatus, TokenType } from "@/lib/enums";

import { clearUserCache } from "./authorization";
import * as rbac from "./casbin/rbac";
import { redisClient } from "./redis";

interface CreateUserParams {
  username: string;
  password: string;
  domain: string;
  nickName: string;
  email?: string;
  phoneNumber?: string;
  avatar?: string;
  createdBy: string;
}

interface LoginParams {
  username: string;
  password: string;
  domain: string;
  ip: string;
  userAgent: string;
  requestId: string;
}

/**
 * 创建用户
 */
export async function createUser(params: CreateUserParams) {
  const hashedPassword = await hash(params.password);

  const [user] = await db.insert(sysUser).values({
    ...params,
    password: hashedPassword,
  }).returning();

  return user;
}

/**
 * 用户登录
 */
export async function login(params: LoginParams) {
  // 查找用户
  const [user] = await db
    .select()
    .from(sysUser)
    .where(and(
      eq(sysUser.username, params.username),
      eq(sysUser.domain, params.domain),
    ));

  if (!user) {
    throw new Error("用户不存在");
  }

  if (user.status !== Status.ENABLED) {
    throw new Error("用户已被禁用");
  }

  // 验证密码
  const isValidPassword = await verify(user.password, params.password);
  if (!isValidPassword) {
    throw new Error("密码错误");
  }

  // 获取用户角色
  const roles = await rbac.getRolesForUser(user.id, params.domain);

  // 生成 JWT
  const payload = {
    sub: user.id,
    username: user.username,
    domain: params.domain,
    roles,
  };

  const accessToken = await sign(payload, env.ADMIN_JWT_SECRET, "HS256");
  const refreshToken = await sign(
    { ...payload, type: "refresh" },
    env.ADMIN_JWT_SECRET,
    "HS256",
  );

  // 保存登录令牌
  await db.insert(sysTokens).values({
    accessToken,
    refreshToken,
    status: TokenStatus.ACTIVE,
    userId: user.id,
    username: user.username,
    domain: params.domain,
    ip: params.ip,
    address: params.ip, // TODO: 可以通过 IP 查询地址
    userAgent: params.userAgent,
    requestId: params.requestId,
    type: TokenType.WEB,
    createdBy: user.id,
  });

  // 保存登录日志
  await db.insert(sysLoginLog).values({
    userId: user.id,
    username: user.username,
    domain: params.domain,
    ip: params.ip,
    address: params.ip, // TODO: 可以通过 IP 查询地址
    userAgent: params.userAgent,
    requestId: params.requestId,
    type: "login",
    createdBy: user.id,
  });

  // 将角色信息缓存到 Redis
  if (roles.length > 0) {
    const key = `user:${params.domain}:${user.id}:roles`;
    await redisClient.sadd(key, ...roles);
    // 设置过期时间为 24 小时
    await redisClient.expire(key, 86400);
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      nickName: user.nickName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
    roles,
  };
}

/**
 * 用户登出
 */
export async function logout(userId: string, domain: string, accessToken: string) {
  // 更新令牌状态
  await db
    .update(sysTokens)
    .set({ status: TokenStatus.REVOKED })
    .where(eq(sysTokens.accessToken, accessToken));

  // 清理 Redis 缓存
  await clearUserCache(userId, domain);
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
    .select({ password: sysUser.password })
    .from(sysUser)
    .where(eq(sysUser.id, userId));

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
    .update(sysUser)
    .set({ password: hashedPassword })
    .where(eq(sysUser.id, userId));
}

/**
 * 为用户分配角色
 */
export async function assignRolesToUser(
  userId: string,
  roleIds: string[],
  domain: string,
  _operatorId: string,
) {
  return db.transaction(async (tx) => {
    // 获取当前用户的角色
    const currentRoles = await rbac.getRolesForUser(userId, domain);
    const currentRoleSet = new Set(currentRoles);
    const newRoleSet = new Set(roleIds);

    // 找出需要添加的角色
    const toAdd = roleIds.filter(roleId => !currentRoleSet.has(roleId));
    // 找出需要删除的角色
    const toRemove = currentRoles.filter(roleId => !newRoleSet.has(roleId));

    // 更新 Casbin
    const casbinOps = await Promise.all([
      ...toAdd.map(roleId => rbac.addRoleForUser(userId, roleId, domain)),
      ...toRemove.map(roleId => rbac.deleteRoleForUser(userId, roleId, domain)),
    ]);

    // 更新数据库
    if (toRemove.length > 0) {
      await tx
        .delete(sysUserRole)
        .where(and(
          eq(sysUserRole.userId, userId),
          inArray(sysUserRole.roleId, toRemove),
        ));
    }

    if (toAdd.length > 0) {
      await tx.insert(sysUserRole).values(
        toAdd.map(roleId => ({
          userId,
          roleId,
        })),
      );
    }

    // 更新 Redis 缓存
    await clearUserCache(userId, domain);
    if (roleIds.length > 0) {
      const key = `user:${domain}:${userId}:roles`;
      await redisClient.sadd(key, ...roleIds);
      await redisClient.expire(key, 86400);
    }

    return {
      success: casbinOps.every(Boolean),
      added: toAdd.length,
      removed: toRemove.length,
    };
  });
}

/**
 * 初始化超级管理员
 */
export async function initSuperAdmin() {
  const domain = "default";
  const roleId = uuidV7();

  // 创建超级管理员角色
  await rbac.addPolicy(roleId, "*", "*", domain, "allow");

  // 创建超级管理员用户
  const user = await createUser({
    username: "admin",
    password: "admin123",
    domain,
    nickName: "超级管理员",
    createdBy: "system",
  });

  // 分配角色
  await assignRolesToUser(user.id, [roleId], domain, "system");

  return { userId: user.id, roleId };
}
