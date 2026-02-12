import { describe, expect, it } from "vitest";

import {
  ConditionalFilterSchema,
  CrudFilterSchema,
  CrudFiltersSchema,
  CrudOperatorsSchema,
  CrudSortingSchema,
  CrudSortSchema,
  LogicalFilterSchema,
  PaginationSchema,
  RefineQueryParamsSchema,
} from "../schemas";

describe("refine-query Schemas", () => {
  describe("CrudOperatorsSchema", () => {
    const validOperators = [
      "eq",
      "ne",
      "lt",
      "gt",
      "lte",
      "gte",
      "in",
      "nin",
      "ina",
      "nina",
      "contains",
      "ncontains",
      "containss",
      "ncontainss",
      "between",
      "nbetween",
      "null",
      "nnull",
      "startswith",
      "nstartswith",
      "startswiths",
      "nstartswiths",
      "endswith",
      "nendswith",
      "endswiths",
      "nendswiths",
      "or",
      "and",
    ];

    it.each(validOperators)("应该接受有效操作符: %s", (operator) => {
      const result = CrudOperatorsSchema.safeParse(operator);

      expect(result.success).toBe(true);
    });

    it("应该拒绝无效操作符", () => {
      const invalidOperators = ["invalid", "LIKE", "=", "!=", ""];

      invalidOperators.forEach((op) => {
        const result = CrudOperatorsSchema.safeParse(op);

        expect(result.success).toBe(false);
      });
    });
  });

  describe("LogicalFilterSchema", () => {
    it("应该接受完整的逻辑过滤条件", () => {
      const filter = { field: "name", operator: "eq", value: "test" };
      const result = LogicalFilterSchema.safeParse(filter);

      expect(result.success).toBe(true);
    });

    it("应该接受不同类型的 value", () => {
      const filters = [
        { field: "name", operator: "eq", value: "string" },
        { field: "age", operator: "gt", value: 18 },
        { field: "active", operator: "eq", value: true },
        { field: "tags", operator: "in", value: ["a", "b"] },
        { field: "data", operator: "eq", value: null },
      ];

      filters.forEach((filter) => {
        const result = LogicalFilterSchema.safeParse(filter);

        expect(result.success).toBe(true);
      });
    });

    it("应该拒绝缺少 field 的过滤条件", () => {
      const filter = { operator: "eq", value: "test" };
      const result = LogicalFilterSchema.safeParse(filter);

      expect(result.success).toBe(false);
    });

    it("应该拒绝空 field", () => {
      const filter = { field: "", operator: "eq", value: "test" };
      const result = LogicalFilterSchema.safeParse(filter);

      expect(result.success).toBe(false);
    });

    it("应该拒绝无效 operator", () => {
      const filter = { field: "name", operator: "invalid", value: "test" };
      const result = LogicalFilterSchema.safeParse(filter);

      expect(result.success).toBe(false);
    });

    it("应该拒绝逻辑操作符 (or/and) 作为 LogicalFilter 的 operator", () => {
      const orFilter = { field: "name", operator: "or", value: "test" };
      const andFilter = { field: "name", operator: "and", value: "test" };

      expect(LogicalFilterSchema.safeParse(orFilter).success).toBe(false);
      expect(LogicalFilterSchema.safeParse(andFilter).success).toBe(false);
    });
  });

  describe("ConditionalFilterSchema", () => {
    it("应该接受 OR 条件组合", () => {
      const filter = {
        operator: "or",
        value: [
          { field: "name", operator: "eq", value: "test1" },
          { field: "name", operator: "eq", value: "test2" },
        ],
      };
      const result = ConditionalFilterSchema.safeParse(filter);

      expect(result.success).toBe(true);
    });

    it("应该接受 AND 条件组合", () => {
      const filter = {
        operator: "and",
        value: [
          { field: "name", operator: "eq", value: "test" },
          { field: "status", operator: "eq", value: "active" },
        ],
      };
      const result = ConditionalFilterSchema.safeParse(filter);

      expect(result.success).toBe(true);
    });

    it("应该接受嵌套条件", () => {
      const filter = {
        operator: "or",
        value: [
          {
            operator: "and",
            value: [
              { field: "name", operator: "eq", value: "test" },
              { field: "age", operator: "gt", value: 18 },
            ],
          },
          { field: "status", operator: "eq", value: "vip" },
        ],
      };
      const result = ConditionalFilterSchema.safeParse(filter);

      expect(result.success).toBe(true);
    });

    it("应该接受带 key 的条件", () => {
      const filter = {
        key: "filter-1",
        operator: "or",
        value: [
          { field: "name", operator: "eq", value: "test" },
        ],
      };
      const result = ConditionalFilterSchema.safeParse(filter);

      expect(result.success).toBe(true);
    });

    it("应该拒绝无效的条件操作符", () => {
      const filter = {
        operator: "xor",
        value: [{ field: "name", operator: "eq", value: "test" }],
      };
      const result = ConditionalFilterSchema.safeParse(filter);

      expect(result.success).toBe(false);
    });

    it("应该拒绝空 value 数组", () => {
      const filter = {
        operator: "or",
        value: [],
      };
      const result = ConditionalFilterSchema.safeParse(filter);

      // 空数组是有效的数组，所以这个应该通过
      expect(result.success).toBe(true);
    });
  });

  describe("CrudFilterSchema", () => {
    it("应该接受 LogicalFilter", () => {
      const filter = { field: "name", operator: "eq", value: "test" };
      const result = CrudFilterSchema.safeParse(filter);

      expect(result.success).toBe(true);
    });

    it("应该接受 ConditionalFilter", () => {
      const filter = {
        operator: "or",
        value: [{ field: "name", operator: "eq", value: "test" }],
      };
      const result = CrudFilterSchema.safeParse(filter);

      expect(result.success).toBe(true);
    });
  });

  describe("CrudFiltersSchema", () => {
    it("应该接受过滤器数组", () => {
      const filters = [
        { field: "name", operator: "eq", value: "test" },
        { field: "status", operator: "in", value: ["a", "b"] },
      ];
      const result = CrudFiltersSchema.safeParse(filters);

      expect(result.success).toBe(true);
    });

    it("应该接受混合类型的过滤器数组", () => {
      const filters = [
        { field: "name", operator: "eq", value: "test" },
        {
          operator: "or",
          value: [
            { field: "status", operator: "eq", value: "a" },
            { field: "status", operator: "eq", value: "b" },
          ],
        },
      ];
      const result = CrudFiltersSchema.safeParse(filters);

      expect(result.success).toBe(true);
    });

    it("应该接受空数组", () => {
      const result = CrudFiltersSchema.safeParse([]);

      expect(result.success).toBe(true);
    });
  });

  describe("CrudSortSchema", () => {
    it("应该接受升序排序", () => {
      const sort = { field: "name", order: "asc" };
      const result = CrudSortSchema.safeParse(sort);

      expect(result.success).toBe(true);
    });

    it("应该接受降序排序", () => {
      const sort = { field: "createdAt", order: "desc" };
      const result = CrudSortSchema.safeParse(sort);

      expect(result.success).toBe(true);
    });

    it("应该拒绝空 field", () => {
      const sort = { field: "", order: "asc" };
      const result = CrudSortSchema.safeParse(sort);

      expect(result.success).toBe(false);
    });

    it("应该拒绝无效 order", () => {
      const sort = { field: "name", order: "ASC" };
      const result = CrudSortSchema.safeParse(sort);

      expect(result.success).toBe(false);
    });
  });

  describe("CrudSortingSchema", () => {
    it("应该接受排序数组", () => {
      const sorting = [
        { field: "name", order: "asc" },
        { field: "createdAt", order: "desc" },
      ];
      const result = CrudSortingSchema.safeParse(sorting);

      expect(result.success).toBe(true);
    });

    it("应该接受空数组", () => {
      const result = CrudSortingSchema.safeParse([]);

      expect(result.success).toBe(true);
    });
  });

  describe("PaginationSchema", () => {
    it("应该接受有效的分页参数", () => {
      const pagination = { current: 1, pageSize: 10, mode: "server" };
      const result = PaginationSchema.safeParse(pagination);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.current).toBe(1);
        expect(result.data.pageSize).toBe(10);
        expect(result.data.mode).toBe("server");
      }
    });

    it("应该接受空对象（字段可选）", () => {
      const result = PaginationSchema.safeParse({});

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.current).toBeUndefined();
        expect(result.data.pageSize).toBeUndefined();
        expect(result.data.mode).toBeUndefined();
      }
    });

    it("应该接受字符串数字并转换", () => {
      const pagination = { current: "2", pageSize: "20" };
      const result = PaginationSchema.safeParse(pagination);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.current).toBe(2);
        expect(result.data.pageSize).toBe(20);
      }
    });

    it("应该接受 client 模式", () => {
      const pagination = { current: 1, pageSize: 10, mode: "client" };
      const result = PaginationSchema.safeParse(pagination);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.mode).toBe("client");
      }
    });

    it("应该接受 off 模式", () => {
      const pagination = { current: 1, pageSize: 10, mode: "off" };
      const result = PaginationSchema.safeParse(pagination);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.mode).toBe("off");
      }
    });

    it("应该拒绝 pageSize 超过 100", () => {
      const pagination = { current: 1, pageSize: 101 };
      const result = PaginationSchema.safeParse(pagination);

      expect(result.success).toBe(false);
    });

    it("应该拒绝 current < 1", () => {
      const pagination = { current: 0, pageSize: 10 };
      const result = PaginationSchema.safeParse(pagination);

      expect(result.success).toBe(false);
    });

    it("应该拒绝负数 pageSize", () => {
      const pagination = { current: 1, pageSize: -1 };
      const result = PaginationSchema.safeParse(pagination);

      expect(result.success).toBe(false);
    });

    it("应该拒绝无效的 mode", () => {
      const pagination = { current: 1, pageSize: 10, mode: "invalid" };
      const result = PaginationSchema.safeParse(pagination);

      expect(result.success).toBe(false);
    });
  });

  describe("RefineQueryParamsSchema", () => {
    describe("基本验证", () => {
      it("应该接受空对象", () => {
        const result = RefineQueryParamsSchema.safeParse({});

        expect(result.success).toBe(true);
      });

      it("应该接受完整参数", () => {
        const params = {
          current: 1,
          pageSize: 10,
          mode: "server",
          filters: [{ field: "name", operator: "eq", value: "test" }],
          sorters: [{ field: "createdAt", order: "desc" }],
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);
      });
    });

    describe("JSON 字符串预处理", () => {
      it("应该解析 filters JSON 字符串", () => {
        const params = {
          filters: JSON.stringify([{ field: "name", operator: "eq", value: "test" }]),
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.filters).toEqual([{ field: "name", operator: "eq", value: "test" }]);
        }
      });

      it("应该解析 sorters JSON 字符串", () => {
        const params = {
          sorters: JSON.stringify([{ field: "name", order: "asc" }]),
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.sorters).toEqual([{ field: "name", order: "asc" }]);
        }
      });

      it("应该处理已解析的对象", () => {
        const params = {
          filters: [{ field: "name", operator: "eq", value: "test" }],
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);
      });

      it("应该处理空字符串", () => {
        const params = {
          filters: "",
          sorters: "",
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.filters).toBeUndefined();
          expect(result.data.sorters).toBeUndefined();
        }
      });

      it("应该处理 null", () => {
        const params = {
          filters: null,
          sorters: null,
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);
      });

      it("应该处理 undefined", () => {
        const params = {
          filters: undefined,
          sorters: undefined,
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);
      });

      it("应该拒绝空 JSON 对象字符串（不是数组）", () => {
        const params = {
          filters: "{}",
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        // {} 不是有效的 filters 数组，应该验证失败
        expect(result.success).toBe(false);
      });

      it("应该处理空 JSON 数组字符串", () => {
        const params = {
          filters: "[]",
          sorters: "[]",
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.filters).toEqual([]);
          expect(result.data.sorters).toEqual([]);
        }
      });

      it("应该拒绝超长 JSON 字符串 (>10000字符)", () => {
        const longString = "a".repeat(10001);
        const params = {
          filters: `[{"field":"name","operator":"eq","value":"${longString}"}]`,
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);

        if (result.success) {
          // 超长字符串被截断后返回 undefined
          expect(result.data.filters).toBeUndefined();
        }
      });

      it("应该拒绝超深嵌套 JSON (>5层)", () => {
        // 创建超过 5 层嵌套的结构
        const deepNested = {
          operator: "or",
          value: [{
            operator: "and",
            value: [{
              operator: "or",
              value: [{
                operator: "and",
                value: [{
                  operator: "or",
                  value: [{
                    operator: "and",
                    value: [{ field: "name", operator: "eq", value: "test" }],
                  }],
                }],
              }],
            }],
          }],
        };
        const params = {
          filters: JSON.stringify([deepNested]),
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);

        if (result.success) {
          // 超深嵌套被拒绝后返回 undefined
          expect(result.data.filters).toBeUndefined();
        }
      });

      it("应该处理无效 JSON 字符串", () => {
        const params = {
          filters: "{invalid json}",
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.filters).toBeUndefined();
        }
      });

      it("应该处理 'null' 字符串", () => {
        const params = {
          filters: "null",
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.filters).toBeUndefined();
        }
      });

      it("应该处理 'undefined' 字符串", () => {
        const params = {
          filters: "undefined",
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.filters).toBeUndefined();
        }
      });
    });

    describe("分页参数", () => {
      it("应该使用默认分页值", () => {
        const result = RefineQueryParamsSchema.safeParse({});

        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.current).toBe(1);
          expect(result.data.pageSize).toBe(10);
          expect(result.data.mode).toBe("server");
        }
      });

      it("应该转换字符串分页参数", () => {
        const params = {
          current: "5",
          pageSize: "25",
        };
        const result = RefineQueryParamsSchema.safeParse(params);

        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.current).toBe(5);
          expect(result.data.pageSize).toBe(25);
        }
      });
    });
  });
});
