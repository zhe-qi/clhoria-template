import type { InferSelectModel } from "drizzle-orm";

import { and, desc, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { loginLogs } from "@/db/schema";
import { pagination } from "@/lib/pagination";

import type { LoginLogRouteHandlerType } from "./login-log.index";

export const list: LoginLogRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");
  const domain = c.get("userDomain");

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

  const result = await pagination<InferSelectModel<typeof loginLogs>>(
    loginLogs,
    whereCondition,
    { page: params.page, limit: params.limit, orderBy: [desc(loginLogs.createdAt)] },
  );

  return c.json(result, HttpStatusCodes.OK);
};
