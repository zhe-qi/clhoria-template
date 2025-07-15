import type { JWTPayload } from "hono/utils/jwt/types";

import { desc, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { loginLogs } from "@/db/schema";

import type { LoginLogRouteHandlerType } from "./login-log.index";

export const list: LoginLogRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");
  const payload: JWTPayload = c.get("jwtPayload");
  const domain = (payload.domain as string) || "default";

  const query = db
    .select()
    .from(loginLogs)
    .where(eq(loginLogs.domain, domain))
    .$dynamic();

  // 搜索条件
  if (params.search) {
    const searchCondition = or(
      ilike(loginLogs.username, `%${params.search}%`),
      ilike(loginLogs.address, `%${params.search}%`),
      ilike(loginLogs.type, `%${params.search}%`),
    );
    if (searchCondition) {
      query.where(searchCondition);
    }
  }

  // 添加排序
  query.orderBy(desc(loginLogs.createdAt));

  const logs = await query;

  return c.json(logs, HttpStatusCodes.OK);
};
