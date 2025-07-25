import * as HttpStatusCodes from "stoker/http-status-codes";

import * as globalParamsService from "@/services/global-params";

import type { GlobalParamsRouteHandlerType } from "./global-params.index";

export const list: GlobalParamsRouteHandlerType<"list"> = async (c) => {
  const { domain, publicOnly } = c.req.valid("query");

  const result = await globalParamsService.getPublicList({
    domain,
    publicOnly,
  });

  return c.json(result, HttpStatusCodes.OK);
};

export const get: GlobalParamsRouteHandlerType<"get"> = async (c) => {
  const { key } = c.req.valid("param");
  const { domain } = c.req.valid("query");

  const param = await globalParamsService.getPublicParam(key, domain);

  if (!param) {
    return c.json({ message: "参数不存在或不是公开参数" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(param, HttpStatusCodes.OK);
};

export const batch: GlobalParamsRouteHandlerType<"batch"> = async (c) => {
  const { keys } = c.req.valid("json");
  const { domain, publicOnly } = c.req.valid("query");

  const result = await globalParamsService.batchGetParams(keys, {
    domain,
    publicOnly,
  });

  return c.json(result, HttpStatusCodes.OK);
};
