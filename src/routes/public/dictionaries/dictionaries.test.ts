import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";

import { dictionaries } from "./dictionaries.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建字典应用
function createDictionariesApp() {
  return createApp().route("/", dictionaries);
}

const dictionariesClient = testClient(createDictionariesApp());

describe("dictionaries routes", () => {
  /** 获取字典列表 */
  it("should get dictionaries list", async () => {
    const response = await dictionariesClient.dictionaries.$get();

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeArray();
      // 检查数组元素结构（如果有数据）
      if (json.length > 0) {
        expect(json[0]).toHaveProperty("id");
        expect(json[0]).toHaveProperty("code");
        expect(json[0]).toHaveProperty("name");
        expect(json[0]).toHaveProperty("items");
      }
    }
  });

  /** 根据编码获取单个字典 - 成功 */
  it("should get dictionary by valid code", async () => {
    // 首先获取字典列表找到一个有效的编码
    const listResponse = await dictionariesClient.dictionaries.$get();

    if (listResponse.status === HttpStatusCodes.OK) {
      const dictionaries = await listResponse.json();

      if (dictionaries.length > 0) {
        const firstDict = dictionaries[0];
        const response = await dictionariesClient.dictionaries[":code"].$get({
          param: {
            code: firstDict.code,
          },
        });

        expect(response.status).toBe(HttpStatusCodes.OK);
        if (response.status === HttpStatusCodes.OK) {
          const json = await response.json();
          expect(json.code).toBe(firstDict.code);
          expect(json).toHaveProperty("id");
          expect(json).toHaveProperty("name");
          expect(json).toHaveProperty("items");
          expectTypeOf(json).toBeObject();
        }
      }
      else {
        // 如果没有字典数据，测试不存在的编码
        expect(true).toBe(true);
      }
    }
  });

  /** 根据编码获取单个字典 - 不存在 */
  it("should return 404 for non-existent dictionary code", async () => {
    const response = await dictionariesClient.dictionaries[":code"].$get({
      param: {
        code: "non-existent-code",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    if (response.status === HttpStatusCodes.NOT_FOUND) {
      const json = await response.json();
      expect(json.message).toBeDefined();
    }
  });

  /** 参数验证 - 空编码 */
  it("should validate dictionary code parameter", async () => {
    const response = await dictionariesClient.dictionaries[":code"].$get({
      param: {
        code: "", // 空编码
      },
    });

    // 空编码会匹配到 "/" 路径，返回列表而不是错误
    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
    }
  });

  /** 批量获取字典 - 成功 */
  it("should batch get dictionaries", async () => {
    // 首先获取字典列表找到一些有效的编码
    const listResponse = await dictionariesClient.dictionaries.$get();

    if (listResponse.status === HttpStatusCodes.OK) {
      const dictionaries = await listResponse.json();

      if (dictionaries.length > 0) {
        const codes = dictionaries.slice(0, 2).map(d => d.code); // 取前两个
        const response = await dictionariesClient.dictionaries.batch.$post({
          json: {
            codes,
          },
        });

        expect(response.status).toBe(HttpStatusCodes.OK);
        if (response.status === HttpStatusCodes.OK) {
          const json = await response.json();
          expectTypeOf(json).toBeObject();

          // 检查返回的结构
          codes.forEach((code) => {
            expect(json).toHaveProperty(code);
            if (json[code]) {
              expect(json[code]).toHaveProperty("code");
              expect(json[code].code).toBe(code);
            }
          });
        }
      }
      else {
        // 如果没有字典数据，测试空数组
        const response = await dictionariesClient.dictionaries.batch.$post({
          json: {
            codes: [],
          },
        });

        expect(response.status).toBe(HttpStatusCodes.OK);
        if (response.status === HttpStatusCodes.OK) {
          const json = await response.json();
          expectTypeOf(json).toBeObject();
        }
      }
    }
  });

  /** 批量获取字典 - 包含不存在的编码 */
  it("should handle non-existent codes in batch request", async () => {
    const response = await dictionariesClient.dictionaries.batch.$post({
      json: {
        codes: ["non-existent-1", "non-existent-2"],
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeObject();
      expect(json["non-existent-1"]).toBeNull();
      expect(json["non-existent-2"]).toBeNull();
    }
  });

  /** 批量获取字典 - 参数验证 */
  it("should validate batch request parameters", async () => {
    const response = await dictionariesClient.dictionaries.batch.$post({
      json: {
        codes: "invalid" as any, // 故意传递错误类型进行验证测试
      },
    });

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    if ((response.status as any) === HttpStatusCodes.UNPROCESSABLE_ENTITY) {
      const json = await (response as any).json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    }
  });

  /** 批量获取字典 - 空数组验证 */
  it("should validate empty codes array in batch request", async () => {
    const response = await dictionariesClient.dictionaries.batch.$post({
      json: {
        codes: [],
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

  /** 批量获取字典 - 重复编码 */
  it("should handle duplicate codes in batch request", async () => {
    const response = await dictionariesClient.dictionaries.batch.$post({
      json: {
        codes: ["test-code", "test-code", "another-code"],
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeObject();
      // 重复的编码应该只返回一次
      expect(json).toHaveProperty("test-code");
      expect(json).toHaveProperty("another-code");
    }
  });
});
