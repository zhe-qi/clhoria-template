import * as HttpStatusCodes from "stoker/http-status-codes";

import {
  batchGetDictionaries,
  getPublicDictionaries,
  getPublicDictionary,
} from "@/services/dictionary";

import type { DictionariesRouteHandlerType } from "./dictionaries.index";

export const list: DictionariesRouteHandlerType<"list"> = async (c) => {
  const dictionaries = await getPublicDictionaries({
    enabledOnly: true,
  });

  return c.json(dictionaries, HttpStatusCodes.OK);
};

export const get: DictionariesRouteHandlerType<"get"> = async (c) => {
  const { code } = c.req.valid("param");

  const dictionary = await getPublicDictionary(code);

  if (!dictionary) {
    return c.json({ message: "字典不存在或未启用" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(dictionary, HttpStatusCodes.OK);
};

export const batch: DictionariesRouteHandlerType<"batch"> = async (c) => {
  const body = c.req.valid("json");

  const result = await batchGetDictionaries(body.codes, {
    enabledOnly: true, // 公开API只返回启用的字典
  });

  return c.json(result, HttpStatusCodes.OK);
};
