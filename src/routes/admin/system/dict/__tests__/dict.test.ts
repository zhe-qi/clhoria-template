import { like } from "drizzle-orm";
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import db from "@/db";
import { systemDict } from "@/db/schema";
import env from "@/env";
import { Status } from "@/lib/enums";
import redisClient from "@/lib/redis";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { authorize } from "@/middlewares/authorize";
import systemDictRouter from "@/routes/admin/system/dict/dict.index";
import { getAuthHeaders } from "~/tests/auth-utils";
import { createTestApp } from "~/tests/utils/test-app";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

function createSysDictApp() {
  return createTestApp()
    .use("/system/dict/*", jwt({ secret: env.ADMIN_JWT_SECRET, alg: "HS256" }))
    .use("/system/dict/*", authorize)
    .route("/", systemDictRouter);
}

const client = testClient(createSysDictApp());

// 测试数据
const testDictCode = "test_dict";
const testDict = {
  code: testDictCode,
  name: "测试字典",
  description: "用于测试的字典",
  items: [
    { label: "选项1", value: "1", sort: 1, disabled: false },
    { label: "选项2", value: "2", sort: 2, disabled: false },
    { label: "禁用选项", value: "3", sort: 3, disabled: true },
  ],
  status: Status.ENABLED,
};

/**
 * 清理测试字典数据
 */
