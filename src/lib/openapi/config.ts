import type { AppConfig } from "./types";

export const APP_CONFIG: AppConfig[] = [
  {
    name: "admin",
    title: "管理端API文档",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIwMTk4MmQyNS1hNWM2LTczMWUtYWJlYi00YzU4ODIxMDViMDUiLCJ1c2VybmFtZSI6InN1cGVyIiwiZG9tYWluIjoiYnVpbHQtaW4iLCJpYXQiOjE3NTMxMDQxNTcsImV4cCI6MTc1MzcwODk1NywianRpIjoiOGEyMDc4MzYtMWQ4MC00ZDkxLTgxMjktMmE1ZWU5ZWI5MTIzIiwidHlwZSI6ImFjY2VzcyJ9.PYMq9fW1bldzRPES0i5GlZYYkE-c5ih_01EOYZwgxkM",
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

export const SCALAR_CONFIG = {
  theme: "kepler",
  layout: "modern",
  defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
} as const;
