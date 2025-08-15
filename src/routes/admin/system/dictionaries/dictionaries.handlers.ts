import { getDuplicateKeyError } from "@/lib/enums";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import {
  batchGetDictionaries,
  createDictionary,
  deleteDictionary,
  getAdminDictionaries,
  getAdminDictionary,
  updateDictionary,
} from "@/services/system/dictionary";

import type { SystemDictionariesRouteHandlerType } from "./dictionaries.index";

export const list: SystemDictionariesRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");

  const result = await getAdminDictionaries({
    params: query,
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

  try {
    const dictionary = await createDictionary(body, userId);
    return c.json(dictionary, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return c.json(getDuplicateKeyError("code", "字典编码已存在"), HttpStatusCodes.CONFLICT);
    }
    throw error;
  }
}; ;

export const update: SystemDictionariesRouteHandlerType<"update"> = async (c) => {
  const { code } = c.req.valid("param");
  const body = c.req.valid("json");
  const userId = c.get("userId");

  // 检查字典是否存在
  const existing = await getAdminDictionary(code);
  if (!existing) {
    return c.json({ message: "字典不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  try {
    const dictionary = await updateDictionary(code, body, userId);
    return c.json(dictionary, HttpStatusCodes.OK);
  }
  catch (error: any) {
    if (error.message?.includes("duplicate key")) {
      return c.json(getDuplicateKeyError("code", "字典编码已存在"), HttpStatusCodes.CONFLICT);
    }
    throw error;
  }
}; ;

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
