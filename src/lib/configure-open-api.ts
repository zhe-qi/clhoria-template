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
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxOTZiODIzLTNkZTgtNzFjNC05MjAxLTcyMGY4ZGVmNzgwNyIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4ifQ.fyEF6IcKlocfkh8MWGG8hqnuFExPUyRXs1_3EqOpWMQ",
          },
        },
      },
    }),
  );
}
