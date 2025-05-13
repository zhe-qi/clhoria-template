import { hash, verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { users } from "@/db/schema";
import env from "@/env";
import { pick } from "@/utils";

import type { AuthRouteHandlerType } from "./auth.index";

export const adminLogin: AuthRouteHandlerType<"adminLogin"> = async (c) => {
  const body = c.req.valid("json");

  const [user] = await db.select().from(users).where(eq(users.username, body.username));

  if (!user) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  const isPasswordValid = await verify(user.password, body.password);

  if (!isPasswordValid) {
    return c.json({ message: "密码错误" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const payload = pick(user, ["id", "username", "role"]);

  const token = await sign(payload, env.JWT_SECRET);

  return c.json({ token }, HttpStatusCodes.OK);
};

/** 客户端登录 */
export const clientLogin: AuthRouteHandlerType<"clientLogin"> = async (c) => {
  const body = c.req.valid("json");

  const [user] = await db.select().from(users).where(eq(users.username, body.username));

  if (!user) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  const isPasswordValid = await verify(user.password, body.password);

  if (!isPasswordValid) {
    return c.json({ message: "密码错误" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const payload = pick(user, ["id", "username", "role"]);

  const token = await sign(payload, env.JWT_SECRET);

  return c.json({ token }, HttpStatusCodes.OK);
};

/** 客户端注册 */
export const clientRegister: AuthRouteHandlerType<"clientRegister"> = async (c) => {
  const body = c.req.valid("json");

  // 1. 查询用户是否存在
  const [user] = await db.select().from(users).where(eq(users.username, body.username));

  if (user) {
    return c.json({ message: "用户已存在" }, HttpStatusCodes.CONFLICT);
  }

  const [inserted] = await db.insert(users).values({
    username: body.username,
    password: await hash(body.password),
  }).returning({ id: users.id });

  return c.json({
    id: inserted.id,
  }, HttpStatusCodes.OK);
};
