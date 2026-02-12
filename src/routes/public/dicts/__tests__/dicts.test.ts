import { like } from "drizzle-orm";
import { testClient } from "hono/testing";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import db from "@/db";
import { systemDicts } from "@/db/schema";
import env from "@/env";
import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { Status } from "@/lib/enums";
import redisClient from "@/lib/services/redis";
import dictsRouter from "@/routes/public/dicts/dicts.index";
import { createTestApp } from "~/tests/utils/test-app";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

function createDictsApp() {
  return createTestApp().route("/", dictsRouter);
}

const client = testClient(createDictsApp());

// 测试数据
const testDictCode = "public_test_dict";
const testDict = {
  code: testDictCode,
  name: "公共测试字典",
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
    // 从数据库删除所有测试字典（code 以 public_test_ 开头）
    await db
      .delete(systemDicts)
      .where(like(systemDicts.code, "public_test_%"));

    // 清理 Redis 缓存
    const keys = await redisClient.keys("dict:public_test_*");
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
  catch (error) {
    console.error("清理测试字典失败:", error);
    throw error;
  }
}

describe("public dicts routes", () => {
  beforeAll(async () => {
    // 清理可能存在的遗留测试数据
    await cleanupTestDicts();

    // 创建测试字典
    await db.insert(systemDicts).values(testDict);
  });

  afterAll(async () => {
    await cleanupTestDicts();
  });

  describe("get /dicts/{code} - get dict items by code", () => {
    it("should validate code format", async () => {
      const response = await client.dicts[":code"].$get({
        param: { code: "Invalid-Code!" },
      });

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should return 404 for non-existent dict", async () => {
      const response = await client.dicts[":code"].$get({
        param: { code: "non_existent_dict" },
      });

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);

      if (response.status === HttpStatusCodes.NOT_FOUND) {
        const json = await response.json() as { message: string };

        expect(json.message).toContain("不存在");
      }
    });

    it("should return 404 for disabled dict", async () => {
      // 创建一个禁用的字典
      const disabledCode = "public_test_disabled";
      await db.insert(systemDicts).values({
        ...testDict,
        code: disabledCode,
        status: Status.DISABLED,
      });

      const response = await client.dicts[":code"].$get({
        param: { code: disabledCode },
      });

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });

    it("should get dict items successfully", async () => {
      const response = await client.dicts[":code"].$get({
        param: { code: testDictCode },
      });

      expect(response.status).toBe(HttpStatusCodes.OK);

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();

        expect(json.data.code).toBe(testDictCode);
        expect(json.data.name).toBe(testDict.name);
        expect(json.data.items).toBeInstanceOf(Array);
        // 禁用的选项应该被过滤掉
        expect(json.data.items).toHaveLength(2);
        expect(json.data.items.every((item: { disabled?: boolean }) => !item.disabled)).toBe(true);
      }
    });

    it("should use Redis cache on subsequent requests", async () => {
      const cacheKey = `dict:${testDictCode}`;

      // 先清除缓存
      await redisClient.del(cacheKey);

      // 第一次请求（应该从数据库查询）
      const response1 = await client.dicts[":code"].$get({
        param: { code: testDictCode },
      });

      expect(response1.status).toBe(HttpStatusCodes.OK);

      // 验证缓存已写入
      const cached = await redisClient.get(cacheKey);

      expect(cached).not.toBeNull();

      // 第二次请求（应该从缓存获取）
      const response2 = await client.dicts[":code"].$get({
        param: { code: testDictCode },
      });

      expect(response2.status).toBe(HttpStatusCodes.OK);

      // 两次请求的数据应该一致
      if (response1.status === HttpStatusCodes.OK && response2.status === HttpStatusCodes.OK) {
        const json1 = await response1.json();
        const json2 = await response2.json();

        expect(json1.data).toEqual(json2.data);
      }
    });
  });
});
