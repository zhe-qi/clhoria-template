import type { InferSelectModel } from "drizzle-orm";

import { and, desc, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { tsLoginLog } from "@/db/schema";
import { pagination } from "@/lib/pagination";

import type { SystemLoginLogRouteHandlerType } from "./login-log.index";

export const list: SystemLoginLogRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");
  const domain = c.get("userDomain");

  // 基本查询条件
  const baseCondition = eq(tsLoginLog.domain, domain);
  let searchCondition;

  // 搜索条件
  if (params.search) {
    searchCondition = or(
      ilike(tsLoginLog.username, `%${params.search}%`),
      ilike(tsLoginLog.address, `%${params.search}%`),
      ilike(tsLoginLog.type, `%${params.search}%`),
    );
  }

  // 组合条件
  const whereCondition = searchCondition ? and(baseCondition, searchCondition) : baseCondition;

  const result = await pagination<InferSelectModel<typeof tsLoginLog>>(
    tsLoginLog,
    whereCondition,
    { page: params.page, limit: params.limit, orderBy: [desc(tsLoginLog.loginTime)] },
  );

  return c.json(result, HttpStatusCodes.OK);
};
