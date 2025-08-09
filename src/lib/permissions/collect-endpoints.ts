import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";

import type { AppOpenAPI } from "@/types/lib";

import db from "@/db";
import { systemEndpoint } from "@/db/schema/system/endpoint";
import { logger } from "@/lib/logger";
import { compareObjects } from "@/utils";

import type { EndpointPermission } from "./permission-config";

import { PermissionConfigManager } from "./permission-config";
import { extractPermissionFromRoute } from "./permission-inference";

/**
 * 从 Hono 应用中收集端点权限信息
 */
export function collectEndpointPermissions(app: AppOpenAPI, prefix = ""): EndpointPermission[] {
  const endpoints: EndpointPermission[] = [];
  const permissionManager = PermissionConfigManager.getInstance();

  try {
    // 从 OpenAPI 注册表获取路由信息
    const registry = app.openAPIRegistry;
    const routes = registry.definitions;

    const loggers: Set<string> = new Set();

    for (const definition of routes) {
      if (definition.type === "route") {
        const route = definition.route;
        const { path, method, operationId, summary, tags } = route;

        // 跳过中间件和内部路由
        if (!method)
          continue;

        const fullPath = prefix + path;

        // 尝试从路由定义中提取权限配置
        const permissionConfig = extractPermissionFromRoute(route);

        // 如果无法提取权限配置，跳过该端点（可能是公开接口）
        if (!permissionConfig) {
          loggers.add(fullPath);
          continue;
        }

        // 生成唯一ID
        const endpointId = createHash("md5")
          .update(JSON.stringify({
            path: fullPath,
            method,
            resource: permissionConfig.resource,
            action: permissionConfig.action,
          }))
          .digest("hex");

        // 从路由信息推断控制器
        const controller = tags?.[0]?.replace(/^\/|[\s()]/g, "") || "unknown";

        const endpointPermission: EndpointPermission = {
          id: endpointId,
          path: fullPath,
          method: method.toUpperCase(),
          resource: permissionConfig.resource,
          action: permissionConfig.action,
          controller,
          summary: summary || "",
          operationId: operationId || "",
        };

        endpoints.push(endpointPermission);

        // 注册到权限管理器
        permissionManager.registerEndpointPermission(endpointPermission);
      }
    }

    if (loggers.size > 0) {
      logger.info({
        endpoints: Array.from(loggers).join("、"),
      }, "收集到以下公开端点权限配置:");
    }
  }
  catch (error) {
    logger.error({ error }, "Error collecting endpoint permissions");
  }

  return endpoints;
}

/**
 * 同步端点权限到数据库
 */
export async function syncEndpointPermissionsToDatabase(endpoints: EndpointPermission[]) {
  if (endpoints.length < 1)
    return { inserted: 0, updated: 0 };

  return db.transaction(async (tx) => {
    // 获取现有端点
    const existing = await tx.select().from(systemEndpoint);
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
        await tx.insert(systemEndpoint).values({
          path: endpoint.path,
          method: endpoint.method,
          action: endpoint.action,
          resource: endpoint.resource,
          controller: endpoint.controller,
          summary: endpoint.summary,
          createdBy: "system",
        });
        inserted++;
      }
      else if (compareObjects(
        existingEndpoint,
        endpoint as unknown as Record<string, any>,
        ["action", "resource", "controller", "summary"],
      )) {
        // 更新现有端点
        await tx
          .update(systemEndpoint)
          .set({
            action: endpoint.action,
            resource: endpoint.resource,
            controller: endpoint.controller,
            summary: endpoint.summary,
            updatedBy: "system",
          })
          .where(eq(systemEndpoint.id, existingEndpoint.id));
        updated++;
      }
    }

    return { inserted, updated };
  });
}

/**
 * 完整的端点权限收集和同步流程
 */
export async function collectAndSyncEndpointPermissions(apps: { name: string; app: AppOpenAPI; prefix?: string }[]) {
  const allEndpoints: EndpointPermission[] = [];
  const permissionManager = PermissionConfigManager.getInstance();

  // 清空之前的权限缓存
  permissionManager.clearAll();

  for (const { app, prefix } of apps) {
    const endpoints = collectEndpointPermissions(app, prefix);
    allEndpoints.push(...endpoints);
  }

  if (allEndpoints.length > 0) {
    const result = await syncEndpointPermissionsToDatabase(allEndpoints);
    logger.info(`端点权限同步完成: 新增 ${result.inserted}, 更新 ${result.updated}`);
    return result;
  }

  logger.info("未发现任何端点权限配置");
  return { inserted: 0, updated: 0 };
}
