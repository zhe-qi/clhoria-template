import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { sysUser } from "@/db/schema";
import { Status } from "@/lib/enums";

/**
 * 验证用户状态
 */
async function validateUserStatus(userId: string, domain: string): Promise<{ valid: boolean; message?: string }> {
  const user = await db.query.sysUser.findFirst({
    where: and(
      eq(sysUser.id, userId),
      eq(sysUser.domain, domain),
    ),
  });

  if (!user) {
    return { valid: false, message: "User not found" };
  }

  if (user.status !== Status.ENABLED) {
    return { valid: false, message: "User is disabled" };
  }

  return { valid: true };
}

/**
 * JWT 认证中间件，验证用户状态
 */
export function jwtAuth(): MiddlewareHandler {
  return async (c: Context, next) => {
    const payload: JWTPayload = c.get("jwtPayload");

    if (!payload) {
      return c.json({ message: HttpStatusPhrases.UNAUTHORIZED }, HttpStatusCodes.UNAUTHORIZED);
    }

    const { uid: userId, domain } = payload as { uid: string; domain: string };

    // 验证用户状态
    const userValidation = await validateUserStatus(userId, domain);

    if (!userValidation.valid) {
      return c.json({ message: userValidation.message }, HttpStatusCodes.UNAUTHORIZED);
    }

    await next();
  };
}
