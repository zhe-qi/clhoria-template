import { Scalar } from "@scalar/hono-api-reference";

import type { AppNameType } from "@/lib/enums";
import type { AppOpenAPI } from "@/types/lib";

import env from "@/env";

import packageJSON from "../../package.json" with { type: "json" };
import { createRouter } from "./create-app";

interface AppConfig {
  name: string;
  title: string;
  token?: string;
}

interface ScalarSource {
  title: string;
  slug: string;
  url: string;
  default: boolean;
}

interface ScalarAuthentication {
  securitySchemes: Record<string, { token: string }>;
}

// Constants
const APP_CONFIG: AppConfig[] = [
  {
    name: "admin",
    title: "管理端API文档",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIwMTk4MGViNi0wNzk5LTczZWUtODQ5Yi01OWZhMzgwYTAyODYiLCJ1c2VybmFtZSI6ImFkbWluIiwiZG9tYWluIjoiYnVpbHQtaW4iLCJyb2xlcyI6WyIwMTk4MGViNi0wODBkLTc0YmUtYTA5YS1kZWMxZWFiZTJiY2YiXSwidHlwZSI6ImFjY2VzcyJ9.nU11dMWcMqFucP0ZSmmea1yeUdgprWBpPfDYKDfcuhE",
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

const OPENAPI_VERSION = "3.1.0";
const DOC_ENDPOINT = "/doc";

const SCALAR_CONFIG = {
  theme: "kepler",
  layout: "modern",
  defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
} as const;

// Helper functions
function createApps(): Record<AppNameType, AppOpenAPI> {
  return APP_CONFIG.reduce((acc, config) => {
    const path = config.name === "public" ? "/" : `/${config.name}`;
    acc[`${config.name}App` as AppNameType] = createRouter().basePath(path);
    return acc;
  }, {} as Record<AppNameType, AppOpenAPI>);
}

function registerSecurityScheme(router: AppOpenAPI, config: AppConfig): string {
  const securityName = `${config.name}Bearer`;
  router.openAPIRegistry.registerComponent("securitySchemes", securityName, {
    type: "http",
    scheme: "bearer",
  });
  return securityName;
}

function configureAppDocumentation(router: AppOpenAPI, config: AppConfig): void {
  const docConfig = {
    openapi: OPENAPI_VERSION,
    info: { version: packageJSON.version, title: config.title },
  };

  if (config.token) {
    const securityName = registerSecurityScheme(router, config);
    router.doc31(DOC_ENDPOINT, {
      ...docConfig,
      security: [{ [securityName]: [] }],
    });
  }
  else {
    router.doc31(DOC_ENDPOINT, docConfig);
  }
}

function createScalarSources(): ScalarSource[] {
  return APP_CONFIG.map((config, i) => ({
    title: config.title,
    slug: config.name,
    url: config.name === "public" ? "doc" : `/${config.name}/doc`,
    default: i === 0,
  }));
}

function createScalarAuthentication(): ScalarAuthentication {
  return {
    securitySchemes: APP_CONFIG.reduce((acc, config) => {
      if (config.token) {
        acc[`${config.name}Bearer`] = { token: config.token };
      }
      return acc;
    }, {} as Record<string, { token: string }>),
  };
}

function configureSubApplications(apps: Record<AppNameType, AppOpenAPI>): void {
  APP_CONFIG.forEach((config) => {
    const router = apps[`${config.name}App` as AppNameType];
    configureAppDocumentation(router, config);
  });
}

function configureMainDocumentation(app: AppOpenAPI): void {
  app.get("/", Scalar({
    ...SCALAR_CONFIG,
    sources: createScalarSources(),
    authentication: createScalarAuthentication(),
  }));
}

function createMainDocConfigurator(apps: Record<AppNameType, AppOpenAPI>) {
  return (app: AppOpenAPI) => {
    configureSubApplications(apps);
    configureMainDocumentation(app);
  };
}

// Main export function
export default function configureOpenAPI() {
  const isNotProd = env.NODE_ENV !== "production";
  const apps = createApps();

  const configureMainDoc = isNotProd ? createMainDocConfigurator(apps) : null;
  return { ...apps, configureMainDoc };
}
