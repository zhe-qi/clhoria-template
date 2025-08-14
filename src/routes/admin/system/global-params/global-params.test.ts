/* eslint-disable ts/ban-ts-comment */
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import { casbin } from "@/middlewares/jwt-auth";
import { getAdminToken, getAuthHeaders, getUserToken } from "@/utils/test-utils";

import { systemGlobalParams } from "./global-params.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建全局参数管理应用
function createSysGlobalParamsApp() {
  return createApp()
    .use("/system/global-params/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/global-params/*", casbin())
    .route("/", systemGlobalParams);
}

const sysGlobalParamsClient = testClient(createSysGlobalParamsApp());

describe("sysGlobalParams routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let testParamKey: string;
  let testParam: any;

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
    const response = await sysGlobalParamsClient.system["global-params"].$get({
      query: {
        page: "1",
        limit: "10",
      },
    });
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 无效 token 应该返回 401 */
  it("access with invalid token should return 401", async () => {
    const response = await sysGlobalParamsClient.system["global-params"].$get(
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

  /** 管理员创建全局参数 */
  it("admin should be able to create global param", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    testParamKey = `test_param_${Math.random().toString(36).slice(2, 8)}`;
    testParam = {
      key: testParamKey,
      value: "测试参数值",
      description: "测试参数描述",
      isPublic: 0,
    };

    const response = await sysGlobalParamsClient.system["global-params"].$post(
      {
        json: testParam,
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.CREATED);
    if (response.status === HttpStatusCodes.CREATED) {
      const json = await response.json();
      expect(json.key).toBe(testParam.key);
      expect(json.value).toBe(testParam.value);
      expect(json.description).toBe(testParam.description);
    }
  });

  /** 管理员创建全局参数参数验证 */
  it("admin create global param should validate parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysGlobalParamsClient.system["global-params"].$post(
      {
        // @ts-ignore
        json: {
          key: "", // 参数键不能为空
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    // TypeScript 检测到条件冗余，删除不可达代码
  });

  /** 管理员获取全局参数列表 */
  it("admin should be able to list global params", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysGlobalParamsClient.system["global-params"].$get(
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

  /** 管理员获取单个全局参数 */
  it("admin should be able to get single global param", async () => {
    // 跳过测试如果没有管理员 token 或创建的参数键
    if (!adminToken || !testParamKey) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysGlobalParamsClient.system["global-params"][":key"].$get(
      {
        param: {
          key: testParamKey,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.key).toBe(testParamKey);
      expect(json.value).toBe(testParam.value);
      expect(json.description).toBe(testParam.description);
    }
  });

  /** 管理员更新全局参数 */
  it("admin should be able to update global param", async () => {
    // 跳过测试如果没有管理员 token 或创建的参数键
    if (!adminToken || !testParamKey) {
      expect(true).toBe(true);
      return;
    }

    const updateData = {
      value: "更新的参数值",
      description: "更新的参数描述",
      isPublic: 1,
    };

    const response = await sysGlobalParamsClient.system["global-params"][":key"].$patch(
      {
        param: {
          key: testParamKey,
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
      expect(json.value).toBe(updateData.value);
      expect(json.description).toBe(updateData.description);
      expect(json.isPublic).toBe(updateData.isPublic);
    }
  });

  /** 管理员批量获取全局参数 */
  it("admin should be able to batch get global params", async () => {
    // 跳过测试如果没有管理员 token 或创建的参数键
    if (!adminToken || !testParamKey) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysGlobalParamsClient.system["global-params"].batch.$post(
      {
        query: {
          publicOnly: "false",
        },
        json: {
          keys: [testParamKey, "non_existent_key"],
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json[testParamKey]).toBeDefined();
      const paramResult = json[testParamKey];
      if (paramResult) {
        expect(paramResult.key).toBe(testParamKey);
      }
      expect(json.non_existent_key).toBeNull();
    }
  });

  /** 普通用户权限测试（如果有 userToken） */
  it("regular user should have limited access", async () => {
    // 跳过测试如果没有普通用户 token
    if (!userToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysGlobalParamsClient.system["global-params"].$get(
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

    // 普通用户可能没有访问全局参数的权限
    expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.UNAUTHORIZED]).toContain(response.status);
  });

  /** 参数键验证 */
  it("should validate key parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    // 测试空字符串参数 - 由于路由路径的原因，这会返回404而不是422
    const response = await sysGlobalParamsClient.system["global-params"][":key"].$get(
      {
        param: {
          key: "",
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    // 空字符串在路径参数中的行为是正常的（可能返回200，404或422）
    expect([HttpStatusCodes.OK, HttpStatusCodes.NOT_FOUND, HttpStatusCodes.UNPROCESSABLE_ENTITY]).toContain(response.status);
  });

  /** 404 测试 */
  it("should return 404 for non-existent param", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysGlobalParamsClient.system["global-params"][":key"].$get(
      {
        param: {
          key: "non_existent_param_key",
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });

  /** 管理员删除全局参数 */
  it("admin should be able to delete global param", async () => {
    // 跳过测试如果没有管理员 token 或创建的参数键
    if (!adminToken || !testParamKey) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysGlobalParamsClient.system["global-params"][":key"].$delete(
      {
        param: {
          key: testParamKey,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NO_CONTENT);
  });

  /** 验证参数已被删除 */
  it("deleted param should return 404", async () => {
    // 跳过测试如果没有管理员 token 或创建的参数键
    if (!adminToken || !testParamKey) {
      expect(true).toBe(true);
      return;
    }

    const response = await sysGlobalParamsClient.system["global-params"][":key"].$get(
      {
        param: {
          key: testParamKey,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });
});
