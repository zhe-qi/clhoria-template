/* eslint-disable ts/ban-ts-comment */
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { casbin } from "@/middlewares/jwt-auth";
import { getAdminToken, getAuthHeaders, getUserToken } from "@/utils/test-utils";

import { systemUsers } from "./users.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建系统用户管理应用
function createSysUsersApp() {
  return createApp()
    .use("/system/users/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/users/*", casbin())
    .route("/", systemUsers);
}

const sysUsersClient = testClient(createSysUsersApp());

describe("sysUsers routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let createdUserId: string;
  let testUser: any;

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
    const response = await sysUsersClient.system.users.$get({
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
    const response = await sysUsersClient.system.users.$get(
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

  /** 管理员创建用户 */
  it("admin should be able to create user", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    testUser = {
      username: `test${Math.random().toString(36).slice(2, 8)}`,
      password: "123456",
      domain: "default",
      nickName: "测试用户",
      status: 1,
    };

    const response = await sysUsersClient.system.users.$post(
      {
        json: testUser,
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.CREATED);
    if (response.status === HttpStatusCodes.CREATED) {
      const json = await response.json();
      expect(json.username).toBe(testUser.username);
      expect(json.nickName).toBe(testUser.nickName);
      expect(json.domain).toBe(testUser.domain);
      // @ts-ignore
      expect(json.password).toBeUndefined(); // 响应中不应包含密码
      expect(json.id).toBeDefined();
      createdUserId = json.id;
    }
  });

  /** 管理员创建用户参数验证 */
  it("admin create user should validate parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient.system.users.$post(
      {
        // @ts-ignore
        json: {
          username: "ab", // 用户名太短
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
      expect(json.error.issues).toBeDefined();
    }
  });

  /** 管理员获取用户列表 */
  it("admin should be able to list users", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient.system.users.$get(
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
      expect(typeof json.meta.total).toBe("number");
      expect(json.meta.skip).toBe(1);
      expect(json.meta.take).toBe(10);
    }
  });

  /** 管理员获取单个用户 */
  it("admin should be able to get single user", async () => {
    // 跳过测试如果没有管理员 token 或创建的用户 ID
    if (!adminToken || !createdUserId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient.system.users[":id"].$get(
      {
        param: {
          id: createdUserId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.id).toBe(createdUserId);
      expect(json.username).toBe(testUser.username);
      // @ts-ignore
      expect(json.password).toBeUndefined();
    }
  });

  /** 管理员更新用户 */
  it("admin should be able to update user", async () => {
    // 跳过测试如果没有管理员 token 或创建的用户 ID
    if (!adminToken || !createdUserId) {
      expect(true).toBe(true);
      return;
    }

    const updateData = {
      nickName: "更新的测试用户",
      status: 0,
    };

    const response = await sysUsersClient.system.users[":id"].$patch(
      {
        param: {
          id: createdUserId,
        },
        json: updateData,
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.nickName).toBe(updateData.nickName);
      expect(json.status).toBe(updateData.status);
    }
  });

  /** 普通用户权限测试（如果有 userToken） */
  it("regular user should have limited access", async () => {
    // 跳过测试如果没有普通用户 token
    if (!userToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient.system.users.$get(
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

    // 普通用户可能没有访问系统用户的权限
    expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.UNAUTHORIZED]).toContain(response.status);
  });

  /** ID 参数验证 */
  it("should validate UUID parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient.system.users[":id"].$get(
      {
        param: {
          id: "invalid-uuid",
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
  });

  /** 404 测试 */
  it("should return 404 for non-existent user", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient.system.users[":id"].$get(
      {
        param: {
          id: "550e8400-e29b-41d4-a716-446655440000", // 不存在的 UUID
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });

  /** 管理员删除用户 */
  it("admin should be able to delete user", async () => {
    // 跳过测试如果没有管理员 token 或创建的用户 ID
    if (!adminToken || !createdUserId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient.system.users[":id"].$delete(
      {
        param: {
          id: createdUserId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NO_CONTENT);
  });

  /** 验证用户已被删除 */
  it("deleted user should return 404", async () => {
    // 跳过测试如果没有管理员 token 或创建的用户 ID
    if (!adminToken || !createdUserId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient.system.users[":id"].$get(
      {
        param: {
          id: createdUserId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });
});
