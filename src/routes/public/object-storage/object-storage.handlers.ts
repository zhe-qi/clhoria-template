import type { RouteConfig } from "@hono/zod-openapi";

import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/lib";

import { generateDownloadUrl, generateUploadUrl } from "@/services/object-storage";
import { pickContext } from "@/utils";

import type * as routes from "./object-storage.routes";

type ObjectStorageRouteHandlerType<T extends keyof typeof routes> = AppRouteHandler<(typeof routes)[T] & RouteConfig>;

export const getUploadToken: ObjectStorageRouteHandlerType<"getUploadToken"> = async (c) => {
  const { fileName, fileType } = c.req.valid("json");

  const [userId, userDomain] = pickContext(c, ["userId", "userDomain"]);

  let finalFileName = fileName;
  if (userId && userDomain) {
    // 如果用户已认证，使用域和用户ID作为路径前缀
    finalFileName = `${userDomain}/${userId}/${fileName}`;
  }
  else {
    // 匿名用户使用公共路径
    finalFileName = `public/${fileName}`;
  }

  const result = await generateUploadUrl({
    fileName: finalFileName,
    fileType,
  });

  return c.json(result, HttpStatusCodes.OK);
};

export const getDownloadToken: ObjectStorageRouteHandlerType<"getDownloadToken"> = async (c) => {
  const { fileName } = c.req.valid("json");

  const [userId, userDomain] = pickContext(c, ["userId", "userDomain"]);

  let finalFileName = fileName;
  if (userId && userDomain) {
    // 如果用户已认证，使用域和用户ID作为路径前缀
    finalFileName = `${userDomain}/${userId}/${fileName}`;
  }
  else {
    // 匿名用户使用公共路径
    finalFileName = `public/${fileName}`;
  }

  const result = await generateDownloadUrl({
    fileName: finalFileName,
  });

  return c.json(result, HttpStatusCodes.OK);
};
