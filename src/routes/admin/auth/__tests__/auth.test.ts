import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import db from "@/db";
import { systemUsers } from "@/db/schema";
import env from "@/env";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { Status } from "@/lib/enums";
import { logout as cleanupRefreshTokens } from "@/routes/admin/auth/auth.helpers";
import authRouter from "@/routes/admin/auth/auth.index";
import { createTestApp } from "~/tests/utils/test-app";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// ===== 测试应用 =====
function createAuthApp() {
  return createTestApp().route("/", authRouter);
}

const client = testClient(createAuthApp());

// ===== 工具函数 =====
/** 从响应头提取 refreshToken cookie 值 */
function extractRefreshToken(response: { headers: Headers }): string | null {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(/refreshToken=([^;]+)/);
  return match ? match[1] : null;
}

/** 登录并返回 accessToken 和 refreshToken */
async function loginAs(credentials: { username: string; password: string }) {
  const response = await client.auth.login.$post({
    json: { ...credentials, captchaToken: "test" },
  });
  const json = await response.json();
  const refreshToken = extractRefreshToken(response);
  return {
    response,
    accessToken: (json as any).data?.accessToken as string,
    refreshToken,
  };
}

// ===== 测试常量 =====
const ADMIN_CREDENTIALS = { username: "admin", password: "123456" };
const USER_CREDENTIALS = { username: "user", password: "123456" };
const DISABLED_USERNAME = "test_disabled_auth";

