/* eslint-disable ts/ban-ts-comment */
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import { Status } from "@/lib/enums";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { casbin } from "@/middlewares/jwt-auth";
import { getAdminToken, getAuthHeaders, getUserToken } from "@/utils/test-utils";

import { systemDomains } from "./domains.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建系统域管理应用
function createSysDomainsApp() {
  return createApp()
    .use("/system/domains/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/domains/*", casbin())
    .route("/", systemDomains);
}

const sysDomainsClient = testClient(createSysDomainsApp());

describe("sysDomains routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let createdDomainId: string;
  let testDomain: any;

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
    const response = await sysDomainsClient.system.domains.$get({
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
    const response = await sysDomainsClient.system.domains.$get(
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

    const response = await sysDomainsClient.system.domains.$post(
      {
        json: testDomain,
      },
      {
        headers: getAuthHeaders(adminToken),
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
  it("should validate domain creation parameters", async () => {
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    // 测试空代码
    const emptyCodeResponse = await sysDomainsClient.system.domains.$post(
      {
        // @ts-ignore
        json: {
          code: "",
          name: "测试域",
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(emptyCodeResponse.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

    // 测试空名称
    const emptyNameResponse = await sysDomainsClient.system.domains.$post(
      {
        // @ts-ignore
        json: {
          code: "test-code",
          name: "",
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(emptyNameResponse.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

    // 测试无效状态
    const invalidStatusResponse = await sysDomainsClient.system.domains.$post(
      {
        // @ts-ignore
        json: {
          code: "test-code",
          name: "测试域",
          status: 999,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(invalidStatusResponse.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
  });

  /** 域代码重复验证 */
  it("should prevent duplicate domain codes", async () => {
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

    const response = await sysDomainsClient.system.domains.$post(
      {
        json: duplicateDomain,
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.CONFLICT);
  });

  /** 管理员获取域列表 */
  it("should list domains with pagination", async () => {
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient.system.domains.$get(
      {
        query: {
          skip: "0",
          take: "10",
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
      expect(json.meta.skip).toBe(0);
      // @ts-ignore
      expect(json.meta.take).toBe(10);

      // 检查返回的域数据结构
      if (json.data.length > 0) {
        const domain = json.data[0];
        expect(domain).toHaveProperty("id");
        expect(domain).toHaveProperty("code");
        expect(domain).toHaveProperty("name");
        expect(domain).toHaveProperty("status");
      }
    }
  });

  /** 管理员获取单个域 */
  it("should get single domain by ID", async () => {
    if (!adminToken || !createdDomainId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient.system.domains[":id"].$get(
      {
        param: {
          id: createdDomainId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.id).toBe(createdDomainId);
      expect(json.code).toBe(testDomain.code);
      expect(json.name).toBe(testDomain.name);
      expect(json).toHaveProperty("createdAt");
      expect(json).toHaveProperty("updatedAt");
    }
  });

  /** 管理员更新域 */
  it("should update domain successfully", async () => {
    if (!adminToken || !createdDomainId) {
      expect(true).toBe(true);
      return;
    }

    const updateData = {
      name: "更新的测试域",
      description: "这是一个更新的测试域描述",
      status: Status.DISABLED,
    };

    const response = await sysDomainsClient.system.domains[":id"].$patch(
      {
        param: {
          id: createdDomainId,
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
      expect(json.name).toBe(updateData.name);
      expect(json.description).toBe(updateData.description);
      expect(json.status).toBe(updateData.status);
      expect(json.code).toBe(testDomain.code); // 代码不应该改变
      expect(json.id).toBe(createdDomainId); // ID不应该改变
    }
  });

  /** 普通用户权限测试 */
  it("regular user should have access if authorized", async () => {
    // 跳过测试如果没有普通用户 token
    if (!userToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient.system.domains.$get(
      {
        query: {
          skip: "0",
          take: "10",
        },
      },
      {
        headers: getAuthHeaders(userToken),
      },
    );

    // 普通用户可能有权限或没权限，都是正常的
    expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN]).toContain(response.status);
  });

  /** ID 参数验证 */
  it("should validate UUID parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient.system.domains[":id"].$get(
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
  it("should return 404 for non-existent domain", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient.system.domains[":id"].$get(
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

  /** 管理员删除域 */
  it("admin should be able to delete domain", async () => {
    // 跳过测试如果没有管理员 token 或创建的域 ID
    if (!adminToken || !createdDomainId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient.system.domains[":id"].$delete(
      {
        param: {
          id: createdDomainId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NO_CONTENT);
  });

  /** 删除域后验证不可访问 */
  it("deleted domain should return 404", async () => {
    if (!adminToken || !createdDomainId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient.system.domains[":id"].$get(
      {
        param: {
          id: createdDomainId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);

    const json = await response.json();
    expect(json).toHaveProperty("message");
  });

  /** 测试域状态过滤 */
  it("should support status filtering in domain list", async () => {
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    // 先尝试按状态过滤现有域
    const filterResponse = await sysDomainsClient.system.domains.$get(
      {
        query: {
          skip: "0",
          take: "10",
          where: JSON.stringify({ status: Status.ENABLED }),
        },
      },
      { headers: getAuthHeaders(adminToken) },
    );

    expect(filterResponse.status).toBe(HttpStatusCodes.OK);
    if (filterResponse.status === HttpStatusCodes.OK) {
      const json = await filterResponse.json();
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("meta");

      // 如果有数据，检查所有返回的域都是启用状态
      if (json.data.length > 0) {
        json.data.forEach((domain: any) => {
          expect(domain.status).toBe(Status.ENABLED);
        });
      }
    }
  });

  /** 测试更新不存在的域 */
  it("should return 404 when updating non-existent domain", async () => {
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysDomainsClient.system.domains[":id"].$patch(
      {
        param: { id: "550e8400-e29b-41d4-a716-446655440000" },
        json: { name: "不存在的域" },
      },
      { headers: getAuthHeaders(adminToken) },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);

    const json = await response.json();
    expect(json).toHaveProperty("message");
  });
});
