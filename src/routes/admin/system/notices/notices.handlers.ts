import type { z } from "zod";

import type { selectSystemNoticesSchema } from "@/db/schema";

import { systemNotices } from "@/db/schema";
import { getQueryValidationError } from "@/lib/enums/zod";
import paginatedQuery from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import {
  createNotice,
  deleteNotice,
  getAdminNotice,
  updateNotice,
} from "@/services/system/notices";
import { pickContext } from "@/utils/tools/hono-helpers";

import type { SystemNoticesRouteHandlerType } from "./notices.index";

export const list: SystemNoticesRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");
  const domain = c.get("userDomain");

  const [error, result] = await paginatedQuery<z.infer<typeof selectSystemNoticesSchema>>({
    table: systemNotices,
    params: query,
    domain,
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const get: SystemNoticesRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");
  const userDomain = c.get("userDomain");

  const notice = await getAdminNotice(id, userDomain);

  if (!notice) {
    return c.json({ message: "通知公告不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(notice, HttpStatusCodes.OK);
};

export const create: SystemNoticesRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const [userId, userDomain] = pickContext(c, ["userId", "userDomain"]);

  const notice = await createNotice(
    {
      ...body,
      domain: userDomain,
      createdBy: userId,
    },
    userId,
  );

  return c.json(notice, HttpStatusCodes.CREATED);
};

export const update: SystemNoticesRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const [userId, userDomain] = pickContext(c, ["userId", "userDomain"]);

  // 检查通知公告是否存在
  const existing = await getAdminNotice(id, userDomain);
  if (!existing) {
    return c.json({ message: "通知公告不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  const notice = await updateNotice(id, userDomain, body, userId);

  return c.json(notice, HttpStatusCodes.OK);
}; ; ;

export const remove: SystemNoticesRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");
  const userDomain = c.get("userDomain");

  try {
    const deleted = await deleteNotice(id, userDomain);

    if (!deleted) {
      return c.json({ message: "通知公告不存在" }, HttpStatusCodes.NOT_FOUND);
    }

    return c.body(null, HttpStatusCodes.NO_CONTENT);
  }
  catch (error: any) {
    return c.json({ message: error.message || "删除通知公告失败" }, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }
};
