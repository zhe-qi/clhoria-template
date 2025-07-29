import type { InferSelectModel } from "drizzle-orm";

import { and, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { casbinRule, systemEndpoint } from "@/db/schema";
import { getDuplicateKeyError } from "@/lib/enums";
import { pagination } from "@/lib/pagination";

import type { SystemEndpointsRouteHandlerType } from "./endpoints.index";

// 查询API端点列表
export const list: SystemEndpointsRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");

  const conditions = [];

  if (params.search) {
    conditions.push(or(
      ilike(systemEndpoint.path, `%${params.search}%`),
      ilike(systemEndpoint.summary, `%${params.search}%`),
      ilike(systemEndpoint.controller, `%${params.search}%`),
    ));
  }

  if (params.method) {
    conditions.push(eq(systemEndpoint.method, params.method));
  }

  if (params.action) {
    conditions.push(ilike(systemEndpoint.action, `%${params.action}%`));
  }

  if (params.resource) {
    conditions.push(ilike(systemEndpoint.resource, `%${params.resource}%`));
  }

  // 组合条件
  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await pagination<InferSelectModel<typeof systemEndpoint>>(
    systemEndpoint,
    whereCondition,
    { page: params.page, limit: params.limit, orderBy: [systemEndpoint.createdAt] },
  );

  return c.json(result, HttpStatusCodes.OK);
};

// 树形结构查询API端点（按资源分组）
export const tree: SystemEndpointsRouteHandlerType<"tree"> = async (c) => {
  const endpoints = await db.select().from(systemEndpoint);

  // 按资源分组构建树形结构
  const resourceGroups = new Map<string, typeof endpoints>();

  endpoints.forEach((endpoint) => {
    if (!resourceGroups.has(endpoint.resource)) {
      resourceGroups.set(endpoint.resource, []);
    }
    resourceGroups.get(endpoint.resource)!.push(endpoint);
  });

  const tree = Array.from(resourceGroups.entries()).map(([resource, children]) => ({
    id: `resource-${resource}`,
    path: `/${resource}`,
    method: "GROUP",
    action: "group",
    resource,
    controller: "ResourceGroup",
    summary: `${resource}资源组`,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    updatedAt: null,
    updatedBy: null,
    children,
  }));

  return c.json(tree, HttpStatusCodes.OK);
};

// 获取角色授权的API端点
export const authEndpoints: SystemEndpointsRouteHandlerType<"authEndpoints"> = async (c) => {
  const { roleCode } = c.req.valid("param");

  // 查询角色拥有的权限规则
  const roleRules = await db
    .select()
    .from(casbinRule)
    .where(
      and(
        eq(casbinRule.ptype, "p"),
        eq(casbinRule.v0, roleCode),
      ),
    );

  if (roleRules.length === 0) {
    return c.json([], HttpStatusCodes.OK);
  }

  // 获取所有API端点
  const allEndpoints = await db.select().from(systemEndpoint);

  // 过滤出角色有权限访问的端点
  const authorizedEndpoints = allEndpoints.filter((endpoint) => {
    return roleRules.some((rule) => {
      // 匹配资源和动作
      return rule.v1 === endpoint.resource && rule.v2 === endpoint.action;
    });
  });

  return c.json(authorizedEndpoints, HttpStatusCodes.OK);
};

// 创建API端点
export const create: SystemEndpointsRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");

  try {
    const [created] = await db.insert(systemEndpoint).values(body).returning();
    return c.json(created, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    if (error.code === "23505") {
      // 唯一约束违反
      return c.json(getDuplicateKeyError("path", "API端点路径已存在"), HttpStatusCodes.CONFLICT);
    }
    throw error;
  }
};

// 获取单个API端点
export const get: SystemEndpointsRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const endpoint = await db.select().from(systemEndpoint).where(eq(systemEndpoint.id, id));

  if (endpoint.length === 0) {
    return c.json({ message: "API端点不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(endpoint[0], HttpStatusCodes.OK);
};

// 更新API端点
export const update: SystemEndpointsRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  try {
    const [updated] = await db
      .update(systemEndpoint)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(systemEndpoint.id, id))
      .returning();

    if (!updated) {
      return c.json({ message: "API端点不存在" }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json(updated, HttpStatusCodes.OK);
  }
  catch (error: any) {
    if (error.code === "23505") {
      return c.json(getDuplicateKeyError("path", "API端点路径已存在"), HttpStatusCodes.CONFLICT);
    }
    throw error;
  }
};

// 删除API端点
export const remove: SystemEndpointsRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const deleted = await db.delete(systemEndpoint).where(eq(systemEndpoint.id, id)).returning();

  if (deleted.length === 0) {
    return c.json({ message: "API端点不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
