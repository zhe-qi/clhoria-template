import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { generateDownloadUrl, generateUploadUrl } from "@/services/object-storage";
import { pickContext } from "@/utils";

import type { ObjectStorageRouteHandlerType } from "./object-storage.index";

export const getUploadToken: ObjectStorageRouteHandlerType<"getUploadToken"> = async (c) => {
  const { fileName, fileType } = c.req.valid("json");
  const [userId, userDomain] = pickContext(c, ["uid", "tenantId"]);

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
  const [userId, userDomain] = pickContext(c, ["uid", "tenantId"]);

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
