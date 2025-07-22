import * as HttpStatusCodes from "stoker/http-status-codes";

import { GlobalParamsService } from "@/services/global-params.service";

import type { GlobalParamsRouteHandlerType } from "./global-params.index";

const globalParamsService = GlobalParamsService.instance;

export const list: GlobalParamsRouteHandlerType<"list"> = async (c) => {
  const { domain, publicOnly } = c.req.valid("query");

  try {
    const result = await globalParamsService.getPublicList({
      domain,
      publicOnly,
    });

    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error: any) {
    return c.json(
      { message: error.message || "获取全局参数列表失败" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const get: GlobalParamsRouteHandlerType<"get"> = async (c) => {
  const { key } = c.req.valid("param");
  const { domain } = c.req.valid("query");

  try {
    const param = await globalParamsService.getPublicParam(key, domain);

    if (!param) {
      return c.json(
        { message: "参数不存在或不是公开参数" },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    return c.json(param, HttpStatusCodes.OK);
  }
  catch (error: any) {
    return c.json(
      { message: error.message || "获取全局参数失败" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const batch: GlobalParamsRouteHandlerType<"batch"> = async (c) => {
  const { keys } = c.req.valid("json");
  const { domain, publicOnly } = c.req.valid("query");

  try {
    const result = await globalParamsService.batchGetParams(keys, {
      domain,
      publicOnly,
    });

    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error: any) {
    return c.json(
      { message: error.message || "批量获取全局参数失败" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};
