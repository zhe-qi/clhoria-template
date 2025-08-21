import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { generateDownloadUrl, generateUploadUrl } from "@/services/object-storage";

import type { ObjectStorageRouteHandlerType } from "./object-storage.index";

export const getUploadToken: ObjectStorageRouteHandlerType<"getUploadToken"> = async (c) => {
  const { fileName, fileType } = c.req.valid("json");
  const { userId, tenantId } = c.get("jwtPayload");

  let finalFileName = fileName;
  if (userId && tenantId) {
    // 如果用户已认证，使用租户ID和用户ID作为路径前缀
    finalFileName = `${tenantId}/${userId}/${fileName}`;
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
  const { userId, tenantId } = c.get("jwtPayload");

  let finalFileName = fileName;
  if (userId && tenantId) {
    // 如果用户已认证，使用租户ID和用户ID作为路径前缀
    finalFileName = `${tenantId}/${userId}/${fileName}`;
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
