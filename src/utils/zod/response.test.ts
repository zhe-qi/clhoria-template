/* eslint-disable unicorn/error-message */
import { describe, expect, it } from "vitest";
import { z, ZodError } from "zod";

import { Resp, respErrSchema } from "./response";

describe("Response Utils", () => {
  describe("Resp.ok", () => {
    it("应该返回包含 data 字段的成功响应", () => {
      const result = Resp.ok({ id: 1, name: "测试" });

      expect(result).toEqual({ data: { id: 1, name: "测试" } });
    });

    it("应该支持不同类型的数据", () => {
      expect(Resp.ok("字符串")).toEqual({ data: "字符串" });
      expect(Resp.ok(123)).toEqual({ data: 123 });
      expect(Resp.ok(null)).toEqual({ data: null });
      expect(Resp.ok([1, 2, 3])).toEqual({ data: [1, 2, 3] });
    });

    it("应该支持额外扩展字段", () => {
      const result = Resp.ok(
        { id: 1 },
        { total: 100, page: 1 },
      );

      expect(result).toEqual({
        data: { id: 1 },
        total: 100,
        page: 1,
      });
    });

    it("应该支持空 extra 参数", () => {
      const result = Resp.ok({ id: 1 }, undefined);

      expect(result).toEqual({ data: { id: 1 } });
    });
  });

  describe("Resp.fail", () => {
    describe("字符串输入", () => {
      it("应该返回包含 message 的错误响应", () => {
        const result = Resp.fail("操作失败");

        expect(result).toEqual({ message: "操作失败" });
      });

      it("应该支持额外扩展字段", () => {
        const result = Resp.fail("操作失败", { code: "ERR_001" });

        expect(result).toEqual({
          message: "操作失败",
          code: "ERR_001",
        });
      });
    });

    describe("Error 输入", () => {
      it("应该提取 Error 的 message", () => {
        const error = new Error("系统错误");
        const result = Resp.fail(error);

        expect(result.message).toBe("系统错误");
      });

      it("应该包含 stack 字段", () => {
        const error = new Error("系统错误");
        const result = Resp.fail(error);

        expect(result.stack).toBeDefined();
        expect(result.stack).toContain("Error: 系统错误");
      });

      it("应该处理无 stack 的 Error", () => {
        const error = new Error("无堆栈错误");
        error.stack = undefined;
        const result = Resp.fail(error);

        expect(result.message).toBe("无堆栈错误");
        expect(result.stack).toBeUndefined();
      });

      it("应该处理空 message 的 Error", () => {
        const error = new Error("");
        const result = Resp.fail(error);

        expect(result.message).toBe("未知错误");
      });

      it("应该支持额外扩展字段", () => {
        const error = new Error("系统错误");
        const result = Resp.fail(error, { requestId: "req-123" });

        expect(result.message).toBe("系统错误");
        expect(result.requestId).toBe("req-123");
      });
    });

    describe("ZodError 输入", () => {
      it("应该格式化 ZodError 的 message", () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const parseResult = schema.safeParse({ name: 123, age: "not a number" });

        expect(parseResult.success).toBe(false);

        if (!parseResult.success) {
          const result = Resp.fail(parseResult.error);

          expect(result.message).toBeDefined();
          expect(result.error).toBeDefined();
          expect(result.error?.name).toBe("ZodError");
          expect(result.error?.issues).toBeInstanceOf(Array);
          expect(result.error?.issues?.length).toBe(2);
        }
      });

      it("应该正确转换 ZodError 的 issues", () => {
        const schema = z.object({
          user: z.object({
            email: z.string().email(),
          }),
        });

        const parseResult = schema.safeParse({ user: { email: "invalid" } });

        expect(parseResult.success).toBe(false);

        if (!parseResult.success) {
          const result = Resp.fail(parseResult.error);

          expect(result.error?.issues).toBeDefined();

          const issue = result.error?.issues?.[0];

          expect(issue?.code).toBe("invalid_format");
          expect(issue?.path).toEqual(["user", "email"]);
          expect(issue?.message).toBeDefined();
        }
      });

      it("应该处理包含数组索引的 path", () => {
        const schema = z.object({
          items: z.array(z.string()),
        });

        const parseResult = schema.safeParse({ items: ["valid", 123] });

        expect(parseResult.success).toBe(false);

        if (!parseResult.success) {
          const result = Resp.fail(parseResult.error);

          const issue = result.error?.issues?.[0];

          expect(issue?.path).toContain("items");
          expect(issue?.path).toContain(1);
        }
      });

      it("应该支持额外扩展字段", () => {
        const schema = z.string();
        const parseResult = schema.safeParse(123);

        if (!parseResult.success) {
          const result = Resp.fail(parseResult.error, { field: "username" });

          expect(result.error).toBeDefined();
          expect(result.field).toBe("username");
        }
      });
    });

    describe("extra 参数边界情况", () => {
      it("应该正确处理 extra 中包含假值", () => {
        const result = Resp.fail("错误", {
          count: 0,
          active: false,
          name: "",
        });

        expect(result.count).toBe(0);
        expect(result.active).toBe(false);
        expect(result.name).toBe("");
      });

      it("应该处理 undefined extra", () => {
        const result = Resp.fail("错误", undefined);

        expect(result).toEqual({ message: "错误" });
      });
    });
  });

  describe("Resp.validateErrResp", () => {
    it("应该验证合法的错误响应", () => {
      const validResp = { message: "错误信息" };

      expect(Resp.validateErrResp(validResp)).toBe(true);
    });

    it("应该验证包含完整字段的错误响应", () => {
      const validResp = {
        message: "校验失败",
        stack: "Error: 校验失败\n    at ...",
        error: {
          name: "ZodError",
          issues: [
            {
              code: "invalid_type",
              path: ["name"],
              message: "必须是字符串",
            },
          ],
        },
      };

      expect(Resp.validateErrResp(validResp)).toBe(true);
    });

    it("应该验证包含额外字段的错误响应（catchall）", () => {
      const validResp = {
        message: "错误",
        customField: "自定义值",
        anotherField: 123,
      };

      expect(Resp.validateErrResp(validResp)).toBe(true);
    });

    it("应该拒绝非对象类型", () => {
      expect(Resp.validateErrResp("string")).toBe(false);
      expect(Resp.validateErrResp(123)).toBe(false);
      expect(Resp.validateErrResp(null)).toBe(false);
      expect(Resp.validateErrResp(undefined)).toBe(false);
    });

    it("应该验证 error.issues 的结构", () => {
      const invalidResp = {
        message: "错误",
        error: {
          name: "ZodError",
          issues: [
            {
              code: "invalid_type",
              // Missing path and message / 缺少 path 和 message
            },
          ],
        },
      };

      expect(Resp.validateErrResp(invalidResp)).toBe(false);
    });
  });

  describe("respErrSchema", () => {
    it("应该正确解析最小错误响应", () => {
      const result = respErrSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it("应该支持 catchall 任意字段", () => {
      const result = respErrSchema.safeParse({
        message: "错误",
        customField: { nested: true },
        arrayField: [1, 2, 3],
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.customField).toEqual({ nested: true });
        expect(result.data.arrayField).toEqual([1, 2, 3]);
      }
    });

    it("应该验证 error.name 必须是字符串", () => {
      const result = respErrSchema.safeParse({
        error: {
          name: 123, // Should be a string / 应该是字符串
        },
      });

      expect(result.success).toBe(false);
    });

    it("应该验证 issues.path 数组元素类型", () => {
      const result = respErrSchema.safeParse({
        error: {
          name: "ZodError",
          issues: [
            {
              code: "test",
              path: ["valid", 1, { invalid: true }], // Objects not allowed / 对象不允许
              message: "测试",
            },
          ],
        },
      });

      expect(result.success).toBe(false);
    });
  });

  describe("集成场景", () => {
    it("Resp.fail 返回值应该通过 validateErrResp 验证", () => {
      const stringResult = Resp.fail("字符串错误");

      expect(Resp.validateErrResp(stringResult)).toBe(true);

      const errorResult = Resp.fail(new Error("Error 错误"));

      expect(Resp.validateErrResp(errorResult)).toBe(true);

      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "string",
          // @ts-expect-error - Required for test case / 测试用例需要
          received: "number",
          path: ["field"],
          message: "类型错误",
        },
      ]);
      const zodResult = Resp.fail(zodError);

      expect(Resp.validateErrResp(zodResult)).toBe(true);
    });

    it("带 extra 的 Resp.fail 返回值应该通过验证", () => {
      const result = Resp.fail("错误", {
        requestId: "req-123",
        timestamp: Date.now(),
      });

      expect(Resp.validateErrResp(result)).toBe(true);
    });
  });
});
