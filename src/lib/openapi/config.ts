import type { AppConfig } from "./types";

export const APP_CONFIG: AppConfig[] = [
  {
    name: "admin",
    title: "管理端API文档",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIwMTk4MzJiYS02Y2M0LTc2ZmQtYmQ4My0yNTY0ZmRjMmVjNzMiLCJ1c2VybmFtZSI6InN1cGVyIiwiZG9tYWluIjoiYnVpbHQtaW4iLCJpYXQiOjE3NTMyMzc1MzYsImV4cCI6MTc1Mzg0MjMzNiwianRpIjoiZTFlY2E1N2MtNmZjMC00ODZhLWE3Y2YtMWY5ZGQ0NDAwMzgzIiwidHlwZSI6ImFjY2VzcyJ9.n1zml6faB7mbcOq8PEqUamKYpZsV0E3YYE4cAeVgRrA",
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
