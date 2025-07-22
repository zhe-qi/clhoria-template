import type { JWTPayload } from "hono/utils/jwt/types";

import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import { getDuplicateKeyError } from "@/lib/constants";
import { GlobalParamsService } from "@/services/global-params.service";

import type { GlobalParamsRouteHandlerType } from "./global-params.index";

const globalParamsService = GlobalParamsService.instance;

export const list: GlobalParamsRouteHandlerType<"list"> = async (c) => {
  const {
    domain,
    search,
    isPublic,
    page = 1,
    limit = 20,
  } = c.req.valid("query");

  try {
    const result = await globalParamsService.getAdminList({
      domain,
      search,
      isPublic,
      pagination: { page: Number(page), limit: Number(limit) },
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
    const param = await globalParamsService.getAdminParam(key, domain);

    if (!param) {
      return c.json(
        { message: "参数不存在" },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    return c.json(param, HttpStatusCodes.OK);
  }
  catch (error: any) {
    // console.error("获取全局参数失败:", error);
    return c.json(
      { message: error.message || "服务器内部错误" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const create: GlobalParamsRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { domain } = c.req.valid("query");
  const payload: JWTPayload = c.get("jwtPayload");
  const userId = payload.sub as string;

  try {
    const created = await globalParamsService.createParam(body, domain, userId);

    return c.json(created, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.code === "23505") {
      return c.json(
        getDuplicateKeyError("key", "参数键已存在"),
        HttpStatusCodes.CONFLICT,
      );
    }
    // console.error("创建全局参数失败:", error);
    return c.json(
      { message: error.message || "服务器内部错误" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const update: GlobalParamsRouteHandlerType<"update"> = async (c) => {
  const { key } = c.req.valid("param");
  const body = c.req.valid("json");
  const { domain } = c.req.valid("query");
  const payload: JWTPayload = c.get("jwtPayload");
  const userId = payload.sub as string;

  try {
    const updated = await globalParamsService.updateParam(key, body, domain, userId);

    if (!updated) {
      return c.json(
        { message: HttpStatusPhrases.NOT_FOUND },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    return c.json(updated, HttpStatusCodes.OK);
  }
  catch (error: any) {
    // console.error("更新全局参数失败:", error);
    return c.json(
      { message: error.message || "服务器内部错误" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const remove: GlobalParamsRouteHandlerType<"remove"> = async (c) => {
  const { key } = c.req.valid("param");
  const { domain } = c.req.valid("query");

  try {
    const deleted = await globalParamsService.deleteParam(key, domain);

    if (!deleted) {
      return c.json(
        { message: HttpStatusPhrases.NOT_FOUND },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    return c.body(null, HttpStatusCodes.NO_CONTENT);
  }
  catch (error: any) {
    // console.error("删除全局参数失败:", error);
    return c.json(
      { message: error.message || "服务器内部错误" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

export const batch: GlobalParamsRouteHandlerType<"batch"> = async (c) => {
  const { keys } = c.req.valid("json");
  const { domain, publicOnly = "false" } = c.req.valid("query");

  try {
    const result = await globalParamsService.batchGetParams(keys, {
      domain,
      publicOnly,
    });

    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error: any) {
    // console.error("批量获取全局参数失败:", error);
    return c.json(
      { message: error.message || "服务器内部错误" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};
