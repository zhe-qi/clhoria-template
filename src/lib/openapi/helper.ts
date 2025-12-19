import { Scalar } from "@scalar/hono-api-reference";

import type { AppNameType } from "@/lib/enums";
import type { AppOpenAPI } from "@/types/lib";

import type { AppConfig, ScalarAuthentication, ScalarSource } from "./types";

import packageJSON from "../../../package.json" with { type: "json" };
import { createRouter } from "../create-app";
import { API_BASE_PATH, API_PUBLIC_NAME, APP_CONFIG, DOC_ENDPOINT, OPENAPI_VERSION, SCALAR_CONFIG } from "./config";

export function createApps(): Record<AppNameType, AppOpenAPI> {
  return APP_CONFIG.reduce((acc, config) => {
    const path = config.basePath ?? (config.name === API_PUBLIC_NAME ? API_BASE_PATH : `${API_BASE_PATH}/${config.name}`);
    acc[`${config.name}App` as AppNameType] = createRouter().basePath(path);
    return acc;
  }, {} as Record<AppNameType, AppOpenAPI>);
}

export function registerSecurityScheme(router: AppOpenAPI, config: AppConfig) {
  const securityName = `${config.name}Bearer`;
  router.openAPIRegistry.registerComponent("securitySchemes", securityName, {
    type: "http",
    scheme: "bearer",
  });
  return securityName;
}

export function configureAppDocumentation(router: AppOpenAPI, config: AppConfig) {
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

export function createScalarSources(): ScalarSource[] {
  return APP_CONFIG.map((config, i) => ({
    title: config.title,
    slug: config.name,
    url: config.basePath ?? (config.name === API_PUBLIC_NAME
      ? `${API_BASE_PATH}${DOC_ENDPOINT}`
      : `${API_BASE_PATH}/${config.name}${DOC_ENDPOINT}`),
    default: i === 0,
  }));
}

export function createScalarAuthentication(): ScalarAuthentication {
  return {
    securitySchemes: APP_CONFIG.reduce((acc, config) => {
      if (config.token) {
        acc[`${config.name}Bearer`] = { token: config.token };
      }
      return acc;
    }, {} as Record<string, { token: string }>),
  };
}

export function configureSubApplications(apps: Record<AppNameType, AppOpenAPI>) {
  APP_CONFIG.forEach((config) => {
    const router = apps[`${config.name}App` as AppNameType];
    configureAppDocumentation(router, config);
  });
}

export function configureMainDocumentation(app: AppOpenAPI) {
  app.get("/", Scalar({
    ...SCALAR_CONFIG,
    sources: createScalarSources(),
    authentication: createScalarAuthentication(),
  }));
}

export function createMainDocConfigurator(apps: Record<AppNameType, AppOpenAPI>) {
  return (app: AppOpenAPI) => {
    configureSubApplications(apps);
    configureMainDocumentation(app);
  };
}
