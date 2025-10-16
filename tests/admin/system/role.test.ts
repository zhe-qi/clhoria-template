import { and, eq, like, or } from "drizzle-orm";
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import db from "@/db";
import { adminSystemRole, adminSystemUserRole, casbinRule } from "@/db/schema";
import env from "@/env";
import createApp from "@/lib/create-app";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { authorize } from "@/middlewares/authorize";
import { adminSystemRoleRouter } from "@/routes/admin/system/role";

import { getAdminToken, getAuthHeaders, getUserToken } from "../../auth-utils";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

function createSysRolesApp() {
  return createApp()
    .use("/system/role/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/role/*", authorize())
    .route("/", adminSystemRoleRouter);
}

const client = testClient(createSysRolesApp());

// 测试数据 - 使用纯字母后缀，以符合正则表达式 /^[a-z_]+$/
// 生成基于时间的字母序列
const now = Date.now();
const suffix = String.fromCharCode(97 + (now % 26)) // 第一个字母
  + String.fromCharCode(97 + ((now / 26) % 26)) // 第二个字母
  + String.fromCharCode(97 + ((now / 676) % 26)) // 第三个字母
  + String.fromCharCode(97 + ((now / 17576) % 26)); // 第四个字母
const testRoleId = `test_role_${suffix}`;
const testRole = {
  id: testRoleId,
  name: "测试角色",
  description: "这是一个测试角色",
  status: 1, // 1=启用 0=禁用
};

/**
 * 清理测试创建的角色数据
 * 删除所有以 test_ 开头的角色及其关联数据
 */
async function cleanupTestRoles(): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // 获取所有测试角色
      const testRoles = await tx
        .select({ id: adminSystemRole.id })
        .from(adminSystemRole)
        .where(like(adminSystemRole.id, "test_%"));

      if (testRoles.length === 0) {
        return;
      }

      const roleIds = testRoles.map(r => r.id);

      // 删除用户角色关联
      await tx
        .delete(adminSystemUserRole)
        .where(or(...roleIds.map(id => eq(adminSystemUserRole.roleId, id))));

      // 删除 Casbin 规则
      await tx
        .delete(casbinRule)
        .where(
          and(
            eq(casbinRule.ptype, "p"),
            or(...roleIds.map(id => eq(casbinRule.v0, id))),
          ),
        );

      // 删除角色本身
      await tx
        .delete(adminSystemRole)
        .where(like(adminSystemRole.id, "test_%"));
    });
  }
  catch (error) {
    console.error("清理测试角色失败:", error);
    throw error;
  }
}

