import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";

import type { AppOpenAPI } from "@/types/lib";

import db from "@/db";
import { sysEndpoint } from "@/db/schema/system/sys-endpoint";

export interface EndpointInfo {
  id: string;
  path: string;
  method: string;
  action: string;
  resource: string;
  controller: string;
  summary?: string;
}

/**
 * 从路径和方法提取资源和动作
 * 使用基于路径模式的智能匹配
 */
function extractResourceAndAction(path: string, method: string): { resource: string; action: string } {
  // 移除查询参数
  const cleanPath = path.replace(/\?.*$/, "");

  // 路径模式匹配规则
  const pathPatterns: Array<{ pattern: RegExp; resource: string; actionMap: Record<string, string> }> = [
    // 用户管理
    {
      pattern: /^\/admin\/sys-users(?:\/[\w-]+)?(?:\/(status|password))?$/,
      resource: "sys-users",
      actionMap: {
        "GET": "read",
        "POST": "create",
        "PATCH": "update",
        "DELETE": "delete",
        "PATCH-status": "change-status",
        "PATCH-password": "reset-password",
      },
    },
    // 角色管理
    {
      pattern: /^\/admin\/sys-roles(?:\/[\w-]+)?(?:\/(status|permissions|menus))?$/,
      resource: "sys-roles",
      actionMap: {
        "GET": "read",
        "POST": "create",
        "PATCH": "update",
        "DELETE": "delete",
        "PATCH-status": "change-status",
        "POST-permissions": "assign-permissions",
        "POST-menus": "assign-routes",
      },
    },
    // 菜单管理
    {
      pattern: /^\/admin\/sys-menus(?:\/[\w-]+)?(?:\/(status))?$/,
      resource: "sys-menus",
      actionMap: {
        "GET": "read",
        "POST": "create",
        "PATCH": "update",
        "DELETE": "delete",
        "PATCH-status": "change-status",
      },
    },
    // 域管理
    {
      pattern: /^\/admin\/sys-domains(?:\/[\w-]+)?(?:\/(status))?$/,
      resource: "sys-domains",
      actionMap: {
        "GET": "read",
        "POST": "create",
        "PATCH": "update",
        "DELETE": "delete",
        "PATCH-status": "change-status",
      },
    },
    // 端点管理
    {
      pattern: /^\/admin\/sys-endpoints(?:\/[\w-]+)?$/,
      resource: "sys-endpoints",
      actionMap: {
        GET: "read",
        PATCH: "update",
      },
    },
    // 访问密钥管理
    {
      pattern: /^\/admin\/sys-access-keys(?:\/[\w-]+)?(?:\/(status))?$/,
      resource: "sys-access-keys",
      actionMap: {
        "GET": "read",
        "POST": "create",
        "DELETE": "delete",
        "PATCH-status": "change-status",
      },
    },
    // 授权管理
    {
      pattern: /^\/admin\/authorization\/(?:roles\/[\w-]+\/(permissions|routes|menus)|users\/[\w-]+\/routes)$/,
      resource: "authorization",
      actionMap: {
        "POST-permissions": "assign-permissions",
        "POST-routes": "assign-routes",
        "POST-users": "assign-users",
        "GET-routes": "get-user-routes",
        "GET-permissions": "get-role-permissions",
        "GET-menus": "get-role-menus",
      },
    },
    // 登录日志
    {
      pattern: /^\/admin\/login-log$/,
      resource: "login-log",
      actionMap: {
        GET: "read",
      },
    },
    // 操作日志
    {
      pattern: /^\/admin\/operation-log$/,
      resource: "operation-log",
      actionMap: {
        GET: "read",
      },
    },
    // API密钥管理
    {
      pattern: /^\/admin\/api-keys(?:\/[\w-]+)?(?:\/(status))?$/,
      resource: "api-keys",
      actionMap: {
        "GET": "read",
        "POST": "create",
        "DELETE": "delete",
        "PATCH-status": "change-status",
      },
    },
  ];

  // 尝试匹配路径模式
  for (const { pattern, resource, actionMap } of pathPatterns) {
    const match = cleanPath.match(pattern);
    if (match) {
      const subPath = match[1]; // 子路径（如 status, permissions 等）
      const actionKey = subPath ? `${method}-${subPath}` : method;
      const action = actionMap[actionKey] || actionMap[method];

      if (action) {
        return { resource, action };
      }
    }
  }

  // 如果没有匹配到，使用默认的方法映射
  const defaultActionMap: Record<string, string> = {
    GET: "read",
    POST: "create",
    PUT: "update",
    PATCH: "update",
    DELETE: "delete",
    HEAD: "read",
    OPTIONS: "read",
  };

  // 从路径中提取资源名称（最后一个非参数部分）
  const pathParts = cleanPath.split("/").filter(Boolean);
  const resource = pathParts[pathParts.length - 1] || "root";

  return {
    resource,
    action: defaultActionMap[method] || "access",
  };
}

