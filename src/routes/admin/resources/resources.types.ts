import type * as routes from "./resources.routes";
import type { AppRouteHandler } from "@/types/lib";

export type GenerateUploadUrlParams = {
  fileName: string;
  fileType?: string;
  expiresIn?: number;
};

export type GenerateDownloadUrlParams = {
  fileName: string;
  expiresIn?: number;
};

export type PresignedUrlResult = {
  url: string;
  expiresAt: string;
};

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type ObjectStorageRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
