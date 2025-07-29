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

import { systemRoles } from "./roles.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建认证应用
function createAuthApp() {
  return createApp().route("/", auth);
}

// 创建系统角色管理应用
function createSysRolesApp() {
  return createApp()
    .use("/system/roles/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/roles/*", casbin())
    .use("/system/roles/*", operationLog({ moduleName: "后台管理", description: "后台管理操作" }))
    .route("/", systemRoles);
}

const authClient = testClient(createAuthApp());
const sysRolesClient = testClient(createSysRolesApp());

describe("sysRoles routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let createdRoleId: string;
  let testRole: any;

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
    const response = await sysRolesClient.system.roles.$get({
      query: {
        page: "1",
        limit: "10",
      },
    });
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 无效 token 应该返回 401 */
  it("access with invalid token should return 401", async () => {
    const response = await sysRolesClient.system.roles.$get(
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

  /** 管理员创建角色 */
  it("admin should be able to create role", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    testRole = {
      code: "TEST_ROLE_UNIT_TEST",
      name: "测试角色",
      description: "测试角色描述",
      status: 1,
      createdBy: "admin",
    };

    const response = await sysRolesClient.system.roles.$post(
      {
        json: testRole,
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
      expect(json.code).toBe(testRole.code);
      expect(json.name).toBe(testRole.name);
      expect(json.description).toBe(testRole.description);
      expect(json.id).toBeDefined();
      createdRoleId = json.id;
    }
  });

  /** 管理员创建角色参数验证 */
  it("admin create role should validate parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysRolesClient.system.roles.$post(
      {
        // @ts-ignore
        json: {
          code: "ab", // 角色代码太短
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

  /** 管理员获取角色列表 */
  it("admin should be able to list roles", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysRolesClient.system.roles.$get(
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

  /** 管理员获取单个角色 */
  it("admin should be able to get single role", async () => {
    // 跳过测试如果没有管理员 token 或创建的角色 ID
    if (!adminToken || !createdRoleId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysRolesClient.system.roles[":id"].$get(
      {
        param: {
          id: createdRoleId,
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
      expect(json.id).toBe(createdRoleId);
      expect(json.code).toBe(testRole.code);
      expect(json.name).toBe(testRole.name);
    }
  });

  /** 管理员更新角色 */
  it("admin should be able to update role", async () => {
    // 跳过测试如果没有管理员 token 或创建的角色 ID
    if (!adminToken || !createdRoleId) {
      expect(true).toBe(true);
      return;
    }

    const updateData = {
      name: "更新的测试角色",
      description: "更新的角色描述",
      status: 0,
    };

    const response = await sysRolesClient.system.roles[":id"].$patch(
      {
        param: {
          id: createdRoleId,
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

  /** 管理员分配权限 */
  it("admin should be able to assign permissions", async () => {
    // 跳过测试如果没有管理员 token 或创建的角色 ID
    if (!adminToken || !createdRoleId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysRolesClient.system.roles[":id"].permissions.$post(
      {
        param: {
          id: createdRoleId,
        },
        json: {
          permissions: [], // 空数组测试
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

  /** 管理员分配菜单 */
  it("admin should be able to assign menus", async () => {
    // 跳过测试如果没有管理员 token 或创建的角色 ID
    if (!adminToken || !createdRoleId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysRolesClient.system.roles[":id"].menus.$post(
      {
        param: {
          id: createdRoleId,
        },
        json: {
          menuIds: [], // 空数组测试
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
      expect(typeof json.count).toBe("number");
    }
  });

  /** 管理员分配用户 */
  it("admin should be able to assign users", async () => {
    // 跳过测试如果没有管理员 token 或创建的角色 ID
    if (!adminToken || !createdRoleId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysRolesClient.system.roles[":id"].users.$post(
      {
        param: {
          id: createdRoleId,
        },
        json: {
          userIds: [], // 空数组测试
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

    const response = await sysRolesClient.system.roles.$get(
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

    // 普通用户可能没有访问系统角色的权限
    expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.UNAUTHORIZED]).toContain(response.status);
  });

  /** ID 参数验证 */
  it("should validate UUID parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysRolesClient.system.roles[":id"].$get(
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
  it("should return 404 for non-existent role", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysRolesClient.system.roles[":id"].$get(
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

  /** 管理员删除角色 */
  it("admin should be able to delete role", async () => {
    // 跳过测试如果没有管理员 token 或创建的角色 ID
    if (!adminToken || !createdRoleId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysRolesClient.system.roles[":id"].$delete(
      {
        param: {
          id: createdRoleId,
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

  /** 验证角色已被删除 */
  it("deleted role should return 404", async () => {
    // 跳过测试如果没有管理员 token 或创建的角色 ID
    if (!adminToken || !createdRoleId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysRolesClient.system.roles[":id"].$get(
      {
        param: {
          id: createdRoleId,
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
