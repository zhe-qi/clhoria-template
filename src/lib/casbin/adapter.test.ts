import type { Enforcer, Model } from "casbin";

import { newEnforcer, newModel, Util } from "casbin";
import { inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import db from "@/db";
import { casbinRule } from "@/db/schema";
import env from "@/env";

import { DrizzleCasbinAdapter } from "./adapter";
import { casbinModelText } from "./index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

/**
 * 比较两个二维数组是否相等（忽略顺序）
 */
const array2DEqualsIgnoreOrder = (a: string[][], b: string[][]): boolean => {
  return Util.array2DEquals(a.sort(), b.sort());
};

/**
 * 测试策略是否与预期相等
 */
const testGetPolicy = async (e: Enforcer, res: string[][]): Promise<void> => {
  const myRes = await e.getPolicy();

  expect(array2DEqualsIgnoreOrder(res, myRes)).toBe(true);
};

/**
 * 测试角色继承策略是否与预期相等
 */
const testGetGroupingPolicy = async (e: Enforcer, res: string[][]): Promise<void> => {
  const myRes = await e.getGroupingPolicy();

  expect(array2DEqualsIgnoreOrder(res, myRes)).toBe(true);
};

/**
 * 清理测试数据（只删除测试用的规则，保留 admin 等生产数据）
 */
async function cleanupTestData(): Promise<void> {
  // 只删除测试中使用的特定主体的规则
  const testSubjects = ["alice", "bob", "data2_admin", "data1_admin", "user", "charlie", "user1", "user2", "user3", "role", "new_user", "new_user2", "final_user"];
  await db.delete(casbinRule).where(inArray(casbinRule.v0, testSubjects));
}

describe("drizzle casbin adapter", () => {
  let adapter: DrizzleCasbinAdapter;
  let model: Model;
  let enforcer: Enforcer;
  let savedRules: typeof casbinRule.$inferSelect[] = [];

  beforeAll(async () => {
    adapter = await DrizzleCasbinAdapter.newAdapter(db, casbinRule);
    model = newModel();
    model.loadModelFromText(casbinModelText);

    // 保存当前所有规则（包括 seed 的 admin 规则）
    savedRules = await db.select().from(casbinRule);

    // 清理所有规则以便测试
    await db.delete(casbinRule);

    // 初始化基础测试数据
    const initialEnforcer = await newEnforcer(model, adapter);

    // 添加初始策略
    await initialEnforcer.addPolicy("alice", "data1", "read", "allow");
    await initialEnforcer.addPolicy("bob", "data2", "write", "allow");
    await initialEnforcer.addPolicy("data2_admin", "data2", "read", "allow");
    await initialEnforcer.addPolicy("data2_admin", "data2", "write", "allow");

    // 添加角色继承
    await initialEnforcer.addGroupingPolicy("alice", "data2_admin");
    await initialEnforcer.addGroupingPolicy("bob", "data1_admin");
  });

  beforeEach(async () => {
    // 每个测试前重新加载 enforcer，确保状态一致
    const testModel = newModel();
    testModel.loadModelFromText(casbinModelText);
    enforcer = await newEnforcer(testModel, adapter);
  });

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData();

    // 恢复保存的规则
    if (savedRules.length > 0) {
      await db.insert(casbinRule).values(savedRules).onConflictDoNothing();
    }

    // 重新加载策略，让其他测试能看到恢复的规则
    const { reloadCasbinPolicy } = await import("@/lib/casbin");
    await reloadCasbinPolicy();
  });

  describe("策略操作", () => {
    it("应该清空当前策略", async () => {
      enforcer.clearPolicy();
      await testGetPolicy(enforcer, []);
    });

    it("应该从数据库加载策略", async () => {
      // beforeEach 已经加载了策略，这里直接验证
      await testGetPolicy(enforcer, [
        ["alice", "data1", "read", "allow"],
        ["bob", "data2", "write", "allow"],
        ["data2_admin", "data2", "read", "allow"],
        ["data2_admin", "data2", "write", "allow"],
      ]);
    });

    it("应该使用适配器加载策略", async () => {
      const e = await newEnforcer(model, adapter);
      await testGetPolicy(e, [
        ["alice", "data1", "read", "allow"],
        ["bob", "data2", "write", "allow"],
        ["data2_admin", "data2", "read", "allow"],
        ["data2_admin", "data2", "write", "allow"],
      ]);
    });

    it("应该添加策略到数据库", async () => {
      await adapter.addPolicy("", "p", ["role", "res", "action", "allow"]);
      const e = await newEnforcer(model, adapter);
      await testGetPolicy(e, [
        ["alice", "data1", "read", "allow"],
        ["bob", "data2", "write", "allow"],
        ["data2_admin", "data2", "read", "allow"],
        ["data2_admin", "data2", "write", "allow"],
        ["role", "res", "action", "allow"],
      ]);
    });

    it("应该删除策略", async () => {
      await adapter.removePolicy("", "p", ["role", "res", "action", "allow"]);
      const e = await newEnforcer(model, adapter);
      await testGetPolicy(e, [
        ["alice", "data1", "read", "allow"],
        ["bob", "data2", "write", "allow"],
        ["data2_admin", "data2", "read", "allow"],
        ["data2_admin", "data2", "write", "allow"],
      ]);
    });

    it("应该批量添加策略", async () => {
      await adapter.addPolicies("", "p", [
        ["user1", "/api/resource1", "GET", "allow"],
        ["user2", "/api/resource2", "POST", "allow"],
        ["user3", "/api/resource3", "DELETE", "deny"],
      ]);

      const e = await newEnforcer(model, adapter);
      const policies = await e.getPolicy();

      expect(policies.some(p => p[0] === "user1" && p[1] === "/api/resource1")).toBe(true);
      expect(policies.some(p => p[0] === "user2" && p[1] === "/api/resource2")).toBe(true);
      expect(policies.some(p => p[0] === "user3" && p[1] === "/api/resource3")).toBe(true);
    });

    it("应该批量删除策略", async () => {
      await adapter.removePolicies("", "p", [
        ["user1", "/api/resource1", "GET", "allow"],
        ["user2", "/api/resource2", "POST", "allow"],
        ["user3", "/api/resource3", "DELETE", "deny"],
      ]);

      const e = await newEnforcer(model, adapter);
      const policies = await e.getPolicy();

      expect(policies.some(p => p[0] === "user1")).toBe(false);
      expect(policies.some(p => p[0] === "user2")).toBe(false);
      expect(policies.some(p => p[0] === "user3")).toBe(false);
    });

    it("应该过滤删除策略", async () => {
      await adapter.removeFilteredPolicy("", "p", 0, "data2_admin");
      const e = await newEnforcer(model, adapter);
      await testGetPolicy(e, [
        ["alice", "data1", "read", "allow"],
        ["bob", "data2", "write", "allow"],
      ]);
    });
  });

  describe("角色继承操作", () => {
    it("应该从数据库加载角色继承策略", async () => {
      await testGetGroupingPolicy(enforcer, [
        ["alice", "data2_admin"],
        ["bob", "data1_admin"],
      ]);
    });

    it("应该更新角色继承策略", async () => {
      await enforcer.updateGroupingPolicy(["alice", "data2_admin"], ["alice", "data1_admin"]);
      await testGetGroupingPolicy(enforcer, [
        ["alice", "data1_admin"],
        ["bob", "data1_admin"],
      ]);
    });

    it("应该删除用户的所有角色", async () => {
      await enforcer.deleteUser("alice");
      const groupingPolicies = await enforcer.getGroupingPolicy();

      expect(groupingPolicies.some(p => p[0] === "alice")).toBe(false);
    });

    it("应该添加角色继承", async () => {
      await enforcer.addGroupingPolicy("charlie", "data2_admin");
      const groupingPolicies = await enforcer.getGroupingPolicy();

      expect(groupingPolicies.some(p => p[0] === "charlie" && p[1] === "data2_admin")).toBe(true);
    });

    it("应该删除角色继承", async () => {
      await enforcer.removeGroupingPolicy("charlie", "data2_admin");
      const groupingPolicies = await enforcer.getGroupingPolicy();

      expect(groupingPolicies.some(p => p[0] === "charlie")).toBe(false);
    });
  });

  describe("过滤加载策略", () => {
    beforeEach(async () => {
      // 确保有正确的测试数据
      const dbRules = await db.select().from(casbinRule);
      if (dbRules.length === 0 || !dbRules.some(r => r.v0 === "alice" && r.v1 === "data1")) {
        // 重新初始化测试数据
        await cleanupTestData();
        const e = await newEnforcer(model, adapter);
        await e.addPolicy("alice", "data1", "read", "allow");
        await e.addPolicy("bob", "data2", "write", "allow");
        await e.addPolicy("data2_admin", "data2", "read", "allow");
        await e.addPolicy("data2_admin", "data2", "write", "allow");
        await e.addGroupingPolicy("alice", "data2_admin");
        await e.addGroupingPolicy("bob", "data1_admin");
      }
    });

    it("应该过滤加载策略 - 按主体过滤", async () => {
      const testModel = newModel();
      testModel.loadModelFromText(casbinModelText);

      await adapter.loadFilteredPolicy(testModel, {
        p: ["alice", "data1", "read", "allow"],
      });

      const policies = testModel.getPolicy("p", "p");

      expect(policies).toHaveLength(1);
      expect(policies[0]).toEqual(["alice", "data1", "read", "allow"]);
      expect(adapter.isFiltered()).toBe(true);
    });

    it("应该过滤加载策略 - 按对象过滤", async () => {
      const testModel = newModel();
      testModel.loadModelFromText(casbinModelText);

      await adapter.loadFilteredPolicy(testModel, {
        p: [
          ["data2_admin", "data2", "read", "allow"],
          ["data2_admin", "data2", "write", "allow"],
        ],
      });

      const policies = testModel.getPolicy("p", "p");

      expect(policies).toHaveLength(2);
      expect(policies.every(p => p[0] === "data2_admin" && p[1] === "data2")).toBe(true);
    });
  });

  describe("权限判断", () => {
    beforeEach(async () => {
      // 确保有正确的测试数据
      const dbRules = await db.select().from(casbinRule);
      if (dbRules.length === 0 || !dbRules.some(r => r.v0 === "alice" && r.v1 === "data1")) {
        // 重新初始化测试数据
        await cleanupTestData();
        const e = await newEnforcer(model, adapter);
        await e.addPolicy("alice", "data1", "read", "allow");
        await e.addPolicy("bob", "data2", "write", "allow");
        await e.addPolicy("data2_admin", "data2", "read", "allow");
        await e.addPolicy("data2_admin", "data2", "write", "allow");
        await e.addGroupingPolicy("alice", "data2_admin");
        await e.addGroupingPolicy("bob", "data1_admin");

        // 重新加载 enforcer
        const testModel = newModel();
        testModel.loadModelFromText(casbinModelText);
        enforcer = await newEnforcer(testModel, adapter);
      }
    });

    it("应该正确判断用户权限", async () => {
      const result1 = await enforcer.enforce("alice", "data1", "read");

      expect(result1).toBe(true);

      const result2 = await enforcer.enforce("bob", "data2", "write");

      expect(result2).toBe(true);

      // alice 有 data2_admin 角色，所以也有 data2 的 write 权限
      const result3 = await enforcer.enforce("alice", "data2", "write");

      expect(result3).toBe(true);

      // alice 没有 data1 的 write 权限
      const result4 = await enforcer.enforce("alice", "data1", "write");

      expect(result4).toBe(false);
    });

    it("应该支持角色继承的权限判断", async () => {
      // alice 有 data2_admin 角色，data2_admin 有 data2 的读写权限
      const result1 = await enforcer.enforce("alice", "data2", "read");

      expect(result1).toBe(true);

      const result2 = await enforcer.enforce("alice", "data2", "write");

      expect(result2).toBe(true);
    });

    it("应该支持 keyMatch3 路径匹配", async () => {
      await enforcer.addPolicy("user", "/api/v1/users/*", "GET", "allow");

      const result1 = await enforcer.enforce("user", "/api/v1/users/123", "GET");

      expect(result1).toBe(true);

      const result2 = await enforcer.enforce("user", "/api/v1/users/123/profile", "GET");

      expect(result2).toBe(true);

      const result3 = await enforcer.enforce("user", "/api/v2/users/123", "GET");

      expect(result3).toBe(false);
    });

    it("应该支持 regexMatch 动作匹配", async () => {
      await enforcer.addPolicy("user", "/api/admin", "(GET)|(POST)", "allow");

      const result1 = await enforcer.enforce("user", "/api/admin", "GET");

      expect(result1).toBe(true);

      const result2 = await enforcer.enforce("user", "/api/admin", "POST");

      expect(result2).toBe(true);

      const result3 = await enforcer.enforce("user", "/api/admin", "DELETE");

      expect(result3).toBe(false);
    });

    it("应该正确处理 deny 策略", async () => {
      await enforcer.addPolicy("user", "/api/sensitive", "GET", "deny");

      const result = await enforcer.enforce("user", "/api/sensitive", "GET");

      expect(result).toBe(false);
    });
  });

  describe("策略保存", () => {
    let savedRules: typeof casbinRule.$inferSelect[] = [];

    beforeEach(async () => {
      // 保存当前所有规则（包括 admin 规则）
      savedRules = await db.select().from(casbinRule);
    });

    afterEach(async () => {
      // 恢复规则
      await db.delete(casbinRule);
      if (savedRules.length > 0) {
        await db.insert(casbinRule).values(savedRules);
      }
    });

    it("应该保存所有策略到数据库", async () => {
      const testModel = newModel();
      testModel.loadModelFromText(casbinModelText);

      testModel.addPolicy("p", "p", ["new_user", "/api/test", "GET", "allow"]);
      testModel.addPolicy("p", "p", ["new_user2", "/api/test2", "POST", "allow"]);
      testModel.addPolicy("g", "g", ["new_user", "admin"]);

      const result = await adapter.savePolicy(testModel);

      expect(result).toBe(true);

      // 验证已保存
      const e = await newEnforcer(testModel, adapter);
      const policies = await e.getPolicy();

      expect(policies.some(p => p[0] === "new_user")).toBe(true);
      expect(policies.some(p => p[0] === "new_user2")).toBe(true);

      const roles = await e.getGroupingPolicy();

      expect(roles.some(r => r[0] === "new_user" && r[1] === "admin")).toBe(true);
    });

    it("应该删除旧策略并保存新策略", async () => {
      const testModel = newModel();
      testModel.loadModelFromText(casbinModelText);

      testModel.addPolicy("p", "p", ["final_user", "/api/final", "GET", "allow"]);

      await adapter.savePolicy(testModel);

      // 验证只有新策略存在
      const e = await newEnforcer(testModel, adapter);
      const policies = await e.getPolicy();

      expect(policies).toHaveLength(1);
      expect(policies[0]).toEqual(["final_user", "/api/final", "GET", "allow"]);
    });
  });

  describe("获取权限和角色", () => {
    beforeEach(async () => {
      // 清空并添加此测试套件专用的数据
      await cleanupTestData();
      const e = await newEnforcer(model, adapter);

      // 重新添加测试数据
      await e.addPolicy("alice", "/api/user", "GET", "allow");
      await e.addPolicy("alice", "/api/user", "POST", "allow");
      await e.addPolicy("bob", "/api/admin", "GET", "allow");
      await e.addGroupingPolicy("alice", "user_role");
      await e.addGroupingPolicy("bob", "admin_role");

      // 重新加载 enforcer
      const testModel = newModel();
      testModel.loadModelFromText(casbinModelText);
      enforcer = await newEnforcer(testModel, adapter);
    });

    afterEach(async () => {
      // 恢复原始测试数据
      await cleanupTestData();
      const e = await newEnforcer(model, adapter);

      await e.addPolicy("alice", "data1", "read", "allow");
      await e.addPolicy("bob", "data2", "write", "allow");
      await e.addPolicy("data2_admin", "data2", "read", "allow");
      await e.addPolicy("data2_admin", "data2", "write", "allow");
      await e.addGroupingPolicy("alice", "data2_admin");
      await e.addGroupingPolicy("bob", "data1_admin");
    });

    it("应该获取用户的所有权限", async () => {
      const e = await newEnforcer(model, adapter);
      const permissions = await e.getPermissionsForUser("alice");

      expect(permissions).toHaveLength(2);
      expect(permissions).toContainEqual(["alice", "/api/user", "GET", "allow"]);
      expect(permissions).toContainEqual(["alice", "/api/user", "POST", "allow"]);
    });

    it("应该获取用户的所有角色", async () => {
      const e = await newEnforcer(model, adapter);
      const roles = await e.getRolesForUser("alice");

      expect(roles).toContain("user_role");
    });

    it("应该获取拥有角色的所有用户", async () => {
      const e = await newEnforcer(model, adapter);
      const users = await e.getUsersForRole("admin_role");

      expect(users).toContain("bob");
    });

    it("应该检查用户是否拥有角色", async () => {
      const e = await newEnforcer(model, adapter);
      const hasRole = await e.hasRoleForUser("alice", "user_role");

      expect(hasRole).toBe(true);

      const noRole = await e.hasRoleForUser("alice", "admin_role");

      expect(noRole).toBe(false);
    });

    it("应该获取用户的所有隐式权限(包括角色继承)", async () => {
      // 清空并准备测试数据
      await cleanupTestData();
      const e = await newEnforcer(model, adapter);

      // 添加一个角色的权限
      await e.addPolicy("admin_role", "/api/admin", "GET", "allow");
      await e.addPolicy("admin_role", "/api/admin", "POST", "allow");
      await e.addPolicy("user_role", "/api/user", "GET", "allow");

      // alice 直接有一个权限
      await e.addPolicy("alice", "/api/profile", "GET", "allow");

      // alice 拥有 user_role 角色
      await e.addGroupingPolicy("alice", "user_role");

      // 重新加载 enforcer
      const testModel = newModel();
      testModel.loadModelFromText(casbinModelText);
      const enforcer = await newEnforcer(testModel, adapter);

      // 获取隐式权限(包括通过角色继承得到的权限)
      const implicitPermissions = await enforcer.getImplicitPermissionsForUser("alice");

      // alice 应该有 2 个权限:
      // 1. 自己直接的权限: ["alice", "/api/profile", "GET", "allow"]
      // 2. 从 user_role 继承的权限: ["user_role", "/api/user", "GET", "allow"]
      expect(implicitPermissions.length).toBeGreaterThanOrEqual(2);
      expect(implicitPermissions).toContainEqual(["alice", "/api/profile", "GET", "allow"]);
      expect(implicitPermissions).toContainEqual(["user_role", "/api/user", "GET", "allow"]);
    });
  });
});
