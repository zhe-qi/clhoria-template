import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { generateDownloadUrl, generateUploadUrl } from "@/services/object-storage";
import { Resp } from "@/utils";

import type { ObjectStorageRouteHandlerType } from ".";

export const getUploadToken: ObjectStorageRouteHandlerType<"getUploadToken"> = async (c) => {
  const { fileName, fileType } = c.req.valid("json");

  const result = await generateUploadUrl({
    fileName,
    fileType,
  });

  return c.json(Resp.ok(result), HttpStatusCodes.OK);
};

export const getDownloadToken: ObjectStorageRouteHandlerType<"getDownloadToken"> = async (c) => {
  const { fileName } = c.req.valid("json");

  const result = await generateDownloadUrl({
    fileName,
  });

  return c.json(Resp.ok(result), HttpStatusCodes.OK);
};
