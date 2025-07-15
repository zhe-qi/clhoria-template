import type { JWTPayload } from "hono/utils/jwt/types";

import { desc, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { operationLogs } from "@/db/schema";

import type { OperationLogRouteHandlerType } from "./operation-log.index";

export const list: OperationLogRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");
  const payload: JWTPayload = c.get("jwtPayload");
  const domain = (payload.domain as string) || "default";

  const query = db
    .select()
    .from(operationLogs)
    .where(eq(operationLogs.domain, domain))
    .$dynamic();

  // 搜索条件
  if (params.search) {
    const searchCondition = or(
      ilike(operationLogs.username, `%${params.search}%`),
      ilike(operationLogs.moduleName, `%${params.search}%`),
      ilike(operationLogs.method, `%${params.search}%`),
      ilike(operationLogs.url, `%${params.search}%`),
    );
    if (searchCondition) {
      query.where(searchCondition);
    }
  }

  // 添加排序
  query.orderBy(desc(operationLogs.createdAt));

  const logs = await query;

  return c.json(logs, HttpStatusCodes.OK);
};
