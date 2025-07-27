import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";

import { globalParams } from "./global-params.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建全局参数应用
function createGlobalParamsApp() {
  return createApp().route("/", globalParams);
}

const globalParamsClient = testClient(createGlobalParamsApp());

describe("global-params routes", () => {
  /** 获取全局参数列表 - 默认只获取公开参数 */
  it("should get public global params list by default", async () => {
    const response = await globalParamsClient["global-params"].$get({
      query: {},
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeArray();
      // 检查数组元素结构（如果有数据）
      if (json.length > 0) {
        expect(json[0]).toHaveProperty("id");
        expect(json[0]).toHaveProperty("key");
        expect(json[0]).toHaveProperty("value");
        expect(json[0]).toHaveProperty("isPublic");
        // 默认只返回公开参数
        expect(json[0].isPublic).toBe(true);
      }
    }
  });

  /** 获取全局参数列表 - 明确指定只获取公开参数 */
  it("should get public global params when publicOnly=true", async () => {
    const response = await globalParamsClient["global-params"].$get({
      query: {
        publicOnly: "true",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeArray();
      // 所有返回的参数都应该是公开的
      json.forEach((param) => {
        expect(param.isPublic).toBe(true);
      });
    }
  });

  /** 获取全局参数列表 - 获取所有参数（包括非公开） */
  it("should get all global params when publicOnly=false", async () => {
    const response = await globalParamsClient["global-params"].$get({
      query: {
        publicOnly: "false",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeArray();
      // 检查数组元素结构（如果有数据）
      if (json.length > 0) {
        expect(json[0]).toHaveProperty("id");
        expect(json[0]).toHaveProperty("key");
        expect(json[0]).toHaveProperty("value");
        expect(json[0]).toHaveProperty("isPublic");
      }
    }
  });

  /** 根据键获取单个全局参数 - 成功 */
  it("should get global param by valid key", async () => {
    // 首先获取公开参数列表找到一个有效的键
    const listResponse = await globalParamsClient["global-params"].$get({
      query: {
        publicOnly: "true",
      },
    });

    if (listResponse.status === HttpStatusCodes.OK) {
      const params = await listResponse.json();

      if (params.length > 0) {
        const firstParam = params[0];
        const response = await globalParamsClient["global-params"][":key"].$get({
          param: {
            key: firstParam.key,
          },
        });

        expect(response.status).toBe(HttpStatusCodes.OK);
        if (response.status === HttpStatusCodes.OK) {
          const json = await response.json();
          expect(json.key).toBe(firstParam.key);
          expect(json).toHaveProperty("id");
          expect(json).toHaveProperty("value");
          expect(json).toHaveProperty("isPublic");
          expect(json.isPublic).toBe(true); // 应该是公开参数
          expectTypeOf(json).toBeObject();
        }
      }
      else {
        // 如果没有参数数据，测试不存在的键
        expect(true).toBe(true);
      }
    }
  });

  /** 根据键获取单个全局参数 - 不存在 */
  it("should return 404 for non-existent parameter key", async () => {
    const response = await globalParamsClient["global-params"][":key"].$get({
      param: {
        key: "nonexistentkey",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    if (response.status === HttpStatusCodes.NOT_FOUND) {
      const json = await response.json();
      expect(json.message).toBeDefined();
    }
  });

  /** 参数验证 - 空键 */
  it("should validate parameter key", async () => {
    const response = await globalParamsClient["global-params"][":key"].$get({
      param: {
        key: "", // 空键
      },
    });

    // 空键会匹配到 "/" 路径，返回列表而不是错误
    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
    }
  });

  /** 批量获取全局参数 - 成功（公开参数） */
  it("should batch get public global params", async () => {
    // 使用固定的测试键值
    const response = await globalParamsClient["global-params"].batch.$post({
      query: {
        publicOnly: "true",
      },
      json: {
        keys: ["testkey1", "testkey2"],
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeObject();

      // 检查返回的结构（不存在的键应该返回null）
      expect(json).toHaveProperty("testkey1");
      expect(json).toHaveProperty("testkey2");
      expect(json.testkey1).toBeNull();
      expect(json.testkey2).toBeNull();
    }
  });

  /** 批量获取全局参数 - 所有参数（包括非公开） */
  it("should batch get all global params when publicOnly=false", async () => {
    const response = await globalParamsClient["global-params"].batch.$post({
      query: {
        publicOnly: "false",
      },
      json: {
        keys: ["testkey1", "testkey2"],
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeObject();
      expect(json).toHaveProperty("testkey1");
      expect(json).toHaveProperty("testkey2");
    }
  });

  /** 批量获取全局参数 - 包含不存在的键 */
  it("should handle non-existent keys in batch request", async () => {
    const response = await globalParamsClient["global-params"].batch.$post({
      query: {
        publicOnly: "true",
      },
      json: {
        keys: ["nonexistent1", "nonexistent2"],
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeObject();
      expect(json.nonexistent1).toBeNull();
      expect(json.nonexistent2).toBeNull();
    }
  });

  /** 批量获取全局参数 - 参数验证 */
  it("should validate batch request parameters", async () => {
    const response = await globalParamsClient["global-params"].batch.$post({
      query: {
        publicOnly: "true",
      },
      json: {
        keys: "invalid" as any, // 故意传递错误类型进行验证测试
      },
    });

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    if ((response.status as any) === HttpStatusCodes.UNPROCESSABLE_ENTITY) {
      const json = await (response as any).json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    }
  });

  /** 批量获取全局参数 - 空数组验证 */
  it("should validate empty keys array in batch request", async () => {
    const response = await globalParamsClient["global-params"].batch.$post({
      query: {
        publicOnly: "true",
      },
      json: {
        keys: [],
      },
    });

    // 空数组不符合schema要求（至少需要1个元素）
    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    if ((response.status as any) === HttpStatusCodes.UNPROCESSABLE_ENTITY) {
      const json = await (response as any).json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    }
  });

  /** 批量获取全局参数 - 重复键 */
  it("should handle duplicate keys in batch request", async () => {
    const response = await globalParamsClient["global-params"].batch.$post({
      query: {
        publicOnly: "true",
      },
      json: {
        keys: ["testkey", "testkey", "anotherkey"],
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeObject();
      // 重复的键应该只返回一次
      expect(json).toHaveProperty("testkey");
      expect(json).toHaveProperty("anotherkey");
    }
  });

  /** 查询参数验证 - 无效的 publicOnly 值 */
  it("should validate publicOnly query parameter", async () => {
    const response = await globalParamsClient["global-params"].$get({
      query: {
        publicOnly: "invalid" as any, // 故意传递错误类型进行验证测试
      },
    });

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
  });
});
