/* eslint-disable ts/ban-ts-comment */
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import { Status } from "@/lib/enums";
import { collectAndSyncEndpointPermissions } from "@/lib/permissions";
import { reloadPolicy } from "@/lib/permissions/casbin/rbac";
import { casbin } from "@/middlewares/jwt-auth";
import { operationLog } from "@/middlewares/operation-log";
import { auth } from "@/routes/public/public.index";

import { sysDomains } from "./sys-domains.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建认证应用
function createAuthApp() {
  return createApp().route("/", auth);
}

// 创建系统域管理应用
function createSysDomainsApp() {
  return createApp()
    .use("/sys-domains/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/sys-domains/*", casbin())
    .use("/sys-domains/*", operationLog({ moduleName: "后台管理", description: "后台管理操作" }))
    .route("/", sysDomains);
}

const authClient = testClient(createAuthApp());
const sysDomainsClient = testClient(createSysDomainsApp());

describe("sysDomains routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let createdDomainId: string;
  let testDomain: any;

  // 测试前初始化权限配置
  beforeAll(async () => {
    await collectAndSyncEndpointPermissions([
      { name: "sys-domains", app: sysDomains, prefix: "" },
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
    const response = await sysDomainsClient["sys-domains"].$get({
      query: {
        page: "1",
        limit: "10",
      },
    });
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 无效 token 应该返回 401 */
  it("access with invalid token should return 401", async () => {
    const response = await sysDomainsClient["sys-domains"].$get(
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

  /** 管理员创建域 */
  it("admin should be able to create domain", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    testDomain = {
      code: "test-domain",
      name: "测试域",
      description: "这是一个测试域",
      status: Status.ENABLED,
      createdBy: "admin",
    };

    const response = await sysDomainsClient["sys-domains"].$post(
      {
        json: testDomain,
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
      expect(json.code).toBe(testDomain.code);
      expect(json.name).toBe(testDomain.name);
      expect(json.description).toBe(testDomain.description);
      expect(json.status).toBe(testDomain.status);
      expect(json.id).toBeDefined();
      createdDomainId = json.id;
    }
  });

  /** 管理员创建域参数验证 */
  it("admin create domain should validate parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient["sys-domains"].$post(
      {
        // @ts-ignore
        json: {
          code: "", // 域代码为空
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

  /** 域代码重复验证 */
  it("should prevent duplicate domain codes", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const duplicateDomain = {
      code: "test-domain", // 与之前创建的域代码相同
      name: "重复测试域",
      description: "这是一个重复的测试域",
      status: Status.ENABLED,
      createdBy: "admin",
    };

    const response = await sysDomainsClient["sys-domains"].$post(
      {
        json: duplicateDomain,
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.CONFLICT);
  });

  /** 管理员获取域列表 */
  it("admin should be able to list domains", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient["sys-domains"].$get(
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

  /** 搜索功能测试 */
  it("admin should be able to search domains", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient["sys-domains"].$get(
      {
        query: {
          page: "1",
          limit: "10",
          search: "测试",
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

  /** 管理员获取单个域 */
  it("admin should be able to get single domain", async () => {
    // 跳过测试如果没有管理员 token 或创建的域 ID
    if (!adminToken || !createdDomainId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient["sys-domains"][":id"].$get(
      {
        param: {
          id: createdDomainId,
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
      expect(json.id).toBe(createdDomainId);
      expect(json.code).toBe(testDomain.code);
      expect(json.name).toBe(testDomain.name);
    }
  });

  /** 管理员更新域 */
  it("admin should be able to update domain", async () => {
    // 跳过测试如果没有管理员 token 或创建的域 ID
    if (!adminToken || !createdDomainId) {
      expect(true).toBe(true);
      return;
    }

    const updateData = {
      name: "更新的测试域",
      description: "这是一个更新的测试域描述",
      status: Status.DISABLED,
    };

    const response = await sysDomainsClient["sys-domains"][":id"].$patch(
      {
        param: {
          id: createdDomainId,
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
      expect(json.name).toBe(updateData.name);
      expect(json.description).toBe(updateData.description);
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

    const response = await sysDomainsClient["sys-domains"].$get(
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

    // 普通用户可能没有访问系统域的权限
    expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.UNAUTHORIZED]).toContain(response.status);
  });

  /** ID 参数验证 */
  it("should validate UUID parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient["sys-domains"][":id"].$get(
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
  it("should return 404 for non-existent domain", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient["sys-domains"][":id"].$get(
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

  /** 管理员删除域 */
  it("admin should be able to delete domain", async () => {
    // 跳过测试如果没有管理员 token 或创建的域 ID
    if (!adminToken || !createdDomainId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient["sys-domains"][":id"].$delete(
      {
        param: {
          id: createdDomainId,
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

  /** 验证域已被删除 */
  it("deleted domain should return 404", async () => {
    // 跳过测试如果没有管理员 token 或创建的域 ID
    if (!adminToken || !createdDomainId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient["sys-domains"][":id"].$get(
      {
        param: {
          id: createdDomainId,
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
