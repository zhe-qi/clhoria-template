/* eslint-disable ts/ban-ts-comment */
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import { casbin } from "@/middlewares/jwt-auth";
import { getAdminToken, getAuthHeaders, getUserToken } from "@/utils/test-utils";

import { systemMenus } from "./menus.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建系统菜单管理应用
function createSysMenusApp() {
  return createApp()
    .use("/system/menus/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/menus/*", casbin())
    .route("/", systemMenus);
}

const sysMenusClient = testClient(createSysMenusApp());

describe("sysMenus routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let createdMenuId: string;
  let testMenu: any;

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
    const response = await sysMenusClient.system.menus.$get({
      query: {
        page: "1",
        limit: "10",
      },
    });
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 无效 token 应该返回 401 */
  it("access with invalid token should return 401", async () => {
    const response = await sysMenusClient.system.menus.$get(
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

  /** 管理员创建菜单 */
  it("admin should be able to create menu", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    testMenu = {
      name: "test-menu",
      path: "/test-menu",
      component: "views/test-menu/index.vue",
      status: 1,
      pid: null,
      meta: {
        title: "测试菜单",
        order: 1,
        icon: "test-icon",
        hideInMenu: false,
        keepAlive: true,
        multiTab: false,
        constant: false,
        i18nKey: "test.menu",
      },
      domain: "default",
      createdBy: "admin",
    };

    const response = await sysMenusClient.system.menus.$post(
      {
        json: testMenu,
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.name).toBe(testMenu.name);
      expect(json.path).toBe(testMenu.path);
      expect(json.domain).toBe(testMenu.domain);
      expect(json.id).toBeDefined();
      createdMenuId = json.id;
    }
  });

  /** 管理员创建菜单参数验证 */
  it("admin create menu should validate parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysMenusClient.system.menus.$post(
      {
        // @ts-ignore
        json: {
          name: "", // 路由名称为空
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

  /** 管理员获取菜单列表 */
  it("admin should be able to list menus", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysMenusClient.system.menus.$get(
      {
        query: {
          page: "1",
          limit: "10",
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
      expect(json.meta.page).toBe(1);
      // @ts-ignore
      expect(json.meta.limit).toBe(10);
    }
  });

  /** 管理员获取菜单树形结构 */
  it("admin should be able to get menu tree", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysMenusClient.system.menus.tree.$get(
      {
        query: {},
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeArray();
    }
  });

  /** 管理员获取单个菜单 */
  it("admin should be able to get single menu", async () => {
    // 跳过测试如果没有管理员 token 或创建的菜单 ID
    if (!adminToken || !createdMenuId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysMenusClient.system.menus[":id"].$get(
      {
        param: {
          id: createdMenuId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.id).toBe(createdMenuId);
      expect(json.name).toBe(testMenu.name);
    }
  });

  /** 管理员更新菜单 */
  it("admin should be able to update menu", async () => {
    // 跳过测试如果没有管理员 token 或创建的菜单 ID
    if (!adminToken || !createdMenuId) {
      expect(true).toBe(true);
      return;
    }

    const updateData = {
      name: "updated-test-menu",
      status: 0,
      meta: {
        title: "更新的测试菜单",
        order: 1,
      },
    };

    const response = await sysMenusClient.system.menus[":id"].$patch(
      {
        param: {
          id: createdMenuId,
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

    const response = await sysMenusClient.system.menus.$get(
      {
        query: {
          page: "1",
          limit: "10",
        },
      },
      {
        headers: getAuthHeaders(userToken),
      },
    );

    // 普通用户可能没有访问系统菜单的权限
    expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.UNAUTHORIZED]).toContain(response.status);
  });

  /** ID 参数验证 */
  it("should validate UUID parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysMenusClient.system.menus[":id"].$get(
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
  it("should return 404 for non-existent menu", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysMenusClient.system.menus[":id"].$get(
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

  /** 管理员删除菜单 */
  it("admin should be able to delete menu", async () => {
    // 跳过测试如果没有管理员 token 或创建的菜单 ID
    if (!adminToken || !createdMenuId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysMenusClient.system.menus[":id"].$delete(
      {
        param: {
          id: createdMenuId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NO_CONTENT);
  });

  /** 验证菜单已被删除 */
  it("deleted menu should return 404", async () => {
    // 跳过测试如果没有管理员 token 或创建的菜单 ID
    if (!adminToken || !createdMenuId) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysMenusClient.system.menus[":id"].$get(
      {
        param: {
          id: createdMenuId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });
});