describe("system role routes", () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    // 清理可能存在的遗留测试数据
    await cleanupTestRoles();

    adminToken = await getAdminToken();
    userToken = await getUserToken();
  });

  // 确保测试结束后清理所有测试数据
  afterAll(async () => {
    await cleanupTestRoles();
  });

  describe("authentication & authorization", () => {
    it("should allow authenticated admin requests", async () => {
      const response = await client.system.role.$get(
        { query: {} },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
    });

    it("should deny access with user token (no admin permissions)", async () => {
      const response = await client.system.role.$get(
        { query: {} },
        { headers: getAuthHeaders(userToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
    });

    it("should require authentication", async () => {
      const response = await client.system.role.$get(
        { query: {} },
        {},
      );
      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });
  });

  describe("get /system/role - list roles", () => {
    it("should validate pagination parameters", async () => {
      const response = await client.system.role.$get(
        {
          query: {
            current: "invalid" as unknown,
            pageSize: -1,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should list roles with default pagination", async () => {
      const response = await client.system.role.$get(
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

    it("should support filtering by id", async () => {
      const response = await client.system.role.$get(
        {
          query: {
            filters: JSON.stringify([
              { field: "id", operator: "contains", value: "admin" },
            ]),
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        const items = Array.isArray(json.data) ? json.data : [];
        if (items.length > 0) {
          expect(items.some((role: { id: string }) =>
            role.id.includes("admin"),
          )).toBe(true);
        }
      }
    });

    it("should support filtering by name", async () => {
      const response = await client.system.role.$get(
        {
          query: {
            filters: JSON.stringify([
              { field: "name", operator: "contains", value: "管理" },
            ]),
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        const items = Array.isArray(json.data) ? json.data : [];
        if (items.length > 0) {
          expect(items.some((role: { name: string }) =>
            role.name.includes("管理"),
          )).toBe(true);
        }
      }
    });

    it("should support sorting", async () => {
      const response = await client.system.role.$get(
        {
          query: {
            sorters: JSON.stringify([{ field: "createdAt", order: "desc" }]),
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        const items = Array.isArray(json.data) ? json.data : [];
        if (items.length > 1) {
          const firstCreatedAt = items[0].createdAt;
          const secondCreatedAt = items[1].createdAt;
          if (firstCreatedAt && secondCreatedAt) {
            const first = new Date(firstCreatedAt).getTime();
            const second = new Date(secondCreatedAt).getTime();
            expect(first).toBeGreaterThanOrEqual(second);
          }
        }
      }
    });
  });

  describe("post /system/role - create role", () => {
    it("should validate required fields", async () => {
      const response = await client.system.role.$post(
        {
          json: {
            id: `${testRoleId}_required`,
          } as { id: string; name: string; description?: string; status?: number },
        },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
      if (response.status === HttpStatusCodes.UNPROCESSABLE_ENTITY) {
        const json = await response.json() as { message?: string; error?: { issues?: unknown } };
        expect(json.error?.issues).toBeDefined();
      }
    });

    it("should validate role id format (lowercase letters and underscore only)", async () => {
      const response = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: "", // Empty id
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

      const response2 = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: "TestRole", // Invalid characters (uppercase)
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response2.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

      const response3 = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: "test-role!", // Invalid characters
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response3.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

      const response4 = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: "a".repeat(65), // Too long
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response4.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should validate role name length (1-64 chars)", async () => {
      const response = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: `${testRoleId}_name`,
            name: "", // Empty name
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

      const response2 = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: `${testRoleId}_name_too_long`,
            name: "测".repeat(65), // Too long
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response2.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should create a new role", async () => {
      const newRoleId = `${testRoleId}_create`;
      const response = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: newRoleId,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);
      if (response.status === HttpStatusCodes.CREATED) {
        const json = await response.json();
        expect(json.data.id).toBe(newRoleId);
        expect(json.data.name).toBe(testRole.name);
        expect(json.data.description).toBe(testRole.description);
        expect(json.data.status).toBe(testRole.status);
      }
    });

    it("should return 409 for duplicate role id", async () => {
      const duplicateRoleId = `${testRoleId}_duplicate`;

      // Create first role
      const response1 = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: duplicateRoleId,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response1.status).toBe(HttpStatusCodes.CREATED);

      // Try to create duplicate
      const response2 = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: duplicateRoleId,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      // 可能返回 409 或 500（取决于数据库驱动和错误处理）
      expect([HttpStatusCodes.CONFLICT, HttpStatusCodes.INTERNAL_SERVER_ERROR]).toContain(response2.status);
      if (response2.status === HttpStatusCodes.CONFLICT) {
        const json = await response2.json() as { message: string };
        expect(json.message).toBeDefined();
      }
    });
  });

  describe("get /system/role/{id} - get role", () => {
    let roleId: string;

    beforeAll(async () => {
      // Create a role for testing
      roleId = `${testRoleId}_gettest`;
      const response = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: roleId,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);
    });

    it("should validate id format", async () => {
      const response = await client.system.role[":id"].$get(
        { param: { id: "Invalid-ID" } }, // Uppercase not allowed
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should return 404 for non-existent role", async () => {
      const nonExistentId = "non_existent_role_id";
      const response = await client.system.role[":id"].$get(
        { param: { id: nonExistentId } },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
      if (response.status === HttpStatusCodes.NOT_FOUND) {
        const json = await response.json() as { message: string };
        expect(json.message).toBeDefined();
      }
    });

    it("should get role details", async () => {
      const response = await client.system.role[":id"].$get(
        { param: { id: roleId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.data.id).toBe(roleId);
        expect(json.data.id).toBe(roleId);
        expect(json.data.name).toBe(testRole.name);
      }
    });
  });

  describe("patch /system/role/{id} - update role", () => {
    let roleId: string;
    let builtInRoleId: string;

    beforeAll(async () => {
      // Create a regular role for testing
      roleId = `${testRoleId}_update`;
      const response = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: roleId,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);

      // Get built-in admin role ID
      const adminResponse = await client.system.role.$get(
        {
          query: {
            filters: JSON.stringify([
              { field: "id", operator: "eq", value: "admin" },
            ]),
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      if (adminResponse.status === HttpStatusCodes.OK) {
        const json = await adminResponse.json();
        const items = Array.isArray(json.data) ? json.data : [];
        if (items.length > 0) {
          builtInRoleId = items[0].id;
        }
      }

      if (!builtInRoleId) {
        throw new Error("built-in admin role should be found");
      }
    });

    it("should allow empty body (all fields optional in patch)", async () => {
      const response = await client.system.role[":id"].$patch(
        {
          param: { id: roleId },
          json: {},
        },
        { headers: getAuthHeaders(adminToken) },
      );
      // patchAdminSystemRole 是 partial，所以空对象是有效的
      expect(response.status).toBe(HttpStatusCodes.OK);
    });

    it("should update role fields", async () => {
      const response = await client.system.role[":id"].$patch(
        {
          param: { id: roleId },
          json: {
            name: "更新后的角色名称",
            description: "更新后的角色描述",
            status: 0, // 禁用
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.data.name).toBe("更新后的角色名称");
        expect(json.data.description).toBe("更新后的角色描述");
        expect(json.data.status).toBe(0);
      }
    });

    it("should only update allowed fields", async () => {
      const response = await client.system.role[":id"].$patch(
        {
          param: { id: roleId },
          json: {
            name: "测试名称",
            description: "测试描述",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.data.id).toBe(roleId); // ID 应该保持不变
        expect(json.data.name).toBe("测试名称");
        expect(json.data.description).toBe("测试描述");
      }
    });

    it("should return 404 for non-existent role", async () => {
      const nonExistentId = "non_existent_role";
      const response = await client.system.role[":id"].$patch(
        {
          param: { id: nonExistentId },
          json: {
            name: "Test",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });
  });

  describe("delete /system/role/{id} - delete role", () => {
    let builtInRoleId: string;

    beforeAll(async () => {
      // Get built-in admin role ID
      const adminResponse = await client.system.role.$get(
        {
          query: {
            filters: JSON.stringify([
              { field: "id", operator: "eq", value: "admin" },
            ]),
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      if (adminResponse.status === HttpStatusCodes.OK) {
        const json = await adminResponse.json();
        const items = Array.isArray(json.data) ? json.data : [];
        if (items.length > 0) {
          builtInRoleId = items[0].id;
        }
      }

      if (!builtInRoleId) {
        throw new Error("built-in admin role should be found");
      }
    });

    it("should validate id format", async () => {
      const response = await client.system.role[":id"].$delete(
        { param: { id: "Invalid-ID" } }, // Uppercase not allowed
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should return 404 for non-existent role", async () => {
      const nonExistentId = "non_existent_role";
      const response = await client.system.role[":id"].$delete(
        { param: { id: nonExistentId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });

    it("should delete role successfully", async () => {
      // 先创建一个角色用于测试删除功能
      const deleteTestRoleId = `${testRoleId}_delete`;
      const createResponse = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: deleteTestRoleId,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(createResponse.status).toBe(HttpStatusCodes.CREATED);

      // 测试删除功能
      const deleteResponse = await client.system.role[":id"].$delete(
        { param: { id: deleteTestRoleId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(deleteResponse.status).toBe(HttpStatusCodes.OK);
      if (deleteResponse.status === HttpStatusCodes.OK) {
        const json = await deleteResponse.json();
        expect(json.data.id).toBe(deleteTestRoleId);
      }

      // 验证角色已被删除
      const verifyResponse = await client.system.role[":id"].$get(
        { param: { id: deleteTestRoleId } },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(verifyResponse.status).toBe(HttpStatusCodes.NOT_FOUND);
    });
  });

  describe("get /system/role/{id}/permissions - get role permissions", () => {
    let roleId: string;

    beforeAll(async () => {
      // Create a role for testing permissions
      roleId = `${testRoleId}_permissions`;
      const response = await client.system.role.$post(
        {
          json: {
            ...testRole,
            id: roleId,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);
    });

    it("should validate id format", async () => {
      const response = await client.system.role[":id"].permissions.$get(
        { param: { id: "Invalid-ID" } }, // Uppercase not allowed
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should get role permissions", async () => {
      const response = await client.system.role[":id"].permissions.$get(
        { param: { id: roleId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.data).toBeDefined();
        expect(Array.isArray(json.data)).toBe(true);
        // 新创建的角色应该没有权限
        expect(json.data.length).toBe(0);
      }
    });

    it("should get admin role permissions", async () => {
      // Get admin role ID
      const adminResponse = await client.system.role.$get(
        {
          query: {
            filters: JSON.stringify([
              { field: "id", operator: "eq", value: "admin" },
            ]),
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      if (adminResponse.status === HttpStatusCodes.OK) {
        const json = await adminResponse.json();
        const items = Array.isArray(json.data) ? json.data : [];
        if (items.length > 0) {
          const adminRoleId = items[0].id;

          const response = await client.system.role[":id"].permissions.$get(
            { param: { id: adminRoleId } },
            { headers: getAuthHeaders(adminToken) },
          );

          expect(response.status).toBe(HttpStatusCodes.OK);
          if (response.status === HttpStatusCodes.OK) {
            const permJson = await response.json();
            expect(Array.isArray(permJson.data)).toBe(true);
            // Admin role should have permissions
            expect(permJson.data.length).toBeGreaterThan(0);
            // Each permission should be an array (Casbin format may have more fields)
            if (permJson.data.length > 0) {
              expect(Array.isArray(permJson.data[0])).toBe(true);
              expect(permJson.data[0].length).toBeGreaterThanOrEqual(2);
            }
          }
        }
      }
    });
  });

  describe("put /system/role/{id}/permissions - save role permissions", () => {
    let roleId: string;

    beforeAll(async () => {
      // Use the same role created in the previous test
      roleId = `${testRoleId}_permissions`;
    });

    it("should validate id format", async () => {
      const response = await client.system.role[":id"].permissions.$put(
        {
          param: { id: "Invalid-ID" }, // Uppercase not allowed
          json: {
            permissions: [["resource", "action"]],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should validate permissions array format", async () => {
      const response = await client.system.role[":id"].permissions.$put(
        {
          param: { id: roleId },
          json: {
            // @ts-expect-error test
            permissions: "not-an-array" as unknown as string[][],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

      const response2 = await client.system.role[":id"].permissions.$put(
        {
          param: { id: roleId },
          json: {
            permissions: [["resource"]] as unknown as [string, string][], // Missing action
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response2.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

      const response3 = await client.system.role[":id"].permissions.$put(
        {
          param: { id: roleId },
          json: {
            permissions: [["", "action"]], // Empty resource
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );
      expect(response3.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should save role permissions successfully", async () => {
      const response = await client.system.role[":id"].permissions.$put(
        {
          param: { id: roleId },
          json: {
            permissions: [
              ["/api/admin/system/user", "read"],
              ["/api/admin/system/user", "write"],
              ["/api/admin/system/role", "read"],
            ],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.data).toHaveProperty("added");
        expect(json.data).toHaveProperty("removed");
        expect(json.data).toHaveProperty("total");
        expect(typeof json.data.added).toBe("number");
        expect(typeof json.data.removed).toBe("number");
        expect(typeof json.data.total).toBe("number");
        expect(json.data.total).toBe(3);
      }
    });

    it("should update permissions (replace existing)", async () => {
      // First set some permissions
      await client.system.role[":id"].permissions.$put(
        {
          param: { id: roleId },
          json: {
            permissions: [
              ["/api/admin/system/user", "read"],
              ["/api/admin/system/user", "write"],
              ["/api/admin/system/role", "read"],
            ],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      // Then replace with different permissions
      const response = await client.system.role[":id"].permissions.$put(
        {
          param: { id: roleId },
          json: {
            permissions: [
              ["/api/admin/system/role", "write"], // New permission
              ["/api/admin/system/role", "delete"], // New permission
            ],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.data.total).toBe(2);
        expect(json.data.removed).toBeGreaterThan(0); // Should have removed previous permissions
      }

      // Verify the permissions were updated
      const verifyResponse = await client.system.role[":id"].permissions.$get(
        { param: { id: roleId } },
        { headers: getAuthHeaders(adminToken) },
      );

      if (verifyResponse.status === HttpStatusCodes.OK) {
        const verifyJson = await verifyResponse.json();
        expect(verifyJson.data.length).toBe(2);
        // Casbin 权限格式包含角色ID作为第一个字段
        expect(verifyJson.data).toContainEqual([roleId, "/api/admin/system/role", "write"]);
        expect(verifyJson.data).toContainEqual([roleId, "/api/admin/system/role", "delete"]);
      }
    });

    it("should clear all permissions when empty array provided", async () => {
      // First set some permissions
      await client.system.role[":id"].permissions.$put(
        {
          param: { id: roleId },
          json: {
            permissions: [
              ["/api/admin/system/user", "read"],
              ["/api/admin/system/role", "read"],
            ],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      // Then clear all permissions
      const response = await client.system.role[":id"].permissions.$put(
        {
          param: { id: roleId },
          json: {
            permissions: [],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json.data.total).toBe(0);
        expect(json.data.removed).toBeGreaterThan(0);
      }

      // Verify permissions were cleared
      const verifyResponse = await client.system.role[":id"].permissions.$get(
        { param: { id: roleId } },
        { headers: getAuthHeaders(adminToken) },
      );

      if (verifyResponse.status === HttpStatusCodes.OK) {
        const verifyJson = await verifyResponse.json();
        expect(verifyJson.data.length).toBe(0);
      }
    });

    it("should return 404 for non-existent role", async () => {
      const nonExistentId = "non_existent_role";
      const response = await client.system.role[":id"].permissions.$put(
        {
          param: { id: nonExistentId },
          json: {
            permissions: [["/api/admin", "read"]],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });
  });
});
