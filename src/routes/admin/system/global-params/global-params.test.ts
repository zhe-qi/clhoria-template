import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import { casbin } from "@/middlewares/jwt-auth";
import { getAdminToken, getAuthHeaders } from "@/utils/test-utils";

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

describe("global params management", () => {
  let adminToken: string;
  let testParamKey: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
    testParamKey = `test_param_${Math.random().toString(36).slice(2, 8)}`;
  });

  it("should reject unauthenticated access", async () => {
    const response = await sysGlobalParamsClient.system["global-params"].$get({
      query: {},
    });
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  it("should reject invalid token", async () => {
    const response = await sysGlobalParamsClient.system["global-params"].$get(
      {
        query: {},
      },
      {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      },
    );
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  it("should create global parameter", async () => {
    const testParam = {
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

  it("should validate required fields when creating", async () => {
    const response = await sysGlobalParamsClient.system["global-params"].$post(
      {
        json: {
          key: "",
          value: "test",
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
  });

  it("should get global parameters list", async () => {
    const response = await sysGlobalParamsClient.system["global-params"].$get(
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
      expectTypeOf(json.data).toBeArray();
      expect(json.data.length).toBeGreaterThanOrEqual(0);
      expect(typeof json.meta.total).toBe("number");
      expect(json.meta.skip).toBe(0);
      expect(json.meta.take).toBe(10);
    }
  });

  it("should get single global parameter", async () => {
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
      expect(json.value).toBe("测试参数值");
      expect(json.description).toBe("测试参数描述");
    }
  });

  it("should update global parameter", async () => {
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

  it("should batch get global parameters", async () => {
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

  it("should return 404 for non-existent parameter", async () => {
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

  it("should delete global parameter", async () => {
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

  it("should return 404 after deletion", async () => {
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