/**
 * 从 Hono 应用中收集端点信息
 */
export function collectEndpoints(app: AppOpenAPI, prefix = ""): EndpointInfo[] {
  const endpoints: EndpointInfo[] = [];

  try {
    // 从 OpenAPI 注册表获取路由信息
    const registry = app.openAPIRegistry;
    const routes = registry.definitions;

    for (const definition of routes) {
      if (definition.type === "route") {
        const { path, method } = definition.route;

        // 跳过中间件和内部路由
        if (!method)
          continue;

        const fullPath = prefix + path;
        const { resource, action } = extractResourceAndAction(fullPath, method);

        // 生成唯一ID
        const id = createHash("md5")
          .update(JSON.stringify({ path: fullPath, method, action, resource }))
          .digest("hex");

        // 从路由信息推断控制器
        const controller = definition.route.tags?.[0] || "unknown";

        // 获取 OpenAPI 描述
        const summary = definition.route.summary || "";

        endpoints.push({
          id,
          path: fullPath,
          method,
          action,
          resource,
          controller,
          summary,
        });
      }
    }
  }
  catch (error) {
    console.error("Error collecting endpoints:", error);
    try {
      const routes = app.routes;
      for (const route of routes) {
        const { path, method, handler } = route;

        if (!method)
          continue;

        const fullPath = prefix + path;
        const { resource, action } = extractResourceAndAction(fullPath, method);

        const id = createHash("md5")
          .update(JSON.stringify({ path: fullPath, method, action, resource }))
          .digest("hex");

        const controller = handler?.name || "unknown";

        endpoints.push({
          id,
          path: fullPath,
          method,
          action,
          resource,
          controller,
          summary: "",
        });
      }
    }
    catch (fallbackError) {
      console.error("Fallback route collection also failed:", fallbackError);
    }
  }

  return endpoints;
}

/**
 * 同步端点到数据库
 */
export async function syncEndpointsToDatabase(endpoints: EndpointInfo[]) {
  if (endpoints.length === 0)
    return { inserted: 0, updated: 0 };

  return db.transaction(async (tx) => {
    // 获取现有端点
    const existing = await tx.select().from(sysEndpoint);
    const existingMap = new Map(
      existing.map(e => [`${e.method}:${e.path}`, e]),
    );

    let inserted = 0;
    let updated = 0;

    for (const endpoint of endpoints) {
      const key = `${endpoint.method}:${endpoint.path}`;
      const existingEndpoint = existingMap.get(key);

      if (!existingEndpoint) {
        // 插入新端点
        await tx.insert(sysEndpoint).values({
          path: endpoint.path,
          method: endpoint.method,
          action: endpoint.action,
          resource: endpoint.resource,
          controller: endpoint.controller,
          summary: endpoint.summary,
        });
        inserted++;
      }
      else if (
        existingEndpoint.action !== endpoint.action
        || existingEndpoint.resource !== endpoint.resource
        || existingEndpoint.controller !== endpoint.controller
        || existingEndpoint.summary !== endpoint.summary
      ) {
        // 更新现有端点
        await tx
          .update(sysEndpoint)
          .set({
            action: endpoint.action,
            resource: endpoint.resource,
            controller: endpoint.controller,
            summary: endpoint.summary,
          })
          .where(eq(sysEndpoint.id, existingEndpoint.id));
        updated++;
      }
    }

    return { inserted, updated };
  });
}

/**
 * 完整的端点收集和同步流程
 */
export async function collectAndSyncEndpoints(apps: { name: string; app: AppOpenAPI; prefix?: string }[]) {
  const allEndpoints: EndpointInfo[] = [];

  for (const { app, prefix } of apps) {
    const endpoints = collectEndpoints(app, prefix);
    allEndpoints.push(...endpoints);
  }

  if (allEndpoints.length > 0) {
    const result = await syncEndpointsToDatabase(allEndpoints);
    // eslint-disable-next-line no-console
    console.log(`端点同步完成: 新增 ${result.inserted}, 更新 ${result.updated}`);
    return result;
  }

  return { inserted: 0, updated: 0 };
}
