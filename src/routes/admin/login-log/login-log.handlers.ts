import type { JWTPayload } from "hono/utils/jwt/types";

import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { loginLogs } from "@/db/schema";
import { withPaginationAndCount } from "@/lib/pagination";

import type { LoginLogRouteHandlerType } from "./login-log.index";

export const list: LoginLogRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");
  const payload: JWTPayload = c.get("jwtPayload");
  const domain = (payload.domain as string) || "default";

  // 基本查询条件
  const baseCondition = eq(loginLogs.domain, domain);
  let searchCondition;

  // 搜索条件
  if (params.search) {
    searchCondition = or(
      ilike(loginLogs.username, `%${params.search}%`),
      ilike(loginLogs.address, `%${params.search}%`),
      ilike(loginLogs.type, `%${params.search}%`),
    );
  }

  // 组合条件
  const whereCondition = searchCondition ? and(baseCondition, searchCondition) : baseCondition;

  // 构建查询
  const query = db
    .select()
    .from(loginLogs)
    .where(whereCondition)
    .orderBy(desc(loginLogs.createdAt))
    .$dynamic();

  // 构建计数查询
  const countQuery = db
    .select({ count: count() })
    .from(loginLogs)
    .where(whereCondition);

  const result = await withPaginationAndCount(
    query,
    countQuery,
    { page: params.page, limit: params.limit },
  );

  return c.json(result, HttpStatusCodes.OK);
};
