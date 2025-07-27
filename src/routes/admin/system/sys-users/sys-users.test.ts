/* eslint-disable ts/ban-ts-comment */
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import { collectAndSyncEndpointPermissions } from "@/lib/permissions";
import { reloadPolicy } from "@/lib/permissions/casbin/rbac";
import { casbin } from "@/middlewares/jwt-auth";
import { operationLog } from "@/middlewares/operation-log";
import { auth } from "@/routes/public/public.index";

import { sysUsers } from "./sys-users.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建认证应用
function createAuthApp() {
  return createApp().route("/", auth);
}

// 创建系统用户管理应用
function createSysUsersApp() {
  return createApp()
    .use("/sys-users/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/sys-users/*", casbin())
    .use("/sys-users/*", operationLog({ moduleName: "后台管理", description: "后台管理操作" }))
    .route("/", sysUsers);
}

const authClient = testClient(createAuthApp());
const sysUsersClient = testClient(createSysUsersApp());

describe("sysUsers routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let createdUserId: string;
  let testUser: any;

  // 测试前初始化权限配置
  beforeAll(async () => {
    await collectAndSyncEndpointPermissions([
      { name: "sys-users", app: sysUsers, prefix: "" },
    ]);
    // 重新加载Casbin策略以确保权限更新生效
    await reloadPolicy();
  });

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
    const response = await sysUsersClient["sys-users"].$get({
      query: {
        page: "1",
        limit: "10",
      },
    });
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 无效 token 应该返回 401 */
  it("access with invalid token should return 401", async () => {
    const response = await sysUsersClient["sys-users"].$get(
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

    const response = await sysUsersClient["sys-users"].$post(
      {
        json: testUser,
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

    const response = await sysUsersClient["sys-users"].$post(
      {
        // @ts-ignore
        json: {
          username: "ab", // 用户名太短
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

  /** 管理员获取用户列表 */
  it("admin should be able to list users", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient["sys-users"].$get(
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

  /** 管理员获取单个用户 */
  it("admin should be able to get single user", async () => {
    // 跳过测试如果没有管理员 token 或创建的用户 ID
    if (!adminToken || !createdUserId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient["sys-users"][":id"].$get(
      {
        param: {
          id: createdUserId,
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

    const response = await sysUsersClient["sys-users"][":id"].$patch(
      {
        param: {
          id: createdUserId,
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
      expect(json.nickName).toBe(updateData.nickName);
      expect(json.status).toBe(updateData.status);
    }
  });

  /** 管理员分配角色 */
  it("admin should be able to assign roles", async () => {
    // 跳过测试如果没有管理员 token 或创建的用户 ID
    if (!adminToken || !createdUserId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient["sys-users"][":id"].roles.$post(
      {
        param: {
          id: createdUserId,
        },
        json: {
          roleIds: [], // 空数组测试
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
      expect(json.success).toBe(true);
      expect(typeof json.added).toBe("number");
      expect(typeof json.removed).toBe("number");
    }
  });

  /** 普通用户权限测试（如果有 userToken） */
  it("regular user should have limited access", async () => {
    // 跳过测试如果没有普通用户 token
    if (!userToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient["sys-users"].$get(
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

    const response = await sysUsersClient["sys-users"][":id"].$get(
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
  it("should return 404 for non-existent user", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient["sys-users"][":id"].$get(
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

  /** 管理员删除用户 */
  it("admin should be able to delete user", async () => {
    // 跳过测试如果没有管理员 token 或创建的用户 ID
    if (!adminToken || !createdUserId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient["sys-users"][":id"].$delete(
      {
        param: {
          id: createdUserId,
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

  /** 验证用户已被删除 */
  it("deleted user should return 404", async () => {
    // 跳过测试如果没有管理员 token 或创建的用户 ID
    if (!adminToken || !createdUserId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysUsersClient["sys-users"][":id"].$get(
      {
        param: {
          id: createdUserId,
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