async function cleanupTestDicts(): Promise<void> {
  try {
    // 从数据库删除所有测试字典（code 以 test_ 开头）
    await db
      .delete(systemDict)
      .where(like(systemDict.code, "test_%"));

    // 清理 Redis 缓存
    const keys = await redisClient.keys("dict:test_*");
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
  catch (error) {
    console.error("清理测试字典失败:", error);
    throw error;
  }
}

describe("system dict routes", () => {
  let adminToken: string;

  beforeAll(async () => {
    // 清理可能存在的遗留测试数据
    await cleanupTestDicts();

    // 获取 admin token
    const { getAdminToken } = await import("~/tests/auth-utils");
    adminToken = await getAdminToken();
  });

  // 确保测试结束后清理所有测试数据
  afterAll(async () => {
    await cleanupTestDicts();
  });

  describe("authentication & authorization", () => {
    it("should require authentication", async () => {
      const response = await client.system.dict.$get(
        { query: {} },
        {},
      );

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });

    it("should allow authenticated admin requests", async () => {
      const response = await client.system.dict.$get(
        { query: {} },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
    });
  });

  describe("get /system/dict - list dicts", () => {
    it("should list dicts with default pagination", async () => {
      const response = await client.system.dict.$get(
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

    it("should support filtering by code", async () => {
      // 先创建一个字典
      await client.system.dict.$post(
        {
          json: {
            ...testDict,
            code: "test_filter",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      const response = await client.system.dict.$get(
        {
          query: {
            filters: JSON.stringify([
              { field: "code", operator: "contains", value: "test_filter" },
            ]),
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        const items = Array.isArray(json.data) ? json.data : [];

        expect(items.some((dict: { code: string }) =>
          dict.code.includes("test_filter"),
        )).toBe(true);
      }
    });
  });

  describe("post /system/dict - create dict", () => {
    it("should validate required fields", async () => {
      const response = await client.system.dict.$post(
        {
          // @ts-expect-error - 测试必填字段验证
          json: {
            name: "测试字典",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should validate code format", async () => {
      const response = await client.system.dict.$post(
        {
          json: {
            ...testDict,
            code: "Invalid-Code!", // 包含非法字符
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should create a new dict", async () => {
      const response = await client.system.dict.$post(
        {
          json: {
            ...testDict,
            code: "test_create",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);

      if (response.status === HttpStatusCodes.CREATED) {
        const json = await response.json();

        expect(json.data.code).toBe("test_create");
        expect(json.data.name).toBe(testDict.name);
        expect(json.data.items).toHaveLength(3);
      }
    });

    it("should return 409 for duplicate code", async () => {
      const duplicateCode = "test_duplicate";

      // 创建第一个字典
      const response1 = await client.system.dict.$post(
        {
          json: {
            ...testDict,
            code: duplicateCode,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response1.status).toBe(HttpStatusCodes.CREATED);

      // 尝试创建重复的字典
      const response2 = await client.system.dict.$post(
        {
          json: {
            ...testDict,
            code: duplicateCode,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response2.status).toBe(HttpStatusCodes.CONFLICT);

      if (response2.status === HttpStatusCodes.CONFLICT) {
        const json = await response2.json() as { message: string };

        expect(json.message).toContain("已存在");
      }
    });
  });

  describe("get /system/dict/{id} - get dict", () => {
    let dictId: string;

    beforeAll(async () => {
      // 创建一个字典用于测试
      const response = await client.system.dict.$post(
        {
          json: {
            ...testDict,
            code: "test_get",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);

      if (response.status === HttpStatusCodes.CREATED) {
        const json = await response.json();
        dictId = json.data.id;
      }
    });

    it("should validate UUID format", async () => {
      const response = await client.system.dict[":id"].$get(
        { param: { id: "invalid-uuid" } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should return 404 for non-existent dict", async () => {
      const nonExistentId = crypto.randomUUID();
      const response = await client.system.dict[":id"].$get(
        { param: { id: nonExistentId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });

    it("should get dict details", async () => {
      const response = await client.system.dict[":id"].$get(
        { param: { id: dictId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();

        expect(json.data.id).toBe(dictId);
        expect(json.data.code).toBe("test_get");
        expect(json.data.items).toHaveLength(3);
      }
    });
  });

  describe("patch /system/dict/{id} - update dict", () => {
    let dictId: string;

    beforeAll(async () => {
      // 创建一个字典用于测试
      const response = await client.system.dict.$post(
        {
          json: {
            ...testDict,
            code: "test_update",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);

      if (response.status === HttpStatusCodes.CREATED) {
        const json = await response.json();
        dictId = json.data.id;
      }
    });

    it("should update dict fields", async () => {
      const response = await client.system.dict[":id"].$patch(
        {
          param: { id: dictId },
          json: {
            name: "更新后的字典名称",
            description: "更新后的描述",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();

        expect(json.data.name).toBe("更新后的字典名称");
        expect(json.data.description).toBe("更新后的描述");
      }
    });

    it("should return 404 for non-existent dict", async () => {
      const nonExistentId = crypto.randomUUID();
      const response = await client.system.dict[":id"].$patch(
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

  describe("delete /system/dict/{id} - delete dict", () => {
    it("should validate UUID format", async () => {
      const response = await client.system.dict[":id"].$delete(
        { param: { id: "invalid-uuid" } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should return 404 for non-existent dict", async () => {
      const nonExistentId = crypto.randomUUID();
      const response = await client.system.dict[":id"].$delete(
        { param: { id: nonExistentId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });

    it("should delete dict successfully", async () => {
      // 先创建一个字典用于测试删除功能
      const createResponse = await client.system.dict.$post(
        {
          json: {
            ...testDict,
            code: "test_delete",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(createResponse.status).toBe(HttpStatusCodes.CREATED);

      if (createResponse.status !== HttpStatusCodes.CREATED) {
        throw new Error("Failed to create test dict");
      }
      const json = await createResponse.json();
      const deleteTestDictId = json.data.id;

      // 测试删除功能
      const deleteResponse = await client.system.dict[":id"].$delete(
        { param: { id: deleteTestDictId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(deleteResponse.status).toBe(HttpStatusCodes.OK);

      if (deleteResponse.status === HttpStatusCodes.OK) {
        const deleteJson = await deleteResponse.json();

        expect(deleteJson.data.id).toBe(deleteTestDictId);
      }

      // 验证字典已被删除
      const verifyResponse = await client.system.dict[":id"].$get(
        { param: { id: deleteTestDictId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(verifyResponse.status).toBe(HttpStatusCodes.NOT_FOUND);
    });
  });
});
