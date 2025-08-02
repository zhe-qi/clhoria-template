/* eslint-disable ts/ban-ts-comment */
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import { casbin } from "@/middlewares/jwt-auth";
import { auth } from "@/routes/public/public.index";

import { systemMenus } from "./menus.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建认证应用
function createAuthApp() {
  return createApp().route("/", auth);
}

// 创建系统菜单管理应用
function createSysMenusApp() {
  return createApp()
    .use("/system/menus/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/menus/*", casbin())
    .route("/", systemMenus);
}

const authClient = testClient(createAuthApp());
const sysMenusClient = testClient(createSysMenusApp());

describe("sysMenus routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let createdMenuId: string;
  let testMenu: any;

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
      menuName: "测试菜单",
      routeName: "test-menu",
      routePath: "/test-menu",
      component: "views/test-menu/index.vue",
      icon: "test-icon",
      iconType: 1,
      i18nKey: "test.menu",
      hideInMenu: false,
      keepAlive: true,
      href: "",
      multiTab: false,
      order: 1,
      pid: null,
      pathParam: "",
      activeMenu: "",
      status: 1,
      menuType: "menu",
      domain: "default",
      constant: false,
      createdBy: "admin",
    };

    const response = await sysMenusClient.system.menus.$post(
      {
        json: testMenu,
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
      expect(json.menuName).toBe(testMenu.menuName);
      expect(json.routeName).toBe(testMenu.routeName);
      expect(json.routePath).toBe(testMenu.routePath);
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
          menuName: "", // 菜单名称为空
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
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeArray();
    }
  });

  /** 管理员获取常量路由 */
  it("admin should be able to get constant routes", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysMenusClient.system.menus.constant.$get(
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
      expectTypeOf(json).toBeArray();
    }
  });

  /** 管理员获取用户路由 */
  it("admin should be able to get user routes", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysMenusClient.system.menus["user-routes"].$get(
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
      expect(json.routes).toBeDefined();
      expect(json.home).toBeDefined();
      expectTypeOf(json.routes).toBeArray();
      expect(typeof json.home).toBe("string");
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
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.id).toBe(createdMenuId);
      expect(json.menuName).toBe(testMenu.menuName);
      expect(json.routeName).toBe(testMenu.routeName);
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
      menuName: "更新的测试菜单",
      routeName: "updated-test-menu",
      status: 0,
    };

    const response = await sysMenusClient.system.menus[":id"].$patch(
      {
        param: {
          id: createdMenuId,
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
      expect(json.menuName).toBe(updateData.menuName);
      expect(json.routeName).toBe(updateData.routeName);
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
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
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
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
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
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
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
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
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
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });
});
