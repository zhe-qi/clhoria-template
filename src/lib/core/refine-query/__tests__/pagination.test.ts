import { describe, expect, it } from "vitest";

import {
  calculatePagination,
  PaginationHandler,
  paginationHandler,
  validatePagination,
} from "../pagination";

describe("refine-query Pagination", () => {
  describe("PaginationHandler", () => {
    describe("calculate", () => {
      it("应该返回默认分页参数 (undefined)", () => {
        const result = paginationHandler.calculate(undefined);

        expect(result).toEqual({
          offset: 0,
          limit: 10,
          current: 1,
          pageSize: 10,
          mode: "server",
        });
      });

      it("应该返回默认分页参数 (空对象)", () => {
        const result = paginationHandler.calculate({});

        expect(result).toEqual({
          offset: 0,
          limit: 10,
          current: 1,
          pageSize: 10,
          mode: "server",
        });
      });

      it("应该计算第一页参数", () => {
        const result = paginationHandler.calculate({ current: 1, pageSize: 20 });

        expect(result.offset).toBe(0);
        expect(result.limit).toBe(20);
        expect(result.current).toBe(1);
        expect(result.pageSize).toBe(20);
      });

      it("应该计算第二页参数", () => {
        const result = paginationHandler.calculate({ current: 2, pageSize: 10 });

        expect(result.offset).toBe(10);
        expect(result.limit).toBe(10);
        expect(result.current).toBe(2);
      });

      it("应该计算第三页参数", () => {
        const result = paginationHandler.calculate({ current: 3, pageSize: 10 });

        expect(result.offset).toBe(20);
        expect(result.limit).toBe(10);
        expect(result.current).toBe(3);
      });

      it("应该计算大页码", () => {
        const result = paginationHandler.calculate({ current: 100, pageSize: 25 });

        expect(result.offset).toBe(2475); // (100-1) * 25
        expect(result.limit).toBe(25);
        expect(result.current).toBe(100);
      });

      it("应该将页码 < 1 修正为 1", () => {
        const result = paginationHandler.calculate({ current: 0, pageSize: 10 });

        expect(result.current).toBe(1);
        expect(result.offset).toBe(0);
      });

      it("应该将负数页码修正为 1", () => {
        const result = paginationHandler.calculate({ current: -5, pageSize: 10 });

        expect(result.current).toBe(1);
        expect(result.offset).toBe(0);
      });

      it("应该将 pageSize 超过 100 修正为 100", () => {
        const result = paginationHandler.calculate({ current: 1, pageSize: 200 });

        expect(result.pageSize).toBe(100);
        expect(result.limit).toBe(100);
      });

      it("应该将 pageSize < 1 修正为 1", () => {
        const result = paginationHandler.calculate({ current: 1, pageSize: 0 });

        expect(result.pageSize).toBe(1);
        expect(result.limit).toBe(1);
      });

      it("应该将负数 pageSize 修正为 1", () => {
        const result = paginationHandler.calculate({ current: 1, pageSize: -10 });

        expect(result.pageSize).toBe(1);
        expect(result.limit).toBe(1);
      });

      it("应该保持 client 模式", () => {
        const result = paginationHandler.calculate({ current: 1, pageSize: 10, mode: "client" });

        expect(result.mode).toBe("client");
      });

      it("应该保持 server 模式", () => {
        const result = paginationHandler.calculate({ current: 1, pageSize: 10, mode: "server" });

        expect(result.mode).toBe("server");
      });

      it("应该保持 off 模式", () => {
        const result = paginationHandler.calculate({ current: 1, pageSize: 10, mode: "off" });

        expect(result.mode).toBe("off");
      });
    });

    describe("validate", () => {
      it("应该通过有效参数验证", () => {
        const result = paginationHandler.validate({ current: 1, pageSize: 10 });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("应该通过 undefined 参数验证", () => {
        const result = paginationHandler.validate(undefined);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("应该通过空对象验证", () => {
        const result = paginationHandler.validate({});

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("应该拒绝页码 < 1", () => {
        const result = paginationHandler.validate({ current: 0, pageSize: 10 });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("当前页码必须大于等于1");
      });

      it("应该拒绝负数页码", () => {
        const result = paginationHandler.validate({ current: -1, pageSize: 10 });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("当前页码必须大于等于1");
      });

      it("应该拒绝非整数页码", () => {
        const result = paginationHandler.validate({ current: 1.5, pageSize: 10 });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("当前页码必须是整数");
      });

      it("应该拒绝 pageSize < 1", () => {
        const result = paginationHandler.validate({ current: 1, pageSize: 0 });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("每页大小必须大于等于1");
      });

      it("应该拒绝负数 pageSize", () => {
        const result = paginationHandler.validate({ current: 1, pageSize: -5 });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("每页大小必须大于等于1");
      });

      it("应该拒绝 pageSize > 100", () => {
        const result = paginationHandler.validate({ current: 1, pageSize: 101 });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("每页大小不能超过100");
      });

      it("应该拒绝非整数 pageSize", () => {
        const result = paginationHandler.validate({ current: 1, pageSize: 10.5 });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("每页大小必须是整数");
      });

      it("应该返回多个错误", () => {
        const result = paginationHandler.validate({ current: 0, pageSize: 101 });

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
      });

      it("应该接受有效的 mode", () => {
        const modes = ["client", "server", "off"] as const;
        modes.forEach((mode) => {
          const result = paginationHandler.validate({ current: 1, pageSize: 10, mode });

          expect(result.valid).toBe(true);
        });
      });

      it("应该接受边界值 pageSize=1", () => {
        const result = paginationHandler.validate({ current: 1, pageSize: 1 });

        expect(result.valid).toBe(true);
      });

      it("应该接受边界值 pageSize=100", () => {
        const result = paginationHandler.validate({ current: 1, pageSize: 100 });

        expect(result.valid).toBe(true);
      });

      it("应该接受边界值 current=1", () => {
        const result = paginationHandler.validate({ current: 1, pageSize: 10 });

        expect(result.valid).toBe(true);
      });
    });
  });

  describe("PaginationHandler 类实例化", () => {
    it("应该能创建新实例", () => {
      const handler = new PaginationHandler();
      const result = handler.calculate({ current: 2, pageSize: 15 });

      expect(result.offset).toBe(15);
      expect(result.limit).toBe(15);
    });
  });

  describe("便捷函数", () => {
    describe("calculatePagination", () => {
      it("应该调用 paginationHandler.calculate", () => {
        const result = calculatePagination({ current: 2, pageSize: 20 });

        expect(result.offset).toBe(20);
        expect(result.limit).toBe(20);
        expect(result.current).toBe(2);
        expect(result.pageSize).toBe(20);
        expect(result.mode).toBe("server");
      });

      it("应该处理 undefined", () => {
        const result = calculatePagination(undefined);

        expect(result.current).toBe(1);
        expect(result.pageSize).toBe(10);
      });
    });

    describe("validatePagination", () => {
      it("应该调用 paginationHandler.validate", () => {
        const result = validatePagination({ current: 1, pageSize: 10 });

        expect(result.valid).toBe(true);
      });

      it("应该返回验证错误", () => {
        const result = validatePagination({ current: -1, pageSize: 200 });

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it("应该处理 undefined", () => {
        const result = validatePagination(undefined);

        expect(result.valid).toBe(true);
      });
    });
  });
});
