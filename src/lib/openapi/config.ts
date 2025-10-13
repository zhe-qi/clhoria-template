import type { AppConfig } from "./types";

/**
 * 应用OpenAPI配置
 */
export const APP_CONFIG: AppConfig[] = [
  {
    name: "admin",
    title: "管理端API文档",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIwMTk4Njk5Mi04NTM0LTcwOWMtYWE0My0zNWQ1MWEwZGVhYzciLCJ1c2VybmFtZSI6ImFkbWluIiwiZG9tYWluIjoiZGVmYXVsdCIsImlhdCI6MTc1NDExODM1NSwiZXhwIjoxNzU0NzIzMTU1LCJqdGkiOiI3ZmI3NmUzNS1hNDk0LTRkN2UtYjhiYS0zOTQxYjYxMTgxYTciLCJ0eXBlIjoiYWNjZXNzIn0.q4AEIwdGUlrwe8VuW0u91IKX1sPvfYLRIuCGj-t1BOs",
  },
  {
    name: "client",
    title: "客户端API文档",
    token: "111",
  },
  {
    name: "public",
    title: "公共API文档",
  },
];

/** 应用OpenAPI版本 */
export const OPENAPI_VERSION = "3.1.0";

/** 应用OpenAPI文档端点 */
export const DOC_ENDPOINT = "/doc";

/** 应用OpenAPI基础路径 */
export const API_BASE_PATH = "/api";

/** 应用OpenAPI管理端路径 */
export const API_ADMIN_PATH = `${API_BASE_PATH}/admin`;

/**
 * Scalar配置
 */
export const SCALAR_CONFIG = {
  /** Scalar主题 */
  theme: "kepler",
  /** Scalar布局 */
  layout: "modern",
  /** Scalar默认HTTP客户端 */
  defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
} as const;
