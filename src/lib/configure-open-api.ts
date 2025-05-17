import { Scalar } from "@scalar/hono-api-reference";

import type { AppOpenAPI } from "@/types/lib";

import env from "@/env";

import packageJSON from "../../package.json" with { type: "json" };
import { createRouter } from "./create-app";

const APP_CONFIG = [
  {
    name: "admin",
    title: "管理端API文档",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxOTZkMzZjLWI4NDgtNzE2YS04ZTkwLWNmZGM0Y2QxYTBjYiIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlcyI6WyJhZG1pbiJdfQ.BAGwSjqCUlFCrRVykfVu3roMF6SUpAxXLjpc9kE5ORs",
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

type AppName = "adminApp" | "clientApp" | "publicApp";

export default function configureOpenAPI() {
  const isNotProd = env.NODE_ENV !== "production";

  const apps = APP_CONFIG.reduce((acc, config) => {
    const path = config.name === "public" ? "/" : `/${config.name}`;
    acc[`${config.name}App` as AppName] = createRouter().basePath(path);
    return acc;
  }, {} as Record<AppName, AppOpenAPI>);

  // 开发环境下配置文档
  let configureMainDoc = null;

  if (isNotProd) {
    configureMainDoc = (app: AppOpenAPI) => {
      // 配置每个子应用的OpenAPI文档
      APP_CONFIG.forEach((config) => {
        const router = apps[`${config.name}App` as AppName];

        // 配置安全方案
        if (config.token) {
          const securityName = `${config.name}Bearer`;
          router.openAPIRegistry.registerComponent("securitySchemes", securityName, {
            type: "http",
            scheme: "bearer",
          });

          router.doc31("/doc", {
            openapi: "3.1.0",
            info: { version: packageJSON.version, title: config.title },
            security: [{ [securityName]: [] }],
          });
        }
        else {
          router.doc31("/doc", {
            openapi: "3.1.0",
            info: { version: packageJSON.version, title: config.title },
          });
        }
      });

      // 配置主文档
      app.get("/", Scalar({
        theme: "kepler",
        layout: "modern",
        defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
        sources: APP_CONFIG.map((config, i) => ({
          title: config.title,
          slug: config.name,
          url: config.name === "public" ? "doc" : `/${config.name}/doc`,
          default: i === 0,
        })),
        authentication: {
          securitySchemes: APP_CONFIG.reduce((acc, config) => {
            if (config.token) {
              acc[`${config.name}Bearer`] = { token: config.token };
            }
            return acc;
          }, {} as Record<string, { token: string }>),
        },
      }));
    };
  }

  return { ...apps, configureMainDoc };
}
