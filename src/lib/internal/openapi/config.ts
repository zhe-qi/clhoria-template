import type { AppConfig } from "./types";

/** 应用OpenAPI配置 */
export const APP_CONFIG: AppConfig[] = [
  {
    name: "admin",
    title: "管理端API文档",
    token: "your-admin-token",
  },
  {
    name: "client",
    title: "客户端API文档",
    token: "your-client-token",
  },
  {
    name: "public",
    title: "公共API文档",
  },
];

/** 应用OpenAPI版本 */
export const OPENAPI_VERSION = "3.1.0";

/** Scalar配置 */
export const SCALAR_CONFIG = {
  /** Scalar主题 */
  theme: "kepler",
  /** Scalar布局 */
  layout: "modern",
  /** Scalar默认HTTP客户端 */
  defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
} as const;

// 重新导出路径配置
export * from "@/lib/constants/api";
