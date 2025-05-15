import { Scalar } from "@scalar/hono-api-reference";

import type { AppOpenAPI } from "@/types/lib";

import env from "@/env";

import packageJSON from "../../package.json" with { type: "json" };
import { createRouter } from "./create-app";

// 应用配置定义
interface AppConfig {
  path: string;
  title: string;
  security?: Record<string, []>;
  securityName?: string;
  token?: string;
}

export default function configureOpenAPI() {
  // 定义应用配置
  const appConfigs: AppConfig[] = [
    {
      path: "/admin",
      title: "管理端API文档",
      securityName: "adminBearer",
      security: { adminBearer: [] },
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxOTZjZDMwLWVkMmItNzQzMS1hYjg0LWJkYTJkMDljZTRjNCIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlcyI6WyJhZG1pbiJdfQ.WeqAZNJ9QbklI4pNCk2EA4qyhx-AlfWNiHqU3u6GCHI",
    },
    {
      path: "/client",
      title: "客户端API文档",
      securityName: "clientBearer",
      security: { clientBearer: [] },
      token: "111",
    },
    {
      path: "/",
      title: "公共API文档",
    },
  ];

  // 环境判断
  const isDevelopmentOrTest = env.NODE_ENV !== "production";

  // 创建应用实例和配置函数
  const apps: Record<"adminApp" | "clientApp" | "publicApp", AppOpenAPI> = {
    adminApp: createRouter().basePath("/admin"),
    clientApp: createRouter().basePath("/client"),
    publicApp: createRouter().basePath("/"),
  };
  let configureMainDoc: (app: AppOpenAPI) => void = () => {}; // 提供默认空函数

  // 如果是开发或测试环境，设置文档
  if (isDevelopmentOrTest) {
    // 创建应用并配置
    appConfigs.forEach((config) => {
      const app = createRouter().basePath(config.path);
      const appName = config.path === "/" ? "publicApp" : `${config.path.slice(1)}App`;
      apps[appName as keyof typeof apps] = app;

      // 配置安全方案（如果需要）
      if (config.securityName) {
        app.openAPIRegistry.registerComponent("securitySchemes", config.securityName, {
          type: "http",
          scheme: "bearer",
        });
      }

      // 配置文档端点
      app.doc("/doc", {
        openapi: "3.1.0",
        info: {
          version: packageJSON.version,
          title: config.title,
        },
        ...(config.security && { security: [config.security] }),
      });
    });

    // 配置主文档函数
    configureMainDoc = (app: AppOpenAPI) => {
      // 准备文档源
      const sources = appConfigs.map((config, index) => ({
        title: config.title,
        slug: config.path === "/" ? "public" : config.path.slice(1),
        url: config.path === "/" ? "doc" : `${config.path}/doc`,
        default: index === 0,
      }));

      // 准备认证方案
      const securitySchemes = appConfigs.reduce((schemes, config) => {
        if (config.securityName && config.token) {
          schemes[config.securityName] = { token: config.token };
        }
        return schemes;
      }, {} as Record<string, { token: string }>);

      // 配置文档页面
      app.get(
        "/",
        Scalar({
          theme: "kepler",
          layout: "modern",
          defaultHttpClient: {
            targetKey: "js",
            clientKey: "fetch",
          },
          sources,
          authentication: {
            securitySchemes,
          },
        }),
      );
    };
  }
  else {
    // 生产环境只创建基本应用
    appConfigs.forEach((config) => {
      const appName = config.path === "/" ? "publicApp" : `${config.path.slice(1)}App`;
      apps[appName as keyof typeof apps] = createRouter().basePath(config.path);
    });
  }

  return {
    ...apps,
    configureMainDoc,
  };
}
