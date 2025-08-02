import type { AppConfig } from "./types";

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

export const OPENAPI_VERSION = "3.1.0";
export const DOC_ENDPOINT = "/doc";

export const API_BASE_PATH = "/api";

export const SCALAR_CONFIG = {
  theme: "kepler",
  layout: "modern",
  defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
} as const;
