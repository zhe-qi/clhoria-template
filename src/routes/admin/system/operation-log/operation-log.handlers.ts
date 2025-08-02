import type { InferSelectModel } from "drizzle-orm";

import { and, desc, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { tsOperationLog } from "@/db/schema";
import { pagination } from "@/lib/pagination";

import type { SystemOperationLogRouteHandlerType } from "./operation-log.index";

export const list: SystemOperationLogRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");
  const domain = c.get("userDomain");

  // 基本查询条件
  const baseCondition = eq(tsOperationLog.domain, domain);
  let searchCondition;

  // 搜索条件
  if (params.search) {
    searchCondition = or(
      ilike(tsOperationLog.username, `%${params.search}%`),
      ilike(tsOperationLog.moduleName, `%${params.search}%`),
      ilike(tsOperationLog.method, `%${params.search}%`),
      ilike(tsOperationLog.url, `%${params.search}%`),
    );
  }

  // 组合条件
  const whereCondition = searchCondition ? and(baseCondition, searchCondition) : baseCondition;

  const result = await pagination<InferSelectModel<typeof tsOperationLog>>(
    tsOperationLog,
    whereCondition,
    { page: params.page, limit: params.limit, orderBy: [desc(tsOperationLog.startTime)] },
  );

  return c.json(result, HttpStatusCodes.OK);
};
