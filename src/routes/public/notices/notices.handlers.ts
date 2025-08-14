import * as HttpStatusCodes from "stoker/http-status-codes";

import { CacheConfig } from "@/lib/enums/cache";
import {
  getPublicNotice,
  getPublicNotices,
} from "@/services/system/notices";

import type { SystemNoticesRouteHandlerType } from "./notices.index";

export const list: SystemNoticesRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");
  const { type, domain = CacheConfig.DEFAULT_DOMAIN, skip, take } = query;

  // 直接使用skip/take分页参数
  let pagination;
  if (skip !== undefined && take !== undefined) {
    pagination = { skip, take };
  }

  const result = await getPublicNotices({
    domain,
    type,
    enabledOnly: true, // 公开API只返回启用的通知公告
    pagination,
  });

  return c.json(result, HttpStatusCodes.OK);
};

export const get: SystemNoticesRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");
  const { domain = CacheConfig.DEFAULT_DOMAIN } = c.req.valid("query");

  const notice = await getPublicNotice(id, domain);

  if (!notice) {
    return c.json({ message: "通知公告不存在或未启用" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(notice, HttpStatusCodes.OK);
};
