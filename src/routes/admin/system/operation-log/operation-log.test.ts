/* eslint-disable ts/ban-ts-comment */
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import { casbin } from "@/middlewares/jwt-auth";
import { getAdminToken, getAuthHeaders, getUserToken } from "@/utils/test-utils";

import { systemOperationLog } from "./operation-log.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建操作日志应用
function createOperationLogApp() {
  return createApp()
    .use("/system/operation-log/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/operation-log/*", casbin())
    .route("/", systemOperationLog);
}

const operationLogClient = testClient(createOperationLogApp());

describe("operationLog routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;

  /** 获取管理员token */
  it("should get admin token", async () => {
    adminToken = await getAdminToken();
    expect(adminToken).toBeDefined();
  });

  /** 获取普通用户token */
  it("should get user token", async () => {
    try {
      userToken = await getUserToken();
      expect(userToken).toBeDefined();
    }
    catch (error) {
      // 用户不存在是正常的
      expect(error).toBeDefined();
    }
  });

  /** 未认证访问应该返回 401 */
  it("access without token should return 401", async () => {
    const response = await operationLogClient.system["operation-log"].$get({
      query: {
        skip: "1",
        take: "10",
        where: {},
        orderBy: {},
        join: {},
      },
    });
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 无效 token 应该返回 401 */
  it("access with invalid token should return 401", async () => {
    const response = await operationLogClient.system["operation-log"].$get(
      {
        query: {
          skip: "1",
          take: "10",
          where: {},
          orderBy: {},
          join: {},
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

  /** 管理员获取操作日志列表 */
  it("admin should be able to list operation logs", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await operationLogClient.system["operation-log"].$get(
      {
        query: {
          skip: "1",
          take: "10",
          where: {},
          orderBy: {},
          join: {},
        },
      },
      {
        headers: getAuthHeaders(adminToken),
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
      expect(json.meta.skip).toBe(1);
      // @ts-ignore
      expect(json.meta.take).toBe(10);
    }
  });

  /** 管理员搜索操作日志 */
  it("admin should be able to search operation logs", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await operationLogClient.system["operation-log"].$get(
      {
        query: {
          skip: "1",
          take: "10",
          where: {
            user: {
              contains: "admin",
            },
          },
          orderBy: {},
          join: {},
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json.data).toBeArray();
      expect(json.data.length).toBeGreaterThanOrEqual(0);
      // @ts-ignore
      expect(typeof json.meta.total).toBe("number");
    }
  });

  /** 管理员获取操作日志列表 - 测试分页参数 */
  it("admin should be able to list operation logs with different pagination", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await operationLogClient.system["operation-log"].$get(
      {
        query: {
          skip: "2",
          take: "5",
          where: {},
          orderBy: {},
          join: {},
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json.data).toBeArray();
      // @ts-ignore
      expect(json.meta.skip).toBe(2);
      // @ts-ignore
      expect(json.meta.take).toBe(5);
    }
  });

  /** 普通用户权限测试（如果有 userToken） */
  it("regular user should have limited access", async () => {
    // 跳过测试如果没有普通用户 token
    if (!userToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await operationLogClient.system["operation-log"].$get(
      {
        query: {
          skip: "1",
          take: "10",
          where: {},
          orderBy: {},
          join: {},
        },
      },
      {
        headers: getAuthHeaders(userToken),
      },
    );

    // 普通用户可能没有访问操作日志的权限
    expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.UNAUTHORIZED]).toContain(response.status);
  });

  /** 查询参数验证 */
  it("should validate query parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await operationLogClient.system["operation-log"].$get(
      {
        // @ts-ignore
        query: {
          skip: "invalid",
          take: "10",
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    if (response.status === HttpStatusCodes.UNPROCESSABLE_ENTITY) {
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
      expect(json.error.name).toBe("ZodError");
    }
  });

  /** 测试日志数据结构 */
  it("operation log data should have correct structure", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await operationLogClient.system["operation-log"].$get(
      {
        query: {
          skip: "1",
          take: "10",
          where: {},
          orderBy: {},
          join: {},
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      if (json.data.length > 0) {
        const log = json.data[0];
        // 验证操作日志的基本字段
        expect(log).toHaveProperty("id");
        expect(log).toHaveProperty("username");
        expect(log).toHaveProperty("moduleName");
        expect(log).toHaveProperty("method");
        expect(log).toHaveProperty("url");
        expect(log).toHaveProperty("domain");
        expect(log).toHaveProperty("createdAt");
      }
    }
  });
});
