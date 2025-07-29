import type { InferSelectModel } from "drizzle-orm";

import { and, desc, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { systemOperationLog } from "@/db/schema";
import { pagination } from "@/lib/pagination";

import type { SystemOperationLogRouteHandlerType } from "./operation-log.index";

export const list: SystemOperationLogRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");
  const domain = c.get("userDomain");

  // 基本查询条件
  const baseCondition = eq(systemOperationLog.domain, domain);
  let searchCondition;

  // 搜索条件
  if (params.search) {
    searchCondition = or(
      ilike(systemOperationLog.username, `%${params.search}%`),
      ilike(systemOperationLog.moduleName, `%${params.search}%`),
      ilike(systemOperationLog.method, `%${params.search}%`),
      ilike(systemOperationLog.url, `%${params.search}%`),
    );
  }

  // 组合条件
  const whereCondition = searchCondition ? and(baseCondition, searchCondition) : baseCondition;

  const result = await pagination<InferSelectModel<typeof systemOperationLog>>(
    systemOperationLog,
    whereCondition,
    { page: params.page, limit: params.limit, orderBy: [desc(systemOperationLog.createdAt)] },
  );

  return c.json(result, HttpStatusCodes.OK);
};
