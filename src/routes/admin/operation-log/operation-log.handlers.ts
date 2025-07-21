import type { JWTPayload } from "hono/utils/jwt/types";

import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { operationLogs } from "@/db/schema";
import { withPaginationAndCount } from "@/lib/pagination";

import type { OperationLogRouteHandlerType } from "./operation-log.index";

export const list: OperationLogRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");
  const payload: JWTPayload = c.get("jwtPayload");
  const domain = payload.domain as string;

  // 基本查询条件
  const baseCondition = eq(operationLogs.domain, domain);
  let searchCondition;

  // 搜索条件
  if (params.search) {
    searchCondition = or(
      ilike(operationLogs.username, `%${params.search}%`),
      ilike(operationLogs.moduleName, `%${params.search}%`),
      ilike(operationLogs.method, `%${params.search}%`),
      ilike(operationLogs.url, `%${params.search}%`),
    );
  }

  // 组合条件
  const whereCondition = searchCondition ? and(baseCondition, searchCondition) : baseCondition;

  // 构建查询
  const query = db
    .select()
    .from(operationLogs)
    .where(whereCondition)
    .orderBy(desc(operationLogs.createdAt))
    .$dynamic();

  // 构建计数查询
  const countQuery = db
    .select({ count: count() })
    .from(operationLogs)
    .where(whereCondition);

  const result = await withPaginationAndCount(
    query,
    countQuery,
    { page: params.page, limit: params.limit },
  );

  return c.json(result, HttpStatusCodes.OK);
};
