import { like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import db from "@/db";
import { systemRoles } from "@/db/schema";
import env from "@/env";
import { Status } from "@/lib/enums";

import { executeRefineQuery, RefineQueryExecutor } from "../query-executor";

// 确保在测试环境运行
if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 测试数据前缀
const TEST_PREFIX = "test_refine_query_";

// 测试数据
const testRoles = [
  { id: `${TEST_PREFIX}role1`, name: "测试角色1", status: Status.ENABLED, description: "测试角色描述1" },
  { id: `${TEST_PREFIX}role2`, name: "测试角色2", status: Status.ENABLED, description: "测试角色描述2" },
  { id: `${TEST_PREFIX}role3`, name: "测试角色3", status: Status.DISABLED, description: "测试角色描述3" },
  { id: `${TEST_PREFIX}role4`, name: "搜索测试角色", status: Status.ENABLED, description: "测试搜索功能" },
  { id: `${TEST_PREFIX}role5`, name: "搜索测试角色2", status: Status.DISABLED, description: "测试搜索功能2" },
];

describe("refine-query QueryExecutor", () => {
  // 设置测试数据
  beforeAll(async () => {
    // 清理可能存在的测试数据
    await db.delete(systemRoles).where(like(systemRoles.id, `${TEST_PREFIX}%`));

    // 插入测试数据
    await db.insert(systemRoles).values(testRoles);
  });

  // 清理测试数据
  afterAll(async () => {
    await db.delete(systemRoles).where(like(systemRoles.id, `${TEST_PREFIX}%`));
  });

  describe("RefineQueryExecutor", () => {
    describe("execute - 基本查询", () => {
      it("应该执行无条件查询", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: "id", operator: "startswith", value: TEST_PREFIX }],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data.length).toBe(5);
        expect(result!.total).toBe(5);
      });

      it("应该执行带过滤条件的查询", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [
            { field: "id", operator: "startswith", value: TEST_PREFIX },
            { field: "status", operator: "eq", value: Status.ENABLED },
          ],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data.length).toBe(3);
        expect(result!.data.every(r => r.status === Status.ENABLED)).toBe(true);
      });

      it("应该执行带排序条件的查询", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: "id", operator: "startswith", value: TEST_PREFIX }],
          sorters: [{ field: "id", order: "asc" }],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data.length).toBe(5);
        // 验证排序
        expect(result!.data[0].id).toBe(`${TEST_PREFIX}role1`);
        expect(result!.data[4].id).toBe(`${TEST_PREFIX}role5`);
      });

      it("应该执行降序排序", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: "id", operator: "startswith", value: TEST_PREFIX }],
          sorters: [{ field: "id", order: "desc" }],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data[0].id).toBe(`${TEST_PREFIX}role5`);
        expect(result!.data[4].id).toBe(`${TEST_PREFIX}role1`);
      });
    });

    describe("execute - 分页查询", () => {
      it("应该执行 server 模式分页", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: "id", operator: "startswith", value: TEST_PREFIX }],
          pagination: { current: 1, pageSize: 2, mode: "server" },
          sorters: [{ field: "id", order: "asc" }],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data.length).toBe(2);
        expect(result!.total).toBe(5); // 总数应该是所有记录数
        expect(result!.data[0].id).toBe(`${TEST_PREFIX}role1`);
      });

      it("应该执行 server 模式分页 - 第二页", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: "id", operator: "startswith", value: TEST_PREFIX }],
          pagination: { current: 2, pageSize: 2, mode: "server" },
          sorters: [{ field: "id", order: "asc" }],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data.length).toBe(2);
        expect(result!.total).toBe(5);
        expect(result!.data[0].id).toBe(`${TEST_PREFIX}role3`);
      });

      it("应该执行 client 模式分页", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: "id", operator: "startswith", value: TEST_PREFIX }],
          pagination: { current: 1, pageSize: 2, mode: "client" },
          sorters: [{ field: "id", order: "asc" }],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data.length).toBe(2);
        expect(result!.total).toBe(5);
      });

      it("应该执行 off 模式（不分页）", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: "id", operator: "startswith", value: TEST_PREFIX }],
          pagination: { current: 1, pageSize: 2, mode: "off" },
          sorters: [{ field: "id", order: "asc" }],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data.length).toBe(5); // 返回全部
        expect(result!.total).toBe(5);
      });
    });

    describe("execute - 参数验证", () => {
      it("应该拒绝无效过滤字段", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: "invalidField", operator: "eq", value: "test" }],
        });

        expect(error).toBeDefined();
        expect(error!.message).toContain("无效的过滤字段");
        expect(result).toBeNull();
      });

      it("应该拒绝无效排序字段", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          sorters: [{ field: "invalidField", order: "asc" }],
        });

        expect(error).toBeDefined();
        expect(error!.message).toContain("无效的排序字段");
        expect(result).toBeNull();
      });

      it("应该拒绝无效分页参数", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          pagination: { current: -1, pageSize: 10, mode: "server" },
        });

        expect(error).toBeDefined();
        expect(result).toBeNull();
      });
    });

    describe("execute - 复杂过滤", () => {
      it("应该支持 OR 条件", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [
            { field: "id", operator: "startswith", value: TEST_PREFIX },
            {
              operator: "or",
              value: [
                { field: "id", operator: "eq", value: `${TEST_PREFIX}role1` },
                { field: "id", operator: "eq", value: `${TEST_PREFIX}role2` },
              ],
            },
          ],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data.length).toBe(2);
      });

      it("应该支持 contains 操作符", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [
            { field: "id", operator: "startswith", value: TEST_PREFIX },
            { field: "name", operator: "contains", value: "搜索" },
          ],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data.length).toBe(2);
        expect(result!.data.every(r => (r as { name: string }).name.includes("搜索"))).toBe(true);
      });

      it("应该支持 in 操作符", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [
            { field: "id", operator: "startswith", value: TEST_PREFIX },
            { field: "status", operator: "in", value: [Status.DISABLED] },
          ],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data.length).toBe(2);
        expect(result!.data.every(r => (r as { status: string }).status === Status.DISABLED)).toBe(true);
      });
    });

    describe("execute - allowedFields", () => {
      it("应该使用 allowedFields 白名单", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [
            { field: "id", operator: "startswith", value: TEST_PREFIX },
          ],
          allowedFields: ["id", "name", "status"],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
      });

      it("应该拒绝不在白名单中的过滤字段", async () => {
        const executor = new RefineQueryExecutor(systemRoles);
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [
            { field: "description", operator: "eq", value: "test" },
          ],
          allowedFields: ["id", "name", "status"],
        });

        expect(error).toBeDefined();
        expect(error!.message).toContain("无效的过滤字段");
        expect(result).toBeNull();
      });
    });
  });

  describe("executeRefineQuery 便捷函数", () => {
    it("应该执行查询", async () => {
      const [error, result] = await executeRefineQuery({
        table: systemRoles,
        queryParams: {
          filters: [{ field: "id", operator: "eq", value: `${TEST_PREFIX}role1` }],
        },
      });

      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(result!.data.length).toBe(1);
      expect(result!.data[0].id).toBe(`${TEST_PREFIX}role1`);
    });

    it("应该支持自定义 db 实例", async () => {
      // 使用默认的 db 实例（通过参数传入）
      const [error, result] = await executeRefineQuery(
        {
          table: systemRoles,
          queryParams: {
            filters: [{ field: "id", operator: "eq", value: `${TEST_PREFIX}role1` }],
          },
        },
        db, // 显式传入 db 实例
      );

      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(result!.data.length).toBe(1);
    });

    it("应该支持分页参数", async () => {
      const [error, result] = await executeRefineQuery({
        table: systemRoles,
        queryParams: {
          filters: [{ field: "id", operator: "startswith", value: TEST_PREFIX }],
          pagination: { current: 1, pageSize: 3, mode: "server" },
          sorters: [{ field: "id", order: "asc" }],
        },
      });

      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(result!.data.length).toBe(3);
      expect(result!.total).toBe(5);
    });

    it("应该返回错误当查询参数无效", async () => {
      const [error, result] = await executeRefineQuery({
        table: systemRoles,
        queryParams: {
          filters: [{ field: "invalidField", operator: "eq", value: "test" }],
        },
      });

      expect(error).toBeDefined();
      expect(result).toBeNull();
    });
  });

  describe("边界情况", () => {
    it("应该处理空过滤条件", async () => {
      const executor = new RefineQueryExecutor(systemRoles);
      const [error, result] = await executor.execute({
        resource: systemRoles,
        filters: [],
        pagination: { current: 1, pageSize: 100, mode: "server" },
      });

      expect(error).toBeNull();
      expect(result).toBeDefined();
      // 应该返回所有数据（可能包括其他测试创建的数据）
      expect(result!.data.length).toBeGreaterThanOrEqual(5);
    });

    it("应该处理空排序条件", async () => {
      const executor = new RefineQueryExecutor(systemRoles);
      const [error, result] = await executor.execute({
        resource: systemRoles,
        filters: [{ field: "id", operator: "startswith", value: TEST_PREFIX }],
        sorters: [],
      });

      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(result!.data.length).toBe(5);
    });

    it("应该处理单条结果", async () => {
      const executor = new RefineQueryExecutor(systemRoles);
      const [error, result] = await executor.execute({
        resource: systemRoles,
        filters: [{ field: "id", operator: "eq", value: `${TEST_PREFIX}role1` }],
      });

      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(result!.data.length).toBe(1);
      expect(result!.total).toBe(1);
    });

    it("应该处理无结果", async () => {
      const executor = new RefineQueryExecutor(systemRoles);
      const [error, result] = await executor.execute({
        resource: systemRoles,
        filters: [{ field: "id", operator: "eq", value: "non_existent_id" }],
      });

      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(result!.data.length).toBe(0);
      expect(result!.total).toBe(0);
    });

    it("应该处理最后一页（部分记录）", async () => {
      const executor = new RefineQueryExecutor(systemRoles);
      const [error, result] = await executor.execute({
        resource: systemRoles,
        filters: [{ field: "id", operator: "startswith", value: TEST_PREFIX }],
        pagination: { current: 3, pageSize: 2, mode: "server" },
        sorters: [{ field: "id", order: "asc" }],
      });

      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(result!.data.length).toBe(1); // 第3页只有1条记录
      expect(result!.total).toBe(5);
    });
  });

  describe("SQL 注入防护（集成测试）", () => {
    const executor = new RefineQueryExecutor(systemRoles);

    describe("值注入尝试", () => {
      // 经典 SQL 注入模式
      const sqlInjectionPayloads = [
        "'; DROP TABLE system_roles; --",
        "1' OR '1'='1",
        "1; DELETE FROM system_roles",
        "' UNION SELECT * FROM system_roles --",
        "admin'--",
        "1' OR 1=1--",
        "'; TRUNCATE TABLE system_roles; --",
      ];

      it.each(sqlInjectionPayloads)("eq 操作符应该安全处理恶意值并返回空结果: %s", async (payload) => {
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: "id", operator: "eq", value: payload }],
        });

        // 查询应该成功执行，但不会匹配任何记录（因为没有 id 等于这些恶意字符串的记录）
        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data.length).toBe(0);
        // 重要：数据库应该仍然正常工作，没有被注入攻击
      });

      it.each(sqlInjectionPayloads)("contains 操作符应该安全处理恶意值: %s", async (payload) => {
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [
            { field: "id", operator: "startswith", value: TEST_PREFIX },
            { field: "name", operator: "contains", value: payload },
          ],
        });

        // 查询应该成功执行，恶意字符串被当作普通搜索文本
        expect(error).toBeNull();
        expect(result).toBeDefined();
        // 不会匹配任何记录
        expect(result!.data.length).toBe(0);
      });

      it.each(sqlInjectionPayloads)("in 操作符应该安全处理恶意值: %s", async (payload) => {
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: "id", operator: "in", value: [payload, "another_value"] }],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        // 不会匹配任何记录
        expect(result!.data.length).toBe(0);
      });
    });

    describe("字段名注入尝试", () => {
      const fieldInjectionPayloads = [
        "id; DROP TABLE system_roles; --",
        "id' OR '1'='1",
        "id UNION SELECT * FROM system_roles",
        "id--",
        "1=1; --",
      ];

      it.each(fieldInjectionPayloads)("应该拒绝恶意过滤字段名: %s", async (maliciousField) => {
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: maliciousField, operator: "eq", value: "test" }],
        });

        // 应该返回验证错误
        expect(error).toBeDefined();
        expect(error!.message).toContain("无效的过滤字段");
        expect(result).toBeNull();
      });

      it.each(fieldInjectionPayloads)("应该拒绝恶意排序字段名: %s", async (maliciousField) => {
        const [error, result] = await executor.execute({
          resource: systemRoles,
          sorters: [{ field: maliciousField, order: "asc" }],
        });

        expect(error).toBeDefined();
        expect(error!.message).toContain("无效的排序字段");
        expect(result).toBeNull();
      });
    });

    describe("特殊字符处理", () => {
      const specialCharValues = [
        "test'value",
        "test\"value",
        "test\\value",
        "test%value",
        "test_value",
        "test;value",
        "test--value",
        "测试值",
      ];

      it.each(specialCharValues)("应该正确处理特殊字符并返回匹配结果: %s", async (value) => {
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: "name", operator: "contains", value }],
        });

        // 查询应该成功执行，特殊字符被正确转义
        expect(error).toBeNull();
        expect(result).toBeDefined();
        // 可能返回 0 或多条记录，关键是查询成功执行
      });
    });

    describe("验证数据库完整性", () => {
      it("执行多个注入尝试后数据库数据应保持完整", async () => {
        // 尝试各种注入攻击
        const attacks = [
          { field: "id", operator: "eq", value: "'; DROP TABLE system_roles; --" },
          { field: "name", operator: "contains", value: "'; DELETE FROM system_roles; --" },
          { field: "status", operator: "in", value: ["'; TRUNCATE TABLE system_roles; --"] },
        ];

        for (const attack of attacks) {
          await executor.execute({
            resource: systemRoles,
            filters: [attack as any],
          });
        }

        // 验证测试数据仍然存在
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [{ field: "id", operator: "startswith", value: TEST_PREFIX }],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        // 所有 5 条测试数据应该仍然存在
        expect(result!.data.length).toBe(5);
      });
    });

    describe("复杂注入场景", () => {
      it("应该安全处理嵌套条件中的注入尝试", async () => {
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [
            { field: "id", operator: "startswith", value: TEST_PREFIX },
            {
              operator: "or",
              value: [
                { field: "name", operator: "eq", value: "'; DROP TABLE system_roles; --" },
                { field: "name", operator: "contains", value: "' OR '1'='1" },
              ],
            },
          ],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        // 不会匹配任何记录（因为没有名字包含这些恶意字符串的记录）
        expect(result!.data.length).toBe(0);
      });

      it("应该安全处理多个过滤条件中的注入尝试", async () => {
        const [error, result] = await executor.execute({
          resource: systemRoles,
          filters: [
            { field: "id", operator: "eq", value: "' OR 1=1 --" },
            { field: "name", operator: "contains", value: "'; DELETE FROM system_roles; --" },
            { field: "description", operator: "contains", value: "' UNION SELECT * FROM system_roles --" },
          ],
        });

        expect(error).toBeNull();
        expect(result).toBeDefined();
        expect(result!.data.length).toBe(0);
      });
    });
  });
});
