import { hash, verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { adminUsers, clientUsers } from "@/db/schema";
import env from "@/env";
import { pick } from "@/utils";

import type { AuthRouteHandlerType as RouteHandlerType } from "./auth.index";

export const adminLogin: RouteHandlerType<"adminLogin"> = async (c) => {
  const body = c.req.valid("json");

  const user = await db.query.adminUsers.findFirst({
    with: {
      usersToRoles: true,
    },
    where: eq(adminUsers.username, body.username),
  });

  if (!user) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  const isPasswordValid = await verify(user.password, body.password);

  if (!isPasswordValid) {
    return c.json({ message: "密码错误" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const roles = user.usersToRoles.map(role => role.roleId);
  const payload = Object.assign(pick(user, ["id", "username"]), { roles });

  const token = await sign(payload, env.ADMIN_JWT_SECRET);

  return c.json({ token }, HttpStatusCodes.OK);
};

/** 管理员注册 */
export const adminRegister: RouteHandlerType<"adminRegister"> = async (c) => {
  const body = c.req.valid("json");

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, body.username));

  if (user) {
    return c.json({ message: "用户已存在" }, HttpStatusCodes.CONFLICT);
  }

  const [inserted] = await db.insert(adminUsers).values({
    username: body.username,
    password: await hash(body.password),
  }).returning({ id: adminUsers.id });

  return c.json({ id: inserted.id }, HttpStatusCodes.OK);
};

/** 客户端登录 */
export const clientLogin: RouteHandlerType<"clientLogin"> = async (c) => {
  const body = c.req.valid("json");

  const [user] = await db.select().from(clientUsers).where(eq(clientUsers.username, body.username));

  if (!user) {
    return c.json({ message: "用户不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  const isPasswordValid = await verify(user.password, body.password);

  if (!isPasswordValid) {
    return c.json({ message: "密码错误" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const payload = pick(user, ["id", "username"]);

  const token = await sign(payload, env.CLIENT_JWT_SECRET);

  return c.json({ token }, HttpStatusCodes.OK);
};

/** 客户端注册 */
export const clientRegister: RouteHandlerType<"clientRegister"> = async (c) => {
  const body = c.req.valid("json");

  const [user] = await db.select().from(clientUsers).where(eq(clientUsers.username, body.username));

  if (user) {
    return c.json({ message: "用户已存在" }, HttpStatusCodes.CONFLICT);
  }

  const [inserted] = await db.insert(clientUsers).values({
    username: body.username,
    password: await hash(body.password),
  }).returning({ id: clientUsers.id });

  return c.json({ id: inserted.id }, HttpStatusCodes.OK);
};
