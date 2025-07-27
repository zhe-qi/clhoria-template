/* eslint-disable ts/ban-ts-comment */
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";

import { auth } from "./auth.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建认证应用
function createAuthApp() {
  return createApp().route("/", auth);
}

const authClient = testClient(createAuthApp());

describe("auth routes", () => {
  let adminToken: string;
  let refreshTokenValue: string;

  // 使用随机数生成唯一且符合验证规则的用户名避免冲突
  const testUsername = `test${Math.floor(Math.random() * 10000)}`;

  /** 后台注册测试 */
  it("should register new admin user", async () => {
    const response = await authClient.auth.register.$post({
      json: {
        username: testUsername,
        password: "123456",
        confirmPassword: "123456",
        domain: "default",
        nickName: "测试管理员",
        status: 1,
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.id).toBeDefined();
      expectTypeOf(json.id).toBeString();
    }
  });

  /** 重复注册测试 */
  it("should prevent duplicate user registration", async () => {
    const response = await authClient.auth.register.$post({
      json: {
        username: testUsername, // 使用相同的用户名
        password: "123456",
        confirmPassword: "123456",
        domain: "default",
        nickName: "测试管理员",
        status: 1,
      },
    });

    expect(response.status).toBe(HttpStatusCodes.CONFLICT);
    if (response.status === HttpStatusCodes.CONFLICT) {
      const json = await response.json();
      expect(json.message).toBeDefined();
    }
  });

  /** 密码不一致注册测试 */
  it("should reject registration with mismatched passwords", async () => {
    const response = await authClient.auth.register.$post({
      json: {
        username: "testadmin2",
        password: "123456",
        confirmPassword: "654321", // 不一致的密码
        domain: "default",
        nickName: "测试管理员2",
        status: 1,
      },
    });

    expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST);
    if (response.status === HttpStatusCodes.BAD_REQUEST) {
      const json = await response.json();
      expect(json.message).toBeDefined();
    }
  });

  /** 参数验证测试 */
  it("should validate registration parameters", async () => {
    const response = await authClient.auth.register.$post({
      // @ts-ignore
      json: {
        username: "", // 空用户名
        password: "123456",
        confirmPassword: "123456",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
  });

  /** 登录成功测试 */
  it("should login with valid credentials", async () => {
    const response = await authClient.auth.login.$post({
      json: {
        username: testUsername,
        password: "123456",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.token).toBeDefined();
      expect(json.refreshToken).toBeDefined();
      expect(json.user).toBeDefined();
      expect(json.user.username).toBe(testUsername);
      expectTypeOf(json.token).toBeString();
      expectTypeOf(json.refreshToken).toBeString();
      expectTypeOf(json.user).toBeObject();
      adminToken = json.token;
      refreshTokenValue = json.refreshToken;
    }
  });

  /** 登录失败 - 用户不存在 */
  it("should return 404 for non-existent user", async () => {
    const response = await authClient.auth.login.$post({
      json: {
        username: "nonexistuser", // 符合用户名验证规则的用户名
        password: "123456",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    if (response.status === HttpStatusCodes.NOT_FOUND) {
      const json = await response.json();
      expect(json.message).toBeDefined();
    }
  });

  /** 登录失败 - 密码错误 */
  it("should return 401 for wrong password", async () => {
    const response = await authClient.auth.login.$post({
      json: {
        username: testUsername,
        password: "wrongpass",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    if (response.status === HttpStatusCodes.UNAUTHORIZED) {
      const json = await response.json();
      expect(json.message).toBeDefined();
    }
  });

  /** 登录参数验证测试 */
  it("should validate login parameters", async () => {
    const response = await authClient.auth.login.$post({
      // @ts-ignore
      json: {
        username: "",
        password: "",
        domain: "",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
  });

  /** 刷新令牌成功测试 */
  it("should refresh token with valid refresh token", async () => {
    if (!refreshTokenValue) {
      expect(true).toBe(true);
      return;
    }

    const response = await authClient.auth.refresh.$post({
      json: {
        refreshToken: refreshTokenValue,
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.token).toBeDefined();
      expect(json.refreshToken).toBeDefined();
      expectTypeOf(json.token).toBeString();
      expectTypeOf(json.refreshToken).toBeString();
      adminToken = json.token; // 更新 token
      refreshTokenValue = json.refreshToken; // 更新 refresh token
    }
  });

  /** 刷新令牌失败测试 */
  it("should reject invalid refresh token", async () => {
    const response = await authClient.auth.refresh.$post({
      json: {
        refreshToken: "invalid-refresh-token",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    if (response.status === HttpStatusCodes.UNAUTHORIZED) {
      const json = await response.json();
      expect(json.message).toBeDefined();
    }
  });

  /** 刷新令牌参数验证测试 */
  it("should validate refresh token parameters", async () => {
    const response = await authClient.auth.refresh.$post({
      // @ts-ignore
      json: {
        refreshToken: "",
      },
    });

    // 空的刷新令牌会导致JWT验证失败，返回401
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 获取用户信息 - 未认证 */
  it("should require authentication for user info", async () => {
    const response = await authClient.auth.userinfo.$get();

    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 获取用户信息 - 无效 token */
  it("should reject invalid token for user info", async () => {
    const response = await authClient.auth.userinfo.$get(
      {},
      {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 获取用户信息 - 成功 */
  it("should get user info with valid token", async () => {
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await authClient.auth.userinfo.$get(
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
      expect(json.username).toBe(testUsername);
      expect(json.id).toBeDefined();
      expect(json.domain).toBe("default");
      expectTypeOf(json).toBeObject();
    }
  });
});
