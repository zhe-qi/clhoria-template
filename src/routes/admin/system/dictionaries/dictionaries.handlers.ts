import type { JWTPayload } from "hono/utils/jwt/types";

import * as HttpStatusCodes from "stoker/http-status-codes";

import { CacheConfig } from "@/lib/enums/cache";
import {
  batchGetDictionaries,
  createDictionary,
  deleteDictionary,
  getAdminDictionaries,
  getAdminDictionary,
  isDictionaryCodeExists,
  updateDictionary,
} from "@/services/dictionary";

import type { DictionariesRouteHandlerType } from "./dictionaries.index";

export const list: DictionariesRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");
  const { domain = CacheConfig.DEFAULT_DOMAIN, search, status, page, limit } = query;

  const result = await getAdminDictionaries({
    domain,
    search,
    status: status ? (Number(status) as 0 | 1) : undefined,
    pagination: { page, limit },
  });

  return c.json(result, HttpStatusCodes.OK);
};

export const get: DictionariesRouteHandlerType<"get"> = async (c) => {
  const { code } = c.req.valid("param");
  const { domain = CacheConfig.DEFAULT_DOMAIN } = c.req.valid("query");

  const dictionary = await getAdminDictionary(code, domain);

  if (!dictionary) {
    return c.json({ message: "字典不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(dictionary, HttpStatusCodes.OK);
};

export const create: DictionariesRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { domain = CacheConfig.DEFAULT_DOMAIN } = c.req.valid("query");

  // 从JWT中获取用户ID
  const payload: JWTPayload = c.get("jwtPayload");
  const userId = payload.uid as string;

  // 检查字典编码是否已存在
  const exists = await isDictionaryCodeExists(body.code, domain);
  if (exists) {
    return c.json({ message: "字典编码已存在" }, HttpStatusCodes.CONFLICT);
  }

  const dictionary = await createDictionary(body, domain, userId as string);
  return c.json(dictionary, HttpStatusCodes.CREATED);
};

export const update: DictionariesRouteHandlerType<"update"> = async (c) => {
  const { code } = c.req.valid("param");
  const body = c.req.valid("json");
  const { domain = CacheConfig.DEFAULT_DOMAIN } = c.req.valid("query");
  const payload: JWTPayload = c.get("jwtPayload");
  const userId = payload.uid as string;

  // 检查字典是否存在
  const existing = await getAdminDictionary(code, domain);
  if (!existing) {
    return c.json({ message: "字典不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  // 如果更新了编码，检查新编码是否已存在
  if (body.code && body.code !== code) {
    const codeExists = await isDictionaryCodeExists(body.code, domain, existing.id);
    if (codeExists) {
      return c.json({ message: "字典编码已存在" }, HttpStatusCodes.CONFLICT);
    }
  }

  const dictionary = await updateDictionary(code, body, domain, userId as string);

  return c.json(dictionary, HttpStatusCodes.OK);
};

export const remove: DictionariesRouteHandlerType<"remove"> = async (c) => {
  const { code } = c.req.valid("param");
  const { domain = CacheConfig.DEFAULT_DOMAIN } = c.req.valid("query");

  const deleted = await deleteDictionary(code, domain);

  if (!deleted) {
    return c.json({ message: "字典不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
}; ;

export const batch: DictionariesRouteHandlerType<"batch"> = async (c) => {
  const body = c.req.valid("json");
  const { domain = CacheConfig.DEFAULT_DOMAIN, enabledOnly = "false" } = c.req.valid("query");

  const result = await batchGetDictionaries(body.codes, {
    domain,
    enabledOnly: enabledOnly === "true",
  });

  return c.json(result, HttpStatusCodes.OK);
};
