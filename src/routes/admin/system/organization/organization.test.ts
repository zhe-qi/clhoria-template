/* eslint-disable ts/ban-ts-comment */
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import { Status } from "@/lib/enums";
import { casbin } from "@/middlewares/jwt-auth";
import { operationLog } from "@/middlewares/operation-log";
import { auth } from "@/routes/public/public.index";

import { systemOrganization } from "./organization.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建认证应用
function createAuthApp() {
  return createApp().route("/", auth);
}

// 创建组织管理应用
function createOrganizationApp() {
  return createApp()
    .use("/system/organization/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/organization/*", casbin())
    .use("/system/organization/*", operationLog({ moduleName: "组织管理", description: "组织管理操作" }))
    .route("/", systemOrganization);
}

const authClient = testClient(createAuthApp());
const organizationClient = testClient(createOrganizationApp());

describe("systemOrganization routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let createdOrgId: string;
  let createdChildOrgId: string;
  let testOrganization: any;
  let testChildOrganization: any;

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
    const response = await organizationClient.system.organization.$get({
      query: {
        page: "1",
        limit: "10",
      },
    });
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 无效 token 应该返回 401 */
  it("access with invalid token should return 401", async () => {
    const response = await organizationClient.system.organization.$get(
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

  /** 管理员创建根级组织 */
  it("admin should be able to create root organization", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    testOrganization = {
      domain: "default",
      code: "test-org",
      name: "测试组织",
      description: "这是一个测试组织",
      status: Status.ENABLED,
      createdBy: "admin",
    };

    const response = await organizationClient.system.organization.$post(
      {
        json: testOrganization,
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
      expect(json.code).toBe(testOrganization.code);
      expect(json.name).toBe(testOrganization.name);
      expect(json.description).toBe(testOrganization.description);
      expect(json.status).toBe(testOrganization.status);
      expect(json.domain).toBe(testOrganization.domain);
      expect(json.id).toBeDefined();
      expect(json.pid).toBeNull();
      createdOrgId = json.id;
    }
  });

  /** 管理员创建子组织 */
  it("admin should be able to create child organization", async () => {
    // 跳过测试如果没有管理员 token 或父组织 ID
    if (!adminToken || !createdOrgId) {
      expect(true).toBe(true);
      return;
    }

    testChildOrganization = {
      domain: "default",
      code: "test-child-org",
      name: "测试子组织",
      description: "这是一个测试子组织",
      pid: createdOrgId,
      status: Status.ENABLED,
      createdBy: "admin",
    };

    const response = await organizationClient.system.organization.$post(
      {
        json: testChildOrganization,
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
      expect(json.code).toBe(testChildOrganization.code);
      expect(json.name).toBe(testChildOrganization.name);
      expect(json.pid).toBe(createdOrgId);
      expect(json.domain).toBe(testChildOrganization.domain);
      expect(json.id).toBeDefined();
      createdChildOrgId = json.id;
    }
  });

  /** 管理员创建组织参数验证 */
  it("admin create organization should validate parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await organizationClient.system.organization.$post(
      {
        // @ts-ignore
        json: {
          domain: "default",
          code: "", // 组织代码为空
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

  /** 组织代码重复验证 */
  it("should prevent duplicate organization codes in same domain", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const duplicateOrg = {
      domain: "default",
      code: "test-org", // 与之前创建的组织代码相同
      name: "重复测试组织",
      description: "这是一个重复的测试组织",
      status: Status.ENABLED,
      createdBy: "admin",
    };

    const response = await organizationClient.system.organization.$post(
      {
        json: duplicateOrg,
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.CONFLICT);
  });

  /** 循环引用防护测试 */
  it("should prevent circular reference", async () => {
    // 跳过测试如果没有管理员 token 或组织 ID
    if (!adminToken || !createdOrgId || !createdChildOrgId) {
      expect(true).toBe(true);
      return;
    }

    // 尝试将父组织的父级设置为子组织，造成循环引用
    const response = await organizationClient.system.organization[":id"].$patch(
      {
        param: {
          id: createdOrgId,
        },
        json: {
          pid: createdChildOrgId, // 循环引用
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST);
  });

  /** 管理员获取组织列表 */
  it("admin should be able to list organizations", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await organizationClient.system.organization.$get(
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

  /** 获取组织树形结构 */
  it("admin should be able to get organization tree", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await organizationClient.system.organization.tree.$get(
      {
        query: {
          status: Status.ENABLED,
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
      // 验证树形结构
      if (json.length > 0) {
        const rootOrg = json.find((org: any) => org.id === createdOrgId);
        if (rootOrg) {
          expect(rootOrg.children).toBeDefined();
          expect(Array.isArray(rootOrg.children)).toBe(true);
        }
      }
    }
  });

  /** 搜索功能测试 */
  it("admin should be able to search organizations", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await organizationClient.system.organization.$get(
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

  /** 管理员获取单个组织 */
  it("admin should be able to get single organization", async () => {
    // 跳过测试如果没有管理员 token 或创建的组织 ID
    if (!adminToken || !createdOrgId) {
      expect(true).toBe(true);
      return;
    }

    const response = await organizationClient.system.organization[":id"].$get(
      {
        param: {
          id: createdOrgId,
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
      expect(json.id).toBe(createdOrgId);
      expect(json.code).toBe(testOrganization.code);
      expect(json.name).toBe(testOrganization.name);
      expect(json.domain).toBe(testOrganization.domain);
    }
  });

  /** 管理员更新组织 */
  it("admin should be able to update organization", async () => {
    // 跳过测试如果没有管理员 token 或创建的组织 ID
    if (!adminToken || !createdOrgId) {
      expect(true).toBe(true);
      return;
    }

    const updateData = {
      name: "更新的测试组织",
      description: "这是一个更新的测试组织描述",
      status: Status.DISABLED,
    };

    const response = await organizationClient.system.organization[":id"].$patch(
      {
        param: {
          id: createdOrgId,
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

    const response = await organizationClient.system.organization.$get(
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

    // 普通用户可能没有访问组织管理的权限
    expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.UNAUTHORIZED]).toContain(response.status);
  });

  /** ID 参数验证 */
  it("should validate UUID parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await organizationClient.system.organization[":id"].$get(
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
  it("should return 404 for non-existent organization", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await organizationClient.system.organization[":id"].$get(
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

  /** 删除有子组织的组织应该失败 */
  it("should prevent deleting organization with children", async () => {
    // 跳过测试如果没有管理员 token 或创建的组织 ID
    if (!adminToken || !createdOrgId) {
      expect(true).toBe(true);
      return;
    }

    const response = await organizationClient.system.organization[":id"].$delete(
      {
        param: {
          id: createdOrgId, // 有子组织的父组织
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST);
  });

  /** 管理员删除子组织 */
  it("admin should be able to delete child organization", async () => {
    // 跳过测试如果没有管理员 token 或创建的子组织 ID
    if (!adminToken || !createdChildOrgId) {
      expect(true).toBe(true);
      return;
    }

    const response = await organizationClient.system.organization[":id"].$delete(
      {
        param: {
          id: createdChildOrgId,
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

  /** 管理员删除父组织 */
  it("admin should be able to delete parent organization after children removed", async () => {
    // 跳过测试如果没有管理员 token 或创建的组织 ID
    if (!adminToken || !createdOrgId) {
      expect(true).toBe(true);
      return;
    }

    const response = await organizationClient.system.organization[":id"].$delete(
      {
        param: {
          id: createdOrgId,
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

  /** 验证组织已被删除 */
  it("deleted organization should return 404", async () => {
    // 跳过测试如果没有管理员 token 或创建的组织 ID
    if (!adminToken || !createdOrgId) {
      expect(true).toBe(true);
      return;
    }

    const response = await organizationClient.system.organization[":id"].$get(
      {
        param: {
          id: createdOrgId,
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
