import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { casbin } from "@/middlewares/jwt-auth";
import { getAdminToken, getAuthHeaders } from "@/utils/test-utils";

import { systemEndpoints } from "./endpoints.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建API端点管理应用
function createSysEndpointsApp() {
  return createApp()
    .use("/system/endpoints/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/endpoints/*", casbin())
    .route("/", systemEndpoints);
}

const sysEndpointsClient = testClient(createSysEndpointsApp());

describe("系统端点管理", () => {
  let adminToken: string;
  let createdEndpointId: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  describe("身份认证", () => {
    /** 未认证访问应该返回 401 */
    it("无token访问返回401", async () => {
      const response = await sysEndpointsClient.system.endpoints.$get({
        query: { skip: "0", take: "10", where: {}, orderBy: {}, join: {} },
      });
      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });

    /** 无效 token 应该返回 401 */
    it("无效token访问返回401", async () => {
      const response = await sysEndpointsClient.system.endpoints.$get(
        { query: { skip: "0", take: "10", where: {}, orderBy: {}, join: {} } },
        { headers: { Authorization: "Bearer invalid-token" } },
      );
      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });
  });

  describe("端点CRUD操作", () => {
    const testEndpoint = {
      path: `/api/test/${Math.random().toString(36).slice(2, 8)}`,
      method: "GET",
      action: "READ",
      resource: "TEST_RESOURCE",
      controller: "TestController",
      summary: "测试API端点",
      createdBy: "admin",
    };

    /** 创建端点 */
    it("管理员创建端点", async () => {
      const response = await sysEndpointsClient.system.endpoints.$post(
        { json: testEndpoint },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);
      if (response.status === HttpStatusCodes.CREATED) {
        const json = await response.json();
        expect(json.path).toBe(testEndpoint.path);
        expect(json.method).toBe(testEndpoint.method);
        expect(json.action).toBe(testEndpoint.action);
        expect(json.id).toBeDefined();
        createdEndpointId = json.id;
      }
    });

    /** 参数验证 */
    it("创建端点参数验证", async () => {
      const response = await sysEndpointsClient.system.endpoints.$post(
        {
          json: {
            path: "", // 路径为空
            method: "INVALID", // 无效的HTTP方法
          } as any,
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
      if (response.status === HttpStatusCodes.UNPROCESSABLE_ENTITY) {
        const json = await response.json();
        expect(json.success).toBe(false);
        expect(json.error.name).toBe("ZodError");
      }
    });

    /** 获取端点详情 */
    it("获取端点详情", async () => {
      const response = await sysEndpointsClient.system.endpoints[":id"].$get(
        { param: { id: createdEndpointId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.id).toBe(createdEndpointId);
        expect(json.path).toBe(testEndpoint.path);
      }
    });

    /** 更新端点 */
    it("更新端点", async () => {
      const updateData = { summary: "更新的测试API端点", action: "UPDATE" };

      const response = await sysEndpointsClient.system.endpoints[":id"].$patch(
        { param: { id: createdEndpointId }, json: updateData },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.summary).toBe(updateData.summary);
        expect(json.action).toBe(updateData.action);
      }
    });

    /** 删除端点 */
    it("删除端点", async () => {
      const response = await sysEndpointsClient.system.endpoints[":id"].$delete(
        { param: { id: createdEndpointId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NO_CONTENT);
    });

    /** 验证删除结果 */
    it("删除后查询返回404", async () => {
      const response = await sysEndpointsClient.system.endpoints[":id"].$get(
        { param: { id: createdEndpointId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });
  });

  describe("端点查询功能", () => {
    /** 获取端点列表 */
    it("获取端点列表", async () => {
      const response = await sysEndpointsClient.system.endpoints.$get(
        { query: { skip: "0", take: "10", where: {}, orderBy: {}, join: {} } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expectTypeOf(json.data).toBeArray();
        expect(json.meta.skip).toBe(0);
        expect(json.meta.take).toBe(10);
        expect(typeof json.meta.total).toBe("number");
      }
    });

    /** 搜索端点 */
    it("搜索端点", async () => {
      const response = await sysEndpointsClient.system.endpoints.$get(
        {
          query: {
            skip: "0",
            take: "10",
            where: { path: { contains: "system" }, method: "GET" },
            orderBy: {},
            join: {},
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expectTypeOf(json.data).toBeArray();
      }
    });

    /** 获取端点树形结构 */
    it("获取端点树形结构", async () => {
      const response = await sysEndpointsClient.system.endpoints.tree.$get(
        {},
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      const json = await response.json();
      expectTypeOf(json).toBeArray();
    });

    /** 获取角色授权端点 */
    it("获取角色授权端点", async () => {
      const response = await sysEndpointsClient.system.endpoints.auth[":roleCode"].$get(
        { param: { roleCode: "admin" } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expectTypeOf(json).toBeArray();
      }
    });
  });

  describe("错误处理", () => {
    /** UUID参数验证 */
    it("uUID参数验证", async () => {
      const response = await sysEndpointsClient.system.endpoints[":id"].$get(
        { param: { id: "invalid-uuid" } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    /** 不存在的端点 */
    it("查询不存在的端点返回404", async () => {
      const response = await sysEndpointsClient.system.endpoints[":id"].$get(
        { param: { id: "550e8400-e29b-41d4-a716-446655440000" } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });

    /** 不存在的角色 */
    it("不存在的角色返回空数组", async () => {
      const response = await sysEndpointsClient.system.endpoints.auth[":roleCode"].$get(
        { param: { roleCode: "non-existent-role" } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expectTypeOf(json).toBeArray();
        expect(json.length).toBe(0);
      }
    });
  });
});
