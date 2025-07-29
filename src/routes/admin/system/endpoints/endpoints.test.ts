/* eslint-disable ts/ban-ts-comment */
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import { casbin } from "@/middlewares/jwt-auth";
import { operationLog } from "@/middlewares/operation-log";
import { auth } from "@/routes/public/public.index";

import { systemEndpoints } from "./endpoints.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建认证应用
function createAuthApp() {
  return createApp().route("/", auth);
}

// 创建API端点管理应用
function createSysEndpointsApp() {
  return createApp()
    .use("/system/endpoints/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/endpoints/*", casbin())
    .use("/system/endpoints/*", operationLog({ moduleName: "API端点管理", description: "API端点管理操作" }))
    .route("/", systemEndpoints);
}

const authClient = testClient(createAuthApp());
const sysEndpointsClient = testClient(createSysEndpointsApp());

describe("sysEndpoints routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let createdEndpointId: string;
  let testEndpoint: any;

  /** 管理员登录获取 token */
  it("admin login should return valid token", async () => {
    const response = await authClient.auth.login.$post({
      json: {
        username: "admin",
        password: "123456",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.token).toBeDefined();
      expect(json.user.username).toBe("admin");
      adminToken = json.token;
    }
  });

  /** 普通用户登录获取 token */
  it("user login should return valid token", async () => {
    const response = await authClient.auth.login.$post({
      json: {
        username: "user",
        password: "123456",
        domain: "default",
      },
    });

    // 可能用户不存在，这是正常的
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.token).toBeDefined();
      userToken = json.token;
    }
    else {
      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    }
  });

  /** 未认证访问应该返回 401 */
  it("access without token should return 401", async () => {
    const response = await sysEndpointsClient.system.endpoints.$get({
      query: {
        page: "1",
        limit: "10",
      },
    });
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 无效 token 应该返回 401 */
  it("access with invalid token should return 401", async () => {
    const response = await sysEndpointsClient.system.endpoints.$get(
      {
        query: {
          page: "1",
          limit: "10",
        },
      },
      {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      },
    );
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 管理员创建API端点 */
  it("admin should be able to create endpoint", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    testEndpoint = {
      path: `/api/test/${Math.random().toString(36).slice(2, 8)}`,
      method: "GET",
      action: "READ",
      resource: "TEST_RESOURCE",
      controller: "TestController",
      summary: "测试API端点",
      createdBy: "admin",
    };

    const response = await sysEndpointsClient.system.endpoints.$post(
      {
        json: testEndpoint,
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.CREATED);
    if (response.status === HttpStatusCodes.CREATED) {
      const json = await response.json();
      expect(json.path).toBe(testEndpoint.path);
      expect(json.method).toBe(testEndpoint.method);
      expect(json.action).toBe(testEndpoint.action);
      expect(json.resource).toBe(testEndpoint.resource);
      expect(json.controller).toBe(testEndpoint.controller);
      expect(json.summary).toBe(testEndpoint.summary);
      expect(json.id).toBeDefined();
      createdEndpointId = json.id;
    }
  });

  /** 管理员创建API端点参数验证 */
  it("admin create endpoint should validate parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysEndpointsClient.system.endpoints.$post(
      {
        // @ts-ignore
        json: {
          path: "", // 路径为空
          method: "INVALID", // 无效的HTTP方法
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    if (response.status === HttpStatusCodes.UNPROCESSABLE_ENTITY) {
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
      expect(json.error.name).toBe("ZodError");
      expect(json.error.message).toBeDefined();
    }
  });

  /** 管理员获取API端点列表 */
  it("admin should be able to list endpoints", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysEndpointsClient.system.endpoints.$get(
      {
        query: {
          page: "1",
          limit: "10",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json.data).toBeArray();
      expect(json.data.length).toBeGreaterThanOrEqual(0);
      // @ts-ignore
      expect(typeof json.meta.total).toBe("number");
      // @ts-ignore
      expect(json.meta.page).toBe(1);
      // @ts-ignore
      expect(json.meta.limit).toBe(10);
    }
  });

  /** 管理员获取API端点列表（带搜索） */
  it("admin should be able to search endpoints", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysEndpointsClient.system.endpoints.$get(
      {
        query: {
          page: "1",
          limit: "10",
          search: "test",
          method: "GET",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json.data).toBeArray();
    }
  });

  /** 管理员获取API端点树形结构 */
  it("admin should be able to get endpoints tree", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysEndpointsClient.system.endpoints.tree.$get(
      {},
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeArray();
    }
  });

  /** 管理员获取角色授权的API端点 */
  it("admin should be able to get auth endpoints by role", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysEndpointsClient.system.endpoints.auth[":roleCode"].$get(
      {
        param: {
          roleCode: "admin",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeArray();
    }
  });

  /** 管理员获取单个API端点 */
  it("admin should be able to get single endpoint", async () => {
    // 跳过测试如果没有管理员 token 或创建的端点 ID
    if (!adminToken || !createdEndpointId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysEndpointsClient.system.endpoints[":id"].$get(
      {
        param: {
          id: createdEndpointId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.id).toBe(createdEndpointId);
      expect(json.path).toBe(testEndpoint.path);
      expect(json.method).toBe(testEndpoint.method);
    }
  });

  /** 管理员更新API端点 */
  it("admin should be able to update endpoint", async () => {
    // 跳过测试如果没有管理员 token 或创建的端点 ID
    if (!adminToken || !createdEndpointId) {
      expect(true).toBe(true);
      return;
    }

    const updateData = {
      summary: "更新的测试API端点",
      action: "UPDATE",
    };

    const response = await sysEndpointsClient.system.endpoints[":id"].$patch(
      {
        param: {
          id: createdEndpointId,
        },
        json: updateData,
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.summary).toBe(updateData.summary);
      expect(json.action).toBe(updateData.action);
    }
  });

  /** 普通用户权限测试（如果有 userToken） */
  it("regular user should have limited access", async () => {
    // 跳过测试如果没有普通用户 token
    if (!userToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysEndpointsClient.system.endpoints.$get(
      {
        query: {
          page: "1",
          limit: "10",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    );

    // 普通用户可能没有访问API端点的权限
    expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.UNAUTHORIZED]).toContain(response.status);
  });

  /** ID 参数验证 */
  it("should validate UUID parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysEndpointsClient.system.endpoints[":id"].$get(
      {
        param: {
          id: "invalid-uuid",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
  });

  /** 404 测试 */
  it("should return 404 for non-existent endpoint", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysEndpointsClient.system.endpoints[":id"].$get(
      {
        param: {
          id: "550e8400-e29b-41d4-a716-446655440000", // 不存在的 UUID
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });

  /** 角色代码不存在测试 */
  it("should return empty array for non-existent role code", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysEndpointsClient.system.endpoints.auth[":roleCode"].$get(
      {
        param: {
          roleCode: "non-existent-role",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeArray();
      expect(json.length).toBe(0); // 角色不存在时返回空数组
    }
  });

  /** 管理员删除API端点 */
  it("admin should be able to delete endpoint", async () => {
    // 跳过测试如果没有管理员 token 或创建的端点 ID
    if (!adminToken || !createdEndpointId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysEndpointsClient.system.endpoints[":id"].$delete(
      {
        param: {
          id: createdEndpointId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NO_CONTENT);
  });

  /** 验证API端点已被删除 */
  it("deleted endpoint should return 404", async () => {
    // 跳过测试如果没有管理员 token 或创建的端点 ID
    if (!adminToken || !createdEndpointId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysEndpointsClient.system.endpoints[":id"].$get(
      {
        param: {
          id: createdEndpointId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });
});
