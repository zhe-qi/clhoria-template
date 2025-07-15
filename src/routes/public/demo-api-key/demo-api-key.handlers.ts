import type { DemoApiKeyRouteHandlerType } from "./demo-api-key.index";

export const protectedRoute: DemoApiKeyRouteHandlerType<"protectedRoute"> = async (c) => {
  const apiKey = c.get("apiKey") as string;
  
  return c.json({
    message: "成功访问受保护的端点！",
    apiKey: apiKey || "unknown",
    timestamp: new Date().toISOString(),
  });
};

export const publicRoute: DemoApiKeyRouteHandlerType<"publicRoute"> = async (c) => {
  return c.json({
    message: "这是一个公开端点，无需 API Key",
    timestamp: new Date().toISOString(),
  });
};