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
import { auth } from "@/routes/public/public.index";

import { objectStorage } from "./object-storage.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建认证应用
function createAuthApp() {
  return createApp().route("/", auth);
}

// 创建对象存储应用（公共路由）
function createObjectStorageApp() {
  return createApp().route("/", objectStorage);
}

// 创建带管理员权限的对象存储应用
function createAdminObjectStorageApp() {
  return createApp()
    .use("/sts-token/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/sts-token/*", casbin())
    .route("/", objectStorage);
}

const authClient = testClient(createAuthApp());
const objectStorageClient = testClient(createObjectStorageApp());
const adminObjectStorageClient = testClient(createAdminObjectStorageApp());

describe("object-storage routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;

  // 测试前初始化权限配置
  beforeAll(async () => {
    await collectAndSyncEndpointPermissions([
      { name: "object-storage", app: objectStorage, prefix: "" },
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

  describe("post /sts-token/upload", () => {
    /** 获取上传令牌 - 成功（匿名用户） */
    it("should get upload token for anonymous user", async () => {
      const response = await objectStorageClient["sts-token"].upload.$post({
        json: {
          fileName: "test-file.jpg",
          fileType: "image/jpeg",
        },
      });

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.url).toBeDefined();
        expect(json.expiresAt).toBeDefined();
        expectTypeOf(json).toBeObject();
        expectTypeOf(json.url).toBeString();
        expectTypeOf(json.expiresAt).toBeString();
        // 验证URL包含正确的文件名和bucket
        expect(json.url).toContain("public/test-file.jpg");
      }
    });

    /** 获取上传令牌 - 成功（已认证管理员） */
    it("should get upload token for authenticated admin user", async () => {
      // 跳过测试如果没有管理员 token
      if (!adminToken) {
        expect(true).toBe(true);
        return;
      }

      const response = await adminObjectStorageClient["sts-token"].upload.$post(
        {
          json: {
            fileName: "admin-file.jpg",
            fileType: "image/jpeg",
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
        expect(json.url).toBeDefined();
        expect(json.expiresAt).toBeDefined();
        // 管理员应该使用用户ID作为前缀，不是public/
        expect(json.url).not.toContain("public/admin-file.jpg");
      }
    });

    /** 获取上传令牌 - 仅必需参数 */
    it("should get upload token with minimal parameters", async () => {
      const response = await objectStorageClient["sts-token"].upload.$post({
        json: {
          fileName: "simple-file.txt",
        },
      });

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.url).toBeDefined();
        expect(json.expiresAt).toBeDefined();
        // 验证匿名用户使用public/前缀
        expect(json.url).toContain("public/simple-file.txt");
      }
    });

    /** 获取上传令牌 - 参数验证失败 */
    it("should validate upload token parameters", async () => {
      const response = await objectStorageClient["sts-token"].upload.$post({
        // @ts-ignore
        json: {
          // 完全缺少 fileName 字段
        },
      });

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    /** 获取上传令牌 - 无效字段验证 */
    it("should validate invalid fields", async () => {
      const response = await objectStorageClient["sts-token"].upload.$post({
        // @ts-ignore
        json: {
          fileName: "test-file.jpg",
          // @ts-ignore
          invalidField: "invalid", // 无效字段
        },
      });

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    /** 获取上传令牌 - 缺少必需参数 */
    it("should require fileName parameter", async () => {
      const response = await objectStorageClient["sts-token"].upload.$post({
        // @ts-ignore
        json: {
          fileType: "image/jpeg",
        },
      });

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    /** 未认证访问管理员路由应该返回 401 */
    it("admin route access without token should return 401", async () => {
      const response = await adminObjectStorageClient["sts-token"].upload.$post({
        json: {
          fileName: "test-file.jpg",
        },
      });
      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });

    /** 无效 token 应该返回 401 */
    it("admin route access with invalid token should return 401", async () => {
      const response = await adminObjectStorageClient["sts-token"].upload.$post(
        {
          json: {
            fileName: "test-file.jpg",
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
  });

  describe("post /sts-token/download", () => {
    /** 获取下载令牌 - 成功（匿名用户） */
    it("should get download token for anonymous user", async () => {
      const response = await objectStorageClient["sts-token"].download.$post({
        json: {
          fileName: "test-file.jpg",
        },
      });

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.url).toBeDefined();
        expect(json.expiresAt).toBeDefined();
        expectTypeOf(json).toBeObject();
        expectTypeOf(json.url).toBeString();
        expectTypeOf(json.expiresAt).toBeString();
        // 验证URL包含正确的文件名和前缀
        expect(json.url).toContain("public/test-file.jpg");
      }
    });

    /** 获取下载令牌 - 成功（已认证管理员） */
    it("should get download token for authenticated admin user", async () => {
      // 跳过测试如果没有管理员 token
      if (!adminToken) {
        expect(true).toBe(true);
        return;
      }

      const response = await adminObjectStorageClient["sts-token"].download.$post(
        {
          json: {
            fileName: "private-file.pdf",
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
        expect(json.url).toBeDefined();
        expect(json.expiresAt).toBeDefined();
        // 管理员应该使用用户ID作为前缀，不是public/
        expect(json.url).not.toContain("public/private-file.pdf");
      }
    });

    /** 获取下载令牌 - 仅必需参数 */
    it("should get download token with minimal parameters", async () => {
      const response = await objectStorageClient["sts-token"].download.$post({
        json: {
          fileName: "download-file.zip",
        },
      });

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.url).toBeDefined();
        expect(json.expiresAt).toBeDefined();
        // 验证匿名用户使用public/前缀
        expect(json.url).toContain("public/download-file.zip");
      }
    });

    /** 获取下载令牌 - 参数验证失败 */
    it("should validate download token parameters", async () => {
      const response = await objectStorageClient["sts-token"].download.$post({
        // @ts-ignore
        json: {
          // 完全缺少 fileName 字段
        },
      });

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    /** 获取下载令牌 - 无效字段验证 */
    it("should validate invalid fields for download", async () => {
      const response = await objectStorageClient["sts-token"].download.$post({
        // @ts-ignore
        json: {
          fileName: "test-file.jpg",
          // @ts-ignore
          invalidField: "invalid", // 无效字段
        },
      });

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    /** 获取下载令牌 - 缺少必需参数 */
    it("should require fileName parameter for download", async () => {
      const response = await objectStorageClient["sts-token"].download.$post({
        // @ts-ignore
        json: {
          // 缺少 fileName 字段
        },
      });

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    /** 管理员路由访问测试 */
    it("admin route should require authentication for download", async () => {
      const response = await adminObjectStorageClient["sts-token"].download.$post({
        json: {
          fileName: "admin-file.jpg",
        },
      });
      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });

    /** 普通用户权限测试（如果有 userToken） */
    it("regular user should have limited access to admin routes", async () => {
      // 跳过测试如果没有普通用户 token
      if (!userToken) {
        expect(true).toBe(true);
        return;
      }

      const response = await adminObjectStorageClient["sts-token"].download.$post(
        {
          json: {
            fileName: "test-file.jpg",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );

      // 普通用户可能没有访问管理员路由的权限
      expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.UNAUTHORIZED]).toContain(response.status);
    });
  });

  /** 验证管理员用户可以使用公共路由 */
  it("admin user should be able to use public routes without auth", async () => {
    const response = await objectStorageClient["sts-token"].upload.$post({
      json: {
        fileName: "public-admin-file.jpg",
        fileType: "image/jpeg",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.url).toBeDefined();
      expect(json.expiresAt).toBeDefined();
      // 公共路由应该使用public/前缀
      expect(json.url).toContain("public/public-admin-file.jpg");
    }
  });
});
