import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import { getDuplicateKeyError } from "@/lib/enums";
import * as globalParamsService from "@/services/global-params";

import type { GlobalParamsRouteHandlerType } from "./global-params.index";

export const list: GlobalParamsRouteHandlerType<"list"> = async (c) => {
  const { search, isPublic, page = 1, limit = 20 } = c.req.valid("query");

  const result = await globalParamsService.getAdminList({
    search,
    isPublic,
    pagination: { page: Number(page), limit: Number(limit) },
  });

  return c.json(result, HttpStatusCodes.OK);
};

export const get: GlobalParamsRouteHandlerType<"get"> = async (c) => {
  const { key } = c.req.valid("param");

  const param = await globalParamsService.getAdminParam(key);

  if (!param) {
    return c.json({ message: "参数不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(param, HttpStatusCodes.OK);
};

export const create: GlobalParamsRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const userId = c.get("userId");

  try {
    const created = await globalParamsService.createParam(body, userId);

    return c.json(created, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.code === "23505") {
      return c.json(getDuplicateKeyError("key", "参数键已存在"), HttpStatusCodes.CONFLICT);
    }

    return c.json({ message: error.message || "创建参数失败" }, HttpStatusCodes.BAD_REQUEST);
  }
};

export const update: GlobalParamsRouteHandlerType<"update"> = async (c) => {
  const { key } = c.req.valid("param");
  const body = c.req.valid("json");
  const userId = c.get("userId");

  const updated = await globalParamsService.updateParam(key, body, userId);

  if (!updated) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(updated, HttpStatusCodes.OK);
};

export const remove: GlobalParamsRouteHandlerType<"remove"> = async (c) => {
  const { key } = c.req.valid("param");

  const deleted = await globalParamsService.deleteParam(key);

  if (!deleted) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const batch: GlobalParamsRouteHandlerType<"batch"> = async (c) => {
  const { keys } = c.req.valid("json");
  const { publicOnly = "false" } = c.req.valid("query");

  const result = await globalParamsService.batchGetParams(keys, {
    publicOnly,
  });

  return c.json(result, HttpStatusCodes.OK);
};
