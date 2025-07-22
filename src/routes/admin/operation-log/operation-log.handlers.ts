import type { InferSelectModel } from "drizzle-orm";
import type { JWTPayload } from "hono/utils/jwt/types";

import { and, desc, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { operationLogs } from "@/db/schema";
import { pagination } from "@/lib/pagination";

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

  const result = await pagination<InferSelectModel<typeof operationLogs>>(
    operationLogs,
    whereCondition,
    { page: params.page, limit: params.limit, orderBy: [desc(operationLogs.createdAt)] },
  );

  return c.json(result, HttpStatusCodes.OK);
};
