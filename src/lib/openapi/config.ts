import type { AppConfig } from "./types";

export const APP_CONFIG: AppConfig[] = [
  {
    name: "admin",
    title: "管理端API文档",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIwMTk4NDc2OS03MWU4LTcwNTctYWUwNS00NjI2MzI4ZjgwNjIiLCJ1c2VybmFtZSI6ImFkbWluIiwiZG9tYWluIjoiZGVmYXVsdCIsImlhdCI6MTc1MzYwNjEzMCwiZXhwIjoxNzU0MjEwOTMwLCJqdGkiOiIxNWJjYWQ1OC1lYzAxLTQ3YjEtYTJkZC04MDFhY2Q0ODUxZWIiLCJ0eXBlIjoiYWNjZXNzIn0.272v6JoScULh8YB4bLxofFrAZAfAtqCquRkOodTyg6Y",
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
