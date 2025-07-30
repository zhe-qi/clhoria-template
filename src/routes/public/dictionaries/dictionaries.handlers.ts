import * as HttpStatusCodes from "stoker/http-status-codes";

import {
  batchGetDictionaries,
  getPublicDictionaries,
  getPublicDictionary,
} from "@/services/system/dictionary";

import type { SystemDictionariesRouteHandlerType } from "./dictionaries.index";

export const list: SystemDictionariesRouteHandlerType<"list"> = async (c) => {
  const dictionaries = await getPublicDictionaries({
    enabledOnly: true,
  });

  return c.json(dictionaries, HttpStatusCodes.OK);
};

export const get: SystemDictionariesRouteHandlerType<"get"> = async (c) => {
  const { code } = c.req.valid("param");

  const dictionary = await getPublicDictionary(code);

  if (!dictionary) {
    return c.json({ message: "字典不存在或未启用" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(dictionary, HttpStatusCodes.OK);
};

export const batch: SystemDictionariesRouteHandlerType<"batch"> = async (c) => {
  const body = c.req.valid("json");

  const result = await batchGetDictionaries(body.codes, {
    enabledOnly: true, // 公开API只返回启用的字典
  });

  return c.json(result, HttpStatusCodes.OK);
};
