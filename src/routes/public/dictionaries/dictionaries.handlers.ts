import * as HttpStatusCodes from "stoker/http-status-codes";

import { CacheConfig } from "@/lib/enums/cache";
import {
  batchGetDictionaries,
  getPublicDictionaries,
  getPublicDictionary,
} from "@/services/dictionary";

import type { DictionariesRouteHandlerType } from "./dictionaries.index";

export const list: DictionariesRouteHandlerType<"list"> = async (c) => {
  const { domain = CacheConfig.DEFAULT_DOMAIN } = c.req.valid("query");

  const dictionaries = await getPublicDictionaries({
    domain,
    enabledOnly: true,
  });

  return c.json(dictionaries, HttpStatusCodes.OK);
};

export const get: DictionariesRouteHandlerType<"get"> = async (c) => {
  const { code } = c.req.valid("param");
  const { domain = CacheConfig.DEFAULT_DOMAIN } = c.req.valid("query");

  const dictionary = await getPublicDictionary(code, domain);

  if (!dictionary) {
    return c.json(
      { message: "字典不存在或未启用" },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(dictionary, HttpStatusCodes.OK);
};

export const batch: DictionariesRouteHandlerType<"batch"> = async (c) => {
  const body = c.req.valid("json");
  const { domain = CacheConfig.DEFAULT_DOMAIN } = c.req.valid("query");

  const result = await batchGetDictionaries(body.codes, {
    domain,
    enabledOnly: true, // 公开API只返回启用的字典
  });

  return c.json(result, HttpStatusCodes.OK);
};
