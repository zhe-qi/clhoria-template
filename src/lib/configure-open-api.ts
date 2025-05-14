import { Scalar } from "@scalar/hono-api-reference";

import type { AppOpenAPI } from "@/types/lib";

import packageJSON from "../../package.json" with { type: "json" };

export default function configureOpenAPI(app: AppOpenAPI) {
  app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
    type: "http",
    scheme: "bearer",
  });

  app.doc("/doc", {
    openapi: "3.1.0",
    info: {
      version: packageJSON.version,
      title: "API接口文档",
    },
    security: [
      {
        Bearer: [],
      },
    ],
  });

  app.get(
    "/reference",
    Scalar({
      theme: "kepler",
      url: "/doc",
      layout: "modern",
      defaultHttpClient: {
        targetKey: "js",
        clientKey: "fetch",
      },
      authentication: {
        securitySchemes: {
          Bearer: {
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxOTZjZDMwLWVkMmItNzQzMS1hYjg0LWJkYTJkMDljZTRjNCIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlcyI6WyJhZG1pbiJdfQ.WeqAZNJ9QbklI4pNCk2EA4qyhx-AlfWNiHqU3u6GCHI",
          },
        },
      },
    }),
  );
}