// ===== 测试主体 =====
describe("auth routes", () => {
  beforeAll(async () => {
    // 创建禁用测试用户
    const passwordHash = await hash("123456");
    await db.insert(systemUsers).values({
      username: DISABLED_USERNAME,
      password: passwordHash,
      nickName: "禁用测试用户",
      status: Status.DISABLED,
      builtIn: false,
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    // 清理 Redis 中的 refresh token
    const adminUser = await db.query.systemUsers.findFirst({
      where: eq(systemUsers.username, "admin"),
      columns: { id: true },
    });
    const regularUser = await db.query.systemUsers.findFirst({
      where: eq(systemUsers.username, "user"),
      columns: { id: true },
    });
    if (adminUser) await cleanupRefreshTokens(adminUser.id);
    if (regularUser) await cleanupRefreshTokens(regularUser.id);

    // 清理禁用测试用户
    await db.delete(systemUsers).where(eq(systemUsers.username, DISABLED_USERNAME));
  });

  // ===== POST /auth/login =====
  describe("POST /auth/login", () => {
    it("should login successfully with correct credentials", async () => {
      const { response, accessToken } = await loginAs(ADMIN_CREDENTIALS);

      expect(response.status).toBe(HttpStatusCodes.OK);
      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe("string");
      expect(accessToken.length).toBeGreaterThan(0);
    });

    it("should set httpOnly refreshToken cookie on login", async () => {
      const { response, refreshToken } = await loginAs(ADMIN_CREDENTIALS);

      expect(response.status).toBe(HttpStatusCodes.OK);
      expect(refreshToken).toBeDefined();

      const setCookie = response.headers.get("set-cookie")!;

      expect(setCookie).toContain("refreshToken=");
      expect(setCookie.toLowerCase()).toContain("httponly");
      expect(setCookie.toLowerCase()).toContain("samesite=strict");
      expect(setCookie.toLowerCase()).toContain("path=/");
    });

    it("should return 401 for wrong password", async () => {
      const response = await client.auth.login.$post({
        json: { username: "admin", password: "wrongpassword", captchaToken: "test" },
      });

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);

      const json = await response.json();

      expect((json as any).message).toContain("用户名或密码错误");
    });

    it("should return 401 for non-existent username", async () => {
      const response = await client.auth.login.$post({
        json: { username: "nonexistent_user_xyz", password: "123456", captchaToken: "test" },
      });

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);

      const json = await response.json();

      expect((json as any).message).toContain("用户名或密码错误");
    });

    it("should return 403 for disabled user", async () => {
      const response = await client.auth.login.$post({
        json: { username: DISABLED_USERNAME, password: "123456", captchaToken: "test" },
      });

      expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);

      const json = await response.json();

      expect((json as any).message).toContain("用户已被禁用");
    });
  });

  // ===== POST /auth/refresh =====
  describe("POST /auth/refresh", () => {
    it("should refresh access token with valid refresh token cookie", async () => {
      const { refreshToken } = await loginAs(ADMIN_CREDENTIALS);

      expect(refreshToken).toBeDefined();

      const response = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: `refreshToken=${refreshToken}` } },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      const json = await response.json();

      expect((json as any).data.accessToken).toBeDefined();
      expect(typeof (json as any).data.accessToken).toBe("string");
    });

    it("should rotate refresh token on each refresh", async () => {
      const { refreshToken: oldRefreshToken } = await loginAs(ADMIN_CREDENTIALS);

      expect(oldRefreshToken).toBeDefined();

      const response = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: `refreshToken=${oldRefreshToken}` } },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      const newRefreshToken = extractRefreshToken(response);

      expect(newRefreshToken).toBeDefined();
      expect(newRefreshToken).not.toBe(oldRefreshToken);
    });

    it("should return 401 when no refresh token cookie present", async () => {
      const response = await client.auth.refresh.$post({});

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);

      const json = await response.json();

      expect((json as any).message).toContain("刷新令牌不存在");
    });

    it("should return 401 with invalid refresh token", async () => {
      const response = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: "refreshToken=invalid-token-value" } },
      );

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });

    it("should return 401 with revoked refresh token", async () => {
      // 登录获取 refreshToken
      const { accessToken, refreshToken } = await loginAs(ADMIN_CREDENTIALS);

      expect(refreshToken).toBeDefined();

      // 退出登录，吊销所有 refresh token
      await client.auth.logout.$post(
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      // 使用已吊销的 refreshToken 尝试刷新
      const response = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: `refreshToken=${refreshToken}` } },
      );

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });
  });

  // ===== POST /auth/logout =====
  describe("POST /auth/logout", () => {
    it("should logout successfully with valid JWT", async () => {
      const { accessToken } = await loginAs(ADMIN_CREDENTIALS);

      const response = await client.auth.logout.$post(
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      const json = await response.json();

      expect((json as any).data).toEqual({});
    });

    it("should delete refreshToken cookie on logout", async () => {
      const { accessToken } = await loginAs(ADMIN_CREDENTIALS);

      const response = await client.auth.logout.$post(
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      const setCookie = response.headers.get("set-cookie");

      expect(setCookie).toBeDefined();
      // 删除 cookie 时值为空或 Max-Age=0
      expect(setCookie).toContain("refreshToken=");
    });

    it("should revoke all refresh tokens (subsequent refresh fails)", async () => {
      // 登录两次生成两个 refreshToken
      const login1 = await loginAs(ADMIN_CREDENTIALS);
      const login2 = await loginAs(ADMIN_CREDENTIALS);

      // 使用第一次登录的 accessToken 退出
      await client.auth.logout.$post(
        {},
        { headers: { Authorization: `Bearer ${login1.accessToken}` } },
      );

      // 两个旧 refreshToken 都应该失效
      const refresh1 = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: `refreshToken=${login1.refreshToken}` } },
      );

      expect(refresh1.status).toBe(HttpStatusCodes.UNAUTHORIZED);

      const refresh2 = await client.auth.refresh.$post(
        {},
        { headers: { Cookie: `refreshToken=${login2.refreshToken}` } },
      );

      expect(refresh2.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });

    it("should return 401 without JWT", async () => {
      const response = await client.auth.logout.$post({});

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });
  });

  // ===== GET /auth/userinfo =====
  describe("GET /auth/userinfo", () => {
    it("should return current admin user info", async () => {
      const { accessToken } = await loginAs(ADMIN_CREDENTIALS);

      const response = await client.auth.userinfo.$get(
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      const json = await response.json();
      const data = (json as any).data;

      expect(data.username).toBe("admin");
      expect(data.id).toBeDefined();
      expect(data.nickName).toBeDefined();
      expect(data.roles).toBeDefined();
      expect(Array.isArray(data.roles)).toBe(true);
      expect(data.roles).toContain("admin");
    });

    it("should return current regular user info", async () => {
      const { accessToken } = await loginAs(USER_CREDENTIALS);

      const response = await client.auth.userinfo.$get(
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      const json = await response.json();
      const data = (json as any).data;

      expect(data.username).toBe("user");
      expect(data.roles).toBeDefined();
      expect(Array.isArray(data.roles)).toBe(true);
    });

    it("should not include password in response", async () => {
      const { accessToken } = await loginAs(ADMIN_CREDENTIALS);

      const response = await client.auth.userinfo.$get(
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      const json = await response.json();

      expect((json as any).data).not.toHaveProperty("password");
    });

    it("should return 401 without JWT", async () => {
      const response = await client.auth.userinfo.$get({});

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });
  });

  // ===== GET /auth/permissions =====
  describe("GET /auth/permissions", () => {
    it("should return permissions for admin user", async () => {
      const { accessToken } = await loginAs(ADMIN_CREDENTIALS);

      const response = await client.auth.permissions.$get(
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      const json = await response.json();
      const data = (json as any).data;

      expect(data.permissions).toBeDefined();
      expect(Array.isArray(data.permissions)).toBe(true);
      expect(data.groupings).toBeDefined();
      expect(Array.isArray(data.groupings)).toBe(true);
    });

    it("should return permissions for regular user", async () => {
      const { accessToken } = await loginAs(USER_CREDENTIALS);

      const response = await client.auth.permissions.$get(
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      const json = await response.json();
      const data = (json as any).data;

      expect(data.permissions).toBeDefined();
      expect(Array.isArray(data.permissions)).toBe(true);
      expect(data.groupings).toBeDefined();
      expect(Array.isArray(data.groupings)).toBe(true);
    });

    it("should return 401 without JWT", async () => {
      const response = await client.auth.permissions.$get({});

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });
  });
});
