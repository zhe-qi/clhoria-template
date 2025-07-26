import type { AppConfig } from "./types";

export const APP_CONFIG: AppConfig[] = [
  {
    name: "admin",
    title: "管理端API文档",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIwMTk4NDVkZC05ZDhiLTc1YzItOWY2Yi1kYjUyNDYxN2ZkODMiLCJ1c2VybmFtZSI6InN1cGVyIiwiZG9tYWluIjoiYnVpbHQtaW4iLCJpYXQiOjE3NTM1MTg4NjEsImV4cCI6MTc1NDEyMzY2MSwianRpIjoiODZiNDkyZmUtMTllYy00ZTFlLWIzODYtMGY1ZTdiNGNlOWJlIiwidHlwZSI6ImFjY2VzcyJ9.wDjgYNZEaCKK6HKBesOU1aRO04Gkg54vjrCXeXg9EIo",
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
