import { like } from "drizzle-orm";
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import db from "@/db";
import { systemParams } from "@/db/schema";
import env from "@/env";
import { ParamValueType, Status } from "@/lib/enums";
import redisClient from "@/lib/redis";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { authorize } from "@/middlewares/authorize";
import systemParamsRouter from "@/routes/admin/system/params/params.index";
import { getAuthHeaders } from "~/tests/auth-utils";
import { createTestApp } from "~/tests/utils/test-app";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

function createSysParamApp() {
  return createTestApp()
    .use("/system/params/*", jwt({ secret: env.ADMIN_JWT_SECRET, alg: "HS256" }))
    .use("/system/params/*", authorize)
    .route("/", systemParamsRouter);
}

const client = testClient(createSysParamApp());

// 测试数据
const testParamKey = "test_param";
const testParam = {
  key: testParamKey,
  name: "测试参数",
  value: "test_value",
  valueType: ParamValueType.STRING,
  description: "用于测试的参数",
  status: Status.ENABLED,
};

/**
 * 清理测试参数数据
 */
async function cleanupTestParams(): Promise<void> {
  try {
    // 从数据库删除所有测试参数（key 以 test_ 开头）
    await db
      .delete(systemParams)
      .where(like(systemParams.key, "test_%"));

    // 清理 Redis 缓存
    const keys = await redisClient.keys("param:test_*");
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
  catch (error) {
    console.error("清理测试参数失败:", error);
    throw error;
  }
}

describe("system params routes", () => {
  let adminToken: string;

  beforeAll(async () => {
    // 清理可能存在的遗留测试数据
    await cleanupTestParams();

    // 获取 admin token
    const { getAdminToken } = await import("~/tests/auth-utils");
    adminToken = await getAdminToken();
  });

  // 确保测试结束后清理所有测试数据
  afterAll(async () => {
    await cleanupTestParams();
  });

  describe("authentication & authorization", () => {
    it("should require authentication", async () => {
      const response = await client.system.params.$get(
        { query: {} },
        {},
      );

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });

    it("should allow authenticated admin requests", async () => {
      const response = await client.system.params.$get(
        { query: {} },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
    });
  });

  describe("get /system/params - list params", () => {
    it("should list params with default pagination", async () => {
      const response = await client.system.params.$get(
        { query: {} },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();

        expect(json.data).toBeDefined();
        expect(Array.isArray(json.data)).toBe(true);
      }
    });

    it("should support filtering by key", async () => {
      // 先创建一个参数
      await client.system.params.$post(
        {
          json: {
            ...testParam,
            key: "test_filter",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      const response = await client.system.params.$get(
        {
          query: {
            filters: JSON.stringify([
              { field: "key", operator: "contains", value: "test_filter" },
            ]),
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        const items = Array.isArray(json.data) ? json.data : [];

        expect(items.some((param: { key: string }) =>
          param.key.includes("test_filter"),
        )).toBe(true);
      }
    });
  });

  describe("post /system/params - create param", () => {
    it("should validate required fields", async () => {
      const response = await client.system.params.$post(
        {
          // @ts-expect-error - 测试必填字段验证
          json: {
            name: "测试参数",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should validate key format", async () => {
      const response = await client.system.params.$post(
        {
          json: {
            ...testParam,
            key: "Invalid-Key!", // 包含非法字符
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should create a new param", async () => {
      const response = await client.system.params.$post(
        {
          json: {
            ...testParam,
            key: "test_create",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);

      if (response.status === HttpStatusCodes.CREATED) {
        const json = await response.json();

        expect(json.data.key).toBe("test_create");
        expect(json.data.name).toBe(testParam.name);
        expect(json.data.value).toBe(testParam.value);
        expect(json.data.valueType).toBe(ParamValueType.STRING);
      }
    });

    it("should return 409 for duplicate key", async () => {
      const duplicateKey = "test_duplicate";

      // 创建第一个参数
      const response1 = await client.system.params.$post(
        {
          json: {
            ...testParam,
            key: duplicateKey,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response1.status).toBe(HttpStatusCodes.CREATED);

      // 尝试创建重复的参数
      const response2 = await client.system.params.$post(
        {
          json: {
            ...testParam,
            key: duplicateKey,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      // 数据库唯一约束错误由全局 onError 处理，返回 409
      expect(response2.status).toBe(HttpStatusCodes.CONFLICT);

      const json = await response2.json() as { message: string };

      expect(json.message).toContain("已存在");
    });
  });

  describe("get /system/params/{id} - get param", () => {
    let paramId: string;

    beforeAll(async () => {
      // 创建一个参数用于测试
      const response = await client.system.params.$post(
        {
          json: {
            ...testParam,
            key: "test_get",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);

      if (response.status === HttpStatusCodes.CREATED) {
        const json = await response.json();
        paramId = json.data.id;
      }
    });

    it("should validate UUID format", async () => {
      const response = await client.system.params[":id"].$get(
        { param: { id: "invalid-uuid" } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should return 404 for non-existent param", async () => {
      const nonExistentId = crypto.randomUUID();
      const response = await client.system.params[":id"].$get(
        { param: { id: nonExistentId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });

    it("should get param details", async () => {
      const response = await client.system.params[":id"].$get(
        { param: { id: paramId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();

        expect(json.data.id).toBe(paramId);
        expect(json.data.key).toBe("test_get");
      }
    });
  });

  describe("patch /system/params/{id} - update param", () => {
    let paramId: string;

    beforeAll(async () => {
      // 创建一个参数用于测试
      const response = await client.system.params.$post(
        {
          json: {
            ...testParam,
            key: "test_update",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);

      if (response.status === HttpStatusCodes.CREATED) {
        const json = await response.json();
        paramId = json.data.id;
      }
    });

    it("should update param fields", async () => {
      const response = await client.system.params[":id"].$patch(
        {
          param: { id: paramId },
          json: {
            name: "更新后的参数名称",
            value: "updated_value",
            description: "更新后的描述",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();

        expect(json.data.name).toBe("更新后的参数名称");
        expect(json.data.value).toBe("updated_value");
        expect(json.data.description).toBe("更新后的描述");
      }
    });

    it("should return 404 for non-existent param", async () => {
      const nonExistentId = crypto.randomUUID();
      const response = await client.system.params[":id"].$patch(
        {
          param: { id: nonExistentId },
          json: {
            name: "测试",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });
  });

  describe("delete /system/params/{id} - delete param", () => {
    it("should validate UUID format", async () => {
      const response = await client.system.params[":id"].$delete(
        { param: { id: "invalid-uuid" } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should return 404 for non-existent param", async () => {
      const nonExistentId = crypto.randomUUID();
      const response = await client.system.params[":id"].$delete(
        { param: { id: nonExistentId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });

    it("should delete param successfully", async () => {
      // 先创建一个参数用于测试删除功能
      const createResponse = await client.system.params.$post(
        {
          json: {
            ...testParam,
            key: "test_delete",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(createResponse.status).toBe(HttpStatusCodes.CREATED);

      if (createResponse.status !== HttpStatusCodes.CREATED) {
        throw new Error("Failed to create test param");
      }
      const json = await createResponse.json();
      const deleteTestParamId = json.data.id;

      // 测试删除功能
      const deleteResponse = await client.system.params[":id"].$delete(
        { param: { id: deleteTestParamId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(deleteResponse.status).toBe(HttpStatusCodes.OK);

      if (deleteResponse.status === HttpStatusCodes.OK) {
        const deleteJson = await deleteResponse.json();

        expect(deleteJson.data.id).toBe(deleteTestParamId);
      }

      // 验证参数已被删除
      const verifyResponse = await client.system.params[":id"].$get(
        { param: { id: deleteTestParamId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(verifyResponse.status).toBe(HttpStatusCodes.NOT_FOUND);
    });
  });
});
