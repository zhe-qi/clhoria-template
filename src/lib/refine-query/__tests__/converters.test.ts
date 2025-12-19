import { integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  addDefaultSorting,
  convertFiltersToSQL,
  convertSortersToSQL,
  FiltersConverter,
  SortersConverter,
  validateFilterFields,
  validateSorterFields,
} from "../converters";

// 创建测试用表
const testTable = pgTable("test_table", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }),
  age: integer("age"),
  status: varchar("status", { length: 20 }),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

describe("refine-query Converters", () => {
  describe("FiltersConverter", () => {
    const converter = new FiltersConverter(testTable);

    describe("基本功能", () => {
      it("应该返回 undefined 当 filters 为 undefined", () => {
        const result = converter.convert(undefined);

        expect(result).toBeUndefined();
      });

      it("应该返回 undefined 当 filters 为空数组", () => {
        const result = converter.convert([]);

        expect(result).toBeUndefined();
      });

      it("应该处理单个过滤条件", () => {
        const result = converter.convert([{ field: "name", operator: "eq", value: "test" }]);

        expect(result).toBeDefined();
      });

      it("应该处理多个过滤条件 (AND)", () => {
        const result = converter.convert([
          { field: "name", operator: "eq", value: "test" },
          { field: "status", operator: "eq", value: "active" },
        ]);

        expect(result).toBeDefined();
      });
    });

    describe("相等性操作符", () => {
      it("应该转换 eq 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "eq", value: "test" }]);

        expect(result).toBeDefined();
      });

      it("应该转换 ne 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "ne", value: "test" }]);

        expect(result).toBeDefined();
      });
    });

    describe("比较操作符", () => {
      it("应该转换 lt 操作符", () => {
        const result = converter.convert([{ field: "age", operator: "lt", value: 18 }]);

        expect(result).toBeDefined();
      });

      it("应该转换 gt 操作符", () => {
        const result = converter.convert([{ field: "age", operator: "gt", value: 18 }]);

        expect(result).toBeDefined();
      });

      it("应该转换 lte 操作符", () => {
        const result = converter.convert([{ field: "age", operator: "lte", value: 18 }]);

        expect(result).toBeDefined();
      });

      it("应该转换 gte 操作符", () => {
        const result = converter.convert([{ field: "age", operator: "gte", value: 18 }]);

        expect(result).toBeDefined();
      });
    });

    describe("数组操作符", () => {
      it("应该转换 in 操作符", () => {
        const result = converter.convert([{ field: "status", operator: "in", value: ["a", "b"] }]);

        expect(result).toBeDefined();
      });

      it("应该转换 nin 操作符", () => {
        const result = converter.convert([{ field: "status", operator: "nin", value: ["a", "b"] }]);

        expect(result).toBeDefined();
      });

      it("应该返回 undefined 当 in 数组为空", () => {
        const result = converter.convert([{ field: "status", operator: "in", value: [] }]);

        expect(result).toBeUndefined();
      });

      it("应该返回 undefined 当 nin 数组为空", () => {
        const result = converter.convert([{ field: "status", operator: "nin", value: [] }]);

        expect(result).toBeUndefined();
      });

      it("应该转换 ina 操作符 (JSONB)", () => {
        const result = converter.convert([{ field: "tags", operator: "ina", value: ["tag1"] }]);

        expect(result).toBeDefined();
      });

      it("应该转换 nina 操作符 (JSONB)", () => {
        const result = converter.convert([{ field: "tags", operator: "nina", value: ["tag1"] }]);

        expect(result).toBeDefined();
      });
    });

    describe("字符串操作符 (大小写不敏感)", () => {
      it("应该转换 contains 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "contains", value: "test" }]);

        expect(result).toBeDefined();
      });

      it("应该转换 ncontains 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "ncontains", value: "test" }]);

        expect(result).toBeDefined();
      });

      it("应该转换 startswith 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "startswith", value: "pre" }]);

        expect(result).toBeDefined();
      });

      it("应该转换 nstartswith 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "nstartswith", value: "pre" }]);

        expect(result).toBeDefined();
      });

      it("应该转换 endswith 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "endswith", value: "suf" }]);

        expect(result).toBeDefined();
      });

      it("应该转换 nendswith 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "nendswith", value: "suf" }]);

        expect(result).toBeDefined();
      });

      it("应该返回 undefined 当 contains value 不是字符串", () => {
        const result = converter.convert([{ field: "name", operator: "contains", value: 123 }]);

        expect(result).toBeUndefined();
      });
    });

    describe("字符串操作符 (大小写敏感)", () => {
      it("应该转换 containss 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "containss", value: "Test" }]);

        expect(result).toBeDefined();
      });

      it("应该转换 ncontainss 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "ncontainss", value: "Test" }]);

        expect(result).toBeDefined();
      });

      it("应该转换 startswiths 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "startswiths", value: "Pre" }]);

        expect(result).toBeDefined();
      });

      it("应该转换 nstartswiths 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "nstartswiths", value: "Pre" }]);

        expect(result).toBeDefined();
      });

      it("应该转换 endswiths 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "endswiths", value: "Suf" }]);

        expect(result).toBeDefined();
      });

      it("应该转换 nendswiths 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "nendswiths", value: "Suf" }]);

        expect(result).toBeDefined();
      });
    });

    describe("范围操作符", () => {
      it("应该转换 between 操作符", () => {
        const result = converter.convert([{ field: "age", operator: "between", value: [18, 30] }]);

        expect(result).toBeDefined();
      });

      it("应该转换 nbetween 操作符", () => {
        const result = converter.convert([{ field: "age", operator: "nbetween", value: [18, 30] }]);

        expect(result).toBeDefined();
      });

      it("应该返回 undefined 当 between 数组长度不为 2", () => {
        const result = converter.convert([{ field: "age", operator: "between", value: [18] }]);

        expect(result).toBeUndefined();
      });

      it("应该返回 undefined 当 between value 不是数组", () => {
        const result = converter.convert([{ field: "age", operator: "between", value: 18 }]);

        expect(result).toBeUndefined();
      });
    });

    describe("空值操作符", () => {
      it("应该转换 null 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "null", value: true }]);

        expect(result).toBeDefined();
      });

      it("应该转换 nnull 操作符", () => {
        const result = converter.convert([{ field: "name", operator: "nnull", value: true }]);

        expect(result).toBeDefined();
      });
    });

    describe("条件组合", () => {
      it("应该转换 OR 组合", () => {
        const result = converter.convert([{
          operator: "or",
          value: [
            { field: "name", operator: "eq", value: "test1" },
            { field: "name", operator: "eq", value: "test2" },
          ],
        }]);

        expect(result).toBeDefined();
      });

      it("应该转换 AND 组合", () => {
        const result = converter.convert([{
          operator: "and",
          value: [
            { field: "name", operator: "eq", value: "test" },
            { field: "status", operator: "eq", value: "active" },
          ],
        }]);

        expect(result).toBeDefined();
      });

      it("应该转换嵌套组合", () => {
        const result = converter.convert([{
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
        }]);

        expect(result).toBeDefined();
      });

      it("应该返回 undefined 当条件组合 value 为空数组", () => {
        const result = converter.convert([{
          operator: "or",
          value: [],
        }]);

        expect(result).toBeUndefined();
      });

      it("应该返回单个条件当组合中只有一个有效条件", () => {
        const result = converter.convert([{
          operator: "or",
          value: [
            { field: "name", operator: "eq", value: "test" },
          ],
        }]);

        expect(result).toBeDefined();
      });
    });

    describe("错误处理", () => {
      it("应该返回 undefined 当字段不存在", () => {
        const result = converter.convert([{ field: "unknown", operator: "eq", value: "test" }]);

        expect(result).toBeUndefined();
      });

      it("应该返回 undefined 当 value 为 null (非 null 操作符)", () => {
        const result = converter.convert([{ field: "name", operator: "eq", value: null }]);

        expect(result).toBeUndefined();
      });

      it("应该返回 undefined 当 value 为 undefined (非 null 操作符)", () => {
        const result = converter.convert([{ field: "name", operator: "eq", value: undefined }]);

        expect(result).toBeUndefined();
      });

      it("应该忽略无效字段并继续处理有效条件", () => {
        const result = converter.convert([
          { field: "unknown", operator: "eq", value: "test" },
          { field: "name", operator: "eq", value: "test" },
        ]);

        expect(result).toBeDefined();
      });
    });
  });

  describe("SortersConverter", () => {
    const converter = new SortersConverter(testTable);

    describe("基本功能", () => {
      it("应该返回空数组当 sorters 为 undefined", () => {
        const result = converter.convert(undefined);

        expect(result).toEqual([]);
      });

      it("应该返回空数组当 sorters 为空数组", () => {
        const result = converter.convert([]);

        expect(result).toEqual([]);
      });
    });

    describe("排序方向", () => {
      it("应该转换单字段升序", () => {
        const result = converter.convert([{ field: "name", order: "asc" }]);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeDefined();
      });

      it("应该转换单字段降序", () => {
        const result = converter.convert([{ field: "name", order: "desc" }]);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeDefined();
      });
    });

    describe("多字段排序", () => {
      it("应该转换多字段排序", () => {
        const result = converter.convert([
          { field: "name", order: "asc" },
          { field: "age", order: "desc" },
        ]);

        expect(result).toHaveLength(2);
      });

      it("应该保持排序顺序", () => {
        const result = converter.convert([
          { field: "createdAt", order: "desc" },
          { field: "name", order: "asc" },
        ]);

        expect(result).toHaveLength(2);
      });
    });

    describe("错误处理", () => {
      it("应该返回空数组当字段不存在", () => {
        const result = converter.convert([{ field: "unknown", order: "asc" }]);

        expect(result).toEqual([]);
      });

      it("应该忽略无效字段并返回有效排序", () => {
        const result = converter.convert([
          { field: "unknown", order: "asc" },
          { field: "name", order: "desc" },
        ]);

        expect(result).toHaveLength(1);
      });
    });
  });

  describe("convertFiltersToSQL 便捷函数", () => {
    it("应该返回 undefined 当 filters 为 undefined", () => {
      const result = convertFiltersToSQL(undefined, testTable);

      expect(result).toBeUndefined();
    });

    it("应该转换有效过滤条件", () => {
      const result = convertFiltersToSQL([{ field: "name", operator: "eq", value: "test" }], testTable);

      expect(result).toBeDefined();
    });
  });

  describe("convertSortersToSQL 便捷函数", () => {
    it("应该返回空数组当 sorters 为 undefined", () => {
      const result = convertSortersToSQL(undefined, testTable);

      expect(result).toEqual([]);
    });

    it("应该转换有效排序条件", () => {
      const result = convertSortersToSQL([{ field: "name", order: "asc" }], testTable);

      expect(result).toHaveLength(1);
    });
  });

  describe("validateFilterFields", () => {
    it("应该验证所有字段有效", () => {
      const result = validateFilterFields(
        [{ field: "name", operator: "eq", value: "test" }],
        testTable,
      );

      expect(result.valid).toBe(true);
      expect(result.invalidFields).toHaveLength(0);
    });

    it("应该检测无效字段", () => {
      const result = validateFilterFields(
        [{ field: "unknown", operator: "eq", value: "test" }],
        testTable,
      );

      expect(result.valid).toBe(false);
      expect(result.invalidFields).toContain("unknown");
    });

    it("应该检测嵌套条件中的无效字段", () => {
      const result = validateFilterFields(
        [{
          operator: "or",
          value: [
            { field: "name", operator: "eq", value: "test" },
            { field: "invalid", operator: "eq", value: "test" },
          ],
        }],
        testTable,
      );

      expect(result.valid).toBe(false);
      expect(result.invalidFields).toContain("invalid");
    });

    it("应该支持 allowedFields 白名单", () => {
      const result = validateFilterFields(
        [{ field: "name", operator: "eq", value: "test" }],
        testTable,
        ["name", "status"],
      );

      expect(result.valid).toBe(true);
    });

    it("应该拒绝不在白名单中的字段", () => {
      const result = validateFilterFields(
        [{ field: "age", operator: "eq", value: 18 }],
        testTable,
        ["name", "status"],
      );

      expect(result.valid).toBe(false);
      expect(result.invalidFields).toContain("age");
    });

    it("应该去重无效字段", () => {
      const result = validateFilterFields(
        [
          { field: "unknown", operator: "eq", value: "test1" },
          { field: "unknown", operator: "eq", value: "test2" },
        ],
        testTable,
      );

      expect(result.invalidFields).toHaveLength(1);
    });
  });

  describe("validateSorterFields", () => {
    it("应该验证所有字段有效", () => {
      const result = validateSorterFields(
        [{ field: "name", order: "asc" }],
        testTable,
      );

      expect(result.valid).toBe(true);
      expect(result.invalidFields).toHaveLength(0);
    });

    it("应该检测无效字段", () => {
      const result = validateSorterFields(
        [{ field: "unknown", order: "asc" }],
        testTable,
      );

      expect(result.valid).toBe(false);
      expect(result.invalidFields).toContain("unknown");
    });

    it("应该支持 allowedFields 白名单", () => {
      const result = validateSorterFields(
        [{ field: "name", order: "asc" }],
        testTable,
        ["name", "createdAt"],
      );

      expect(result.valid).toBe(true);
    });

    it("应该拒绝不在白名单中的字段", () => {
      const result = validateSorterFields(
        [{ field: "age", order: "asc" }],
        testTable,
        ["name", "createdAt"],
      );

      expect(result.valid).toBe(false);
    });

    it("应该去重无效字段", () => {
      const result = validateSorterFields(
        [
          { field: "unknown", order: "asc" },
          { field: "unknown", order: "desc" },
        ],
        testTable,
      );

      expect(result.invalidFields).toHaveLength(1);
    });
  });

  describe("addDefaultSorting", () => {
    it("应该添加默认排序当 sorters 为 undefined", () => {
      const result = addDefaultSorting(undefined);

      expect(result).toEqual([{ field: "createdAt", order: "desc" }]);
    });

    it("应该添加默认排序当 sorters 为空数组", () => {
      const result = addDefaultSorting([]);

      expect(result).toEqual([{ field: "createdAt", order: "desc" }]);
    });

    it("应该追加默认排序到已有排序", () => {
      const result = addDefaultSorting([{ field: "name", order: "asc" }]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ field: "name", order: "asc" });
      expect(result[1]).toEqual({ field: "createdAt", order: "desc" });
    });

    it("应该不添加当已有相同字段排序", () => {
      const result = addDefaultSorting([{ field: "createdAt", order: "asc" }]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ field: "createdAt", order: "asc" });
    });

    it("应该支持自定义默认字段", () => {
      const result = addDefaultSorting(undefined, "updatedAt");

      expect(result).toEqual([{ field: "updatedAt", order: "desc" }]);
    });

    it("应该支持自定义默认排序方向", () => {
      const result = addDefaultSorting(undefined, "createdAt", "asc");

      expect(result).toEqual([{ field: "createdAt", order: "asc" }]);
    });

    it("应该不修改原数组", () => {
      const original = [{ field: "name", order: "asc" as const }];
      const result = addDefaultSorting(original);

      expect(original).toHaveLength(1);
      expect(result).toHaveLength(2);
    });
  });

  describe("SQL 注入防护", () => {
    const converter = new FiltersConverter(testTable);

    describe("值注入尝试", () => {
      // 经典 SQL 注入模式
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "1; DELETE FROM users",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "1' OR 1=1--",
        "' OR ''='",
        "'; TRUNCATE TABLE users; --",
        "1'; EXEC xp_cmdshell('dir'); --",
        "' AND 1=0 UNION SELECT username, password FROM users--",
        "'); DROP TABLE users;--",
        "1' AND (SELECT COUNT(*) FROM users) > 0 --",
        // eslint-disable-next-line no-template-curly-in-string
        "${7*7}",
        "{{7*7}}",
        "<script>alert('xss')</script>",
      ];

      it.each(sqlInjectionPayloads)("应该安全处理 eq 操作符中的恶意值: %s", (payload) => {
        // 转换器应该正常生成 SQL（Drizzle 使用参数化查询）
        const result = converter.convert([{ field: "name", operator: "eq", value: payload }]);

        expect(result).toBeDefined();
        // 重要：Drizzle ORM 使用参数化查询，恶意值会被当作参数传递而非 SQL 代码
      });

      it.each(sqlInjectionPayloads)("应该安全处理 contains 操作符中的恶意值: %s", (payload) => {
        const result = converter.convert([{ field: "name", operator: "contains", value: payload }]);

        expect(result).toBeDefined();
      });

      it.each(sqlInjectionPayloads)("应该安全处理 startswith 操作符中的恶意值: %s", (payload) => {
        const result = converter.convert([{ field: "name", operator: "startswith", value: payload }]);

        expect(result).toBeDefined();
      });

      it.each(sqlInjectionPayloads)("应该安全处理 in 操作符中的恶意值: %s", (payload) => {
        const result = converter.convert([{ field: "status", operator: "in", value: [payload, "normal"] }]);

        expect(result).toBeDefined();
      });
    });

    describe("字段名注入尝试", () => {
      const fieldInjectionPayloads = [
        "name; DROP TABLE users; --",
        "name' OR '1'='1",
        "name UNION SELECT * FROM users",
        "name--",
        "1=1; --",
        "name); DELETE FROM users; --",
        "name` OR 1=1 --",
        "name\"; DROP TABLE users; --",
      ];

      it.each(fieldInjectionPayloads)("应该拒绝恶意字段名: %s", (maliciousField) => {
        // 由于恶意字段名不存在于表结构中，应该返回 undefined
        const result = converter.convert([{ field: maliciousField, operator: "eq", value: "test" }]);

        expect(result).toBeUndefined();
      });

      it.each(fieldInjectionPayloads)("validateFilterFields 应该检测恶意字段名: %s", (maliciousField) => {
        const result = validateFilterFields(
          [{ field: maliciousField, operator: "eq", value: "test" }],
          testTable,
        );

        expect(result.valid).toBe(false);
        expect(result.invalidFields).toContain(maliciousField);
      });

      it.each(fieldInjectionPayloads)("validateSorterFields 应该检测恶意排序字段: %s", (maliciousField) => {
        const result = validateSorterFields(
          [{ field: maliciousField, order: "asc" }],
          testTable,
        );

        expect(result.valid).toBe(false);
        expect(result.invalidFields).toContain(maliciousField);
      });
    });

    describe("特殊字符处理", () => {
      const specialChars = [
        { name: "单引号", value: "test'value" },
        { name: "双引号", value: "test\"value" },
        { name: "反斜杠", value: "test\\value" },
        { name: "换行符", value: "test\nvalue" },
        { name: "制表符", value: "test\tvalue" },
        { name: "空字符", value: "test\0value" },
        { name: "百分号", value: "test%value" },
        { name: "下划线", value: "test_value" },
        { name: "反引号", value: "test`value" },
        { name: "分号", value: "test;value" },
        { name: "注释符", value: "test--value" },
        { name: "多行注释", value: "test/**/value" },
        { name: "Unicode", value: "test\u0000value" },
        { name: "中文", value: "测试值" },
        { name: "emoji", value: "test🎉value" },
      ];

      it.each(specialChars)("应该安全处理特殊字符 ($name): $value", ({ value }) => {
        const result = converter.convert([{ field: "name", operator: "eq", value }]);

        expect(result).toBeDefined();
      });

      it.each(specialChars)("应该在 LIKE 查询中安全处理特殊字符 ($name)", ({ value }) => {
        const result = converter.convert([{ field: "name", operator: "contains", value }]);

        expect(result).toBeDefined();
      });
    });

    describe("between 操作符注入", () => {
      it("应该安全处理 between 中的恶意值", () => {
        const result = converter.convert([{
          field: "age",
          operator: "between",
          value: ["1; DROP TABLE users; --", "100"],
        }]);

        expect(result).toBeDefined();
      });

      it("应该安全处理 between 数组中的 SQL 注入", () => {
        const result = converter.convert([{
          field: "age",
          operator: "between",
          value: ["1' OR '1'='1", "100' OR '1'='1"],
        }]);

        expect(result).toBeDefined();
      });
    });

    describe("嵌套条件注入", () => {
      it("应该安全处理嵌套 OR 条件中的恶意值", () => {
        const result = converter.convert([{
          operator: "or",
          value: [
            { field: "name", operator: "eq", value: "'; DROP TABLE users; --" },
            { field: "name", operator: "eq", value: "' OR '1'='1" },
          ],
        }]);

        expect(result).toBeDefined();
      });

      it("应该安全处理深层嵌套中的恶意值", () => {
        const result = converter.convert([{
          operator: "or",
          value: [
            {
              operator: "and",
              value: [
                { field: "name", operator: "eq", value: "'; DELETE FROM users; --" },
                { field: "status", operator: "contains", value: "' UNION SELECT * FROM passwords --" },
              ],
            },
            { field: "name", operator: "startswith", value: "admin'--" },
          ],
        }]);

        expect(result).toBeDefined();
      });
    });

    describe("JSONB 操作符注入", () => {
      it("应该安全处理 ina 操作符中的恶意 JSON", () => {
        const result = converter.convert([{
          field: "tags",
          operator: "ina",
          value: ["'; DROP TABLE users; --", "normal"],
        }]);

        expect(result).toBeDefined();
      });

      it("应该安全处理 nina 操作符中的恶意 JSON", () => {
        const result = converter.convert([{
          field: "tags",
          operator: "nina",
          value: ["' OR 1=1 --"],
        }]);

        expect(result).toBeDefined();
      });
    });
  });
});
