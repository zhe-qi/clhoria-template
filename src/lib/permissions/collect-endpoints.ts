/* eslint-disable no-console */
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";

import type { AppOpenAPI } from "@/types/lib";

import db from "@/db";
import { sysEndpoint } from "@/db/schema/system/sys-endpoint";

import type { EndpointPermission } from "./permission-config";

import { PermissionConfigManager } from "./permission-config";
import { extractPermissionFromRoute } from "./permission-inference";

export interface EndpointInfo {
  id: string;
  path: string;
  method: string;
  action: string;
  resource: string;
  controller: string;
  summary?: string;
  operationId?: string;
}

/**
 * 从 Hono 应用中收集端点权限信息
 * 新的实现基于权限推断机制
 */
export function collectEndpointPermissions(app: AppOpenAPI, prefix = ""): EndpointPermission[] {
  const endpoints: EndpointPermission[] = [];
  const permissionManager = PermissionConfigManager.getInstance();

  try {
    // 从 OpenAPI 注册表获取路由信息
    const registry = app.openAPIRegistry;
    const routes = registry.definitions;

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
          console.log(`跳过无权限配置的端点: ${method} ${fullPath} (operationId: ${operationId})`);
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
  }
  catch (error) {
    console.error("Error collecting endpoint permissions:", error);

    // 降级处理：尝试从应用路由中收集
    try {
      const routes = app.routes || [];

      for (const route of routes) {
        const { path, method, handler } = route;

        if (!method)
          continue;

        const fullPath = prefix + path;

        // 尝试从处理器中提取权限信息
        const permissionConfig = (handler as any)?.__permission;

        if (!permissionConfig) {
          continue;
        }

        const endpointId = createHash("md5")
          .update(JSON.stringify({
            path: fullPath,
            method,
            resource: permissionConfig.resource,
            action: permissionConfig.action,
          }))
          .digest("hex");

        const controller = handler?.name || "unknown";

        const endpointPermission: EndpointPermission = {
          id: endpointId,
          path: fullPath,
          method: method.toUpperCase(),
          resource: permissionConfig.resource,
          action: permissionConfig.action,
          controller,
          summary: "",
          operationId: "",
        };

        endpoints.push(endpointPermission);
        permissionManager.registerEndpointPermission(endpointPermission);
      }
    }
    catch (fallbackError) {
      console.error("Fallback endpoint collection also failed:", fallbackError);
    }
  }

  return endpoints;
}

/**
 * 向后兼容的端点收集函数
 * 将新的权限端点转换为旧的端点信息格式
 */
export function collectEndpoints(app: AppOpenAPI, prefix = ""): EndpointInfo[] {
  const endpointPermissions = collectEndpointPermissions(app, prefix);

  return endpointPermissions.map(ep => ({
    id: ep.id,
    path: ep.path,
    method: ep.method,
    action: ep.action,
    resource: ep.resource,
    controller: ep.controller,
    summary: ep.summary,
    operationId: ep.operationId,
  }));
}

/**
 * 同步端点权限到数据库
 * 新的实现支持 EndpointPermission 类型
 */
export async function syncEndpointPermissionsToDatabase(endpoints: EndpointPermission[]) {
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
          createdBy: "system",
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
            updatedBy: "system",
          })
          .where(eq(sysEndpoint.id, existingEndpoint.id));
        updated++;
      }
    }

    return { inserted, updated };
  });
}

/**
 * 向后兼容的同步函数
 */
export async function syncEndpointsToDatabase(endpoints: EndpointInfo[]) {
  // 转换为 EndpointPermission 格式
  const endpointPermissions: EndpointPermission[] = endpoints.map(ep => ({
    id: ep.id,
    path: ep.path,
    method: ep.method,
    resource: ep.resource as any,
    action: ep.action as any,
    controller: ep.controller,
    summary: ep.summary,
    operationId: ep.operationId,
  }));

  return syncEndpointPermissionsToDatabase(endpointPermissions);
}

/**
 * 完整的端点权限收集和同步流程
 * 新的实现使用权限推断机制
 */
export async function collectAndSyncEndpointPermissions(apps: { name: string; app: AppOpenAPI; prefix?: string }[]) {
  const allEndpoints: EndpointPermission[] = [];
  const permissionManager = PermissionConfigManager.getInstance();

  // 清空之前的权限缓存
  permissionManager.clearAll();

  for (const { name, app, prefix } of apps) {
    console.log(`开始收集应用 ${name} 的端点权限...`);
    const endpoints = collectEndpointPermissions(app, prefix);
    allEndpoints.push(...endpoints);
    console.log(`应用 ${name} 收集到 ${endpoints.length} 个端点`);
  }

  if (allEndpoints.length > 0) {
    const result = await syncEndpointPermissionsToDatabase(allEndpoints);
    console.log(`端点权限同步完成: 新增 ${result.inserted}, 更新 ${result.updated}`);
    console.log(`权限管理器缓存统计:`, permissionManager.getStats());
    return result;
  }

  console.log("未发现任何端点权限配置");
  return { inserted: 0, updated: 0 };
}

/**
 * 向后兼容的端点收集和同步流程
 */
export async function collectAndSyncEndpoints(apps: { name: string; app: AppOpenAPI; prefix?: string }[]) {
  const allEndpoints: EndpointInfo[] = [];

  for (const { app, prefix } of apps) {
    const endpoints = collectEndpoints(app, prefix);
    allEndpoints.push(...endpoints);
  }

  if (allEndpoints.length > 0) {
    const result = await syncEndpointsToDatabase(allEndpoints);
    console.log(`端点同步完成: 新增 ${result.inserted}, 更新 ${result.updated}`);
    return result;
  }

  return { inserted: 0, updated: 0 };
}
