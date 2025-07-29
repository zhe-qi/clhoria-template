import * as HttpStatusCodes from "stoker/http-status-codes";

import {
  batchGetDictionaries,
  createDictionary,
  deleteDictionary,
  getAdminDictionaries,
  getAdminDictionary,
  isDictionaryCodeExists,
  updateDictionary,
} from "@/services/dictionary";

import type { SystemDictionariesRouteHandlerType } from "./dictionaries.index";

export const list: SystemDictionariesRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");
  const { search, status, page, limit } = query;

  const result = await getAdminDictionaries({
    search,
    status: status ? (Number(status) as 0 | 1) : undefined,
    pagination: { page, limit },
  });

  return c.json(result, HttpStatusCodes.OK);
};

export const get: SystemDictionariesRouteHandlerType<"get"> = async (c) => {
  const { code } = c.req.valid("param");

  const dictionary = await getAdminDictionary(code);

  if (!dictionary) {
    return c.json({ message: "字典不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(dictionary, HttpStatusCodes.OK);
};

export const create: SystemDictionariesRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");

  const userId = c.get("userId");

  // 检查字典编码是否已存在
  const exists = await isDictionaryCodeExists(body.code);
  if (exists) {
    return c.json({ message: "字典编码已存在" }, HttpStatusCodes.CONFLICT);
  }

  const dictionary = await createDictionary(body, userId);
  return c.json(dictionary, HttpStatusCodes.CREATED);
};

export const update: SystemDictionariesRouteHandlerType<"update"> = async (c) => {
  const { code } = c.req.valid("param");
  const body = c.req.valid("json");
  const userId = c.get("userId");

  // 检查字典是否存在
  const existing = await getAdminDictionary(code);
  if (!existing) {
    return c.json({ message: "字典不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  // 如果更新了编码，检查新编码是否已存在
  if (body.code && body.code !== code) {
    const codeExists = await isDictionaryCodeExists(body.code, existing.id);
    if (codeExists) {
      return c.json({ message: "字典编码已存在" }, HttpStatusCodes.CONFLICT);
    }
  }

  const dictionary = await updateDictionary(code, body, userId);

  return c.json(dictionary, HttpStatusCodes.OK);
};

export const remove: SystemDictionariesRouteHandlerType<"remove"> = async (c) => {
  const { code } = c.req.valid("param");

  const deleted = await deleteDictionary(code);

  if (!deleted) {
    return c.json({ message: "字典不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const batch: SystemDictionariesRouteHandlerType<"batch"> = async (c) => {
  const body = c.req.valid("json");
  const { enabledOnly = "false" } = c.req.valid("query");

  const result = await batchGetDictionaries(body.codes, {
    enabledOnly: enabledOnly === "true",
  });

  return c.json(result, HttpStatusCodes.OK);
};
