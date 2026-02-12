import { defineConfig } from "@/lib/internal/define-config";

export default defineConfig({
  prefix: "/api",

  openapi: {
    enabled: env => env.NODE_ENV !== "production",
    docEndpoint: "/doc",
    scalar: {
      theme: "kepler",
      layout: "modern",
      defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
    },
  },

  tiers: [
    { name: "public", title: "公共API文档" },
    { name: "client", title: "客户端API文档", token: "your-client-token" },
    { name: "admin", title: "管理端API文档", token: "your-admin-token" },
  ],
});
