import type { ValidateLoginResult } from "../auth.types";

import { verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";

import db from "@/db";
import { systemUserRoles, systemUsers } from "@/db/schema";
import env from "@/env";
import { Status } from "@/lib/enums";
import cap from "@/lib/internal/cap";
import { enforcerPromise } from "@/lib/internal/casbin";
import { toColumns } from "@/utils";

/**
 * 验证验证码
 * @returns null 表示验证通过，否则返回错误信息
 */
export async function validateCaptcha(captchaToken: string): Promise<string | null> {
  const { success } = await cap.validateToken(captchaToken);
  if (!success && env.NODE_ENV === "production") {
    return "验证码错误";
  }
  return null;
}

/**
 * 登录验证
 * @returns 成功返回用户信息，失败返回 { error, status }
 */
export async function validateLogin(username: string, password: string): Promise<ValidateLoginResult> {
  const user = await db.query.systemUsers.findFirst({
    where: eq(systemUsers.username, username),
    columns: {
      id: true,
      username: true,
      password: true,
      status: true,
    },
  });

  if (!user) {
    return { success: false, error: "用户名或密码错误", status: "unauthorized" };
  }

  if (user.status !== Status.ENABLED) {
    return { success: false, error: "用户已被禁用", status: "forbidden" };
  }

  const isPasswordValid = await verify(user.password, password);
  if (!isPasswordValid) {
    return { success: false, error: "用户名或密码错误", status: "unauthorized" };
  }

  const userRoles = await db.query.systemUserRoles.findMany({
    where: eq(systemUserRoles.userId, user.id),
  });

  return {
    success: true,
    user: {
      id: user.id,
      roles: userRoles.map(({ roleId }) => roleId),
    },
  };
}

/**
 * 获取用户身份信息
 */
export async function getIdentityById(userId: string) {
  const user = await db.query.systemUsers.findFirst({
    where: eq(systemUsers.id, userId),
    columns: toColumns(["id", "username", "avatar", "nickName"]),
    with: {
      systemUserRoles: {
        columns: {
          roleId: true,
        },
      },
    },
  });

  if (!user) return null;

  const { systemUserRoles, ...userWithoutRoles } = user;
  const roles = systemUserRoles.map(({ roleId }) => roleId);

  return { ...userWithoutRoles, roles };
}

/**
 * 获取用户权限（基于角色的 Casbin 策略）
 */
export async function getPermissionsByRoles(roles: string[]) {
  const casbinEnforcer = await enforcerPromise;
  const permissionsSet = new Set<string>();
  const groupingsSet = new Set<string>();

  const allPermsArrays = await Promise.all(
    roles.map(role => casbinEnforcer.getImplicitPermissionsForUser(role)),
  );

  // 处理所有角色的权限
  for (const perms of allPermsArrays) {
    for (const perm of perms) {
      if (!perm || perm.length === 0) continue;

      const filteredPerm = perm.filter(item => item && item.trim() !== "");
      if (filteredPerm.length === 0) continue;

      const permStr = `p, ${filteredPerm.join(", ")}`;
      permissionsSet.add(permStr);
    }
  }

  // 获取所有角色继承关系
  const allGroupings = await casbinEnforcer.getGroupingPolicy();
  for (const grouping of allGroupings) {
    if (!grouping || grouping.length === 0) continue;

    const filteredGrouping = grouping.filter(item => item && item.trim() !== "");
    if (filteredGrouping.length === 0) continue;

    const groupingStr = `g, ${filteredGrouping.join(", ")}`;
    groupingsSet.add(groupingStr);
  }

  return {
    permissions: Array.from(permissionsSet),
    groupings: Array.from(groupingsSet),
  };
}
