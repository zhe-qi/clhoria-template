import type { RouteConfig } from "@hono/zod-openapi";

import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/lib";

import { generateDownloadUrl, generateUploadUrl } from "@/services/object-storage";

import type * as routes from "./object-storage.routes";

type ObjectStorageRouteHandlerType<T extends keyof typeof routes> = AppRouteHandler<(typeof routes)[T] & RouteConfig>;

export const getUploadToken: ObjectStorageRouteHandlerType<"getUploadToken"> = async (c) => {
  try {
    const { fileName, fileType, expiresIn } = c.req.valid("json");

    // 可选：基于用户身份添加文件路径前缀
    const userId = c.get("userId");
    const userDomain = c.get("userDomain");

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
      expiresIn,
    });

    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error: any) {
    return c.json({ message: error.message || "生成上传链接失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getDownloadToken: ObjectStorageRouteHandlerType<"getDownloadToken"> = async (c) => {
  try {
    const { fileName, expiresIn } = c.req.valid("json");

    // 可选：基于用户身份添加文件路径前缀
    const userId = c.get("userId");
    const userDomain = c.get("userDomain");

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
      expiresIn,
    });

    return c.json(result, HttpStatusCodes.OK);
  }
  catch (error: any) {
    return c.json({ message: error.message || "生成下载链接失败" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};
