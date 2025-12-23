import { and, eq, like, or } from "drizzle-orm";
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import db from "@/db";
import { casbinRule, systemUserRoles, systemUsers } from "@/db/schema";
import env from "@/env";
import { Status } from "@/lib/enums";
import { createTestApp } from "@/lib/internal/create-app";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { authorize } from "@/middlewares/authorize";
import systemUsersRouter from "@/routes/admin/system/users";
import { getAdminToken, getAuthHeaders, getUserToken } from "~/tests/auth-utils";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

function createSysUsersApp() {
  return createTestApp()
    .use("/system/users/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/users/*", authorize())
    .route("/", systemUsersRouter);
}

const client = testClient(createSysUsersApp());

// 测试数据
const testUsername = `t123`; // 基础用户名要短，因为会添加后缀
const testUser = {
  username: testUsername,
  password: "test123456",
  nickName: "测试用户",
  status: Status.ENABLED,
  avatar: "https://example.com/avatar.png",
};

/**
 * 清理测试创建的用户数据
 * 删除所有符合测试用户模式的用户
 */
async function cleanupTestUsers(): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // 查找所有测试用户（以 t 开头，后面跟数字的用户名模式）
      const testUsers = await tx
        .select({ id: systemUsers.id, username: systemUsers.username })
        .from(systemUsers)
        .where(
          or(
            like(systemUsers.username, "t123_%"), // 主要的测试用户模式
            like(systemUsers.username, "test_%"), // 其他可能的测试用户
            like(systemUsers.username, "t%_test"), // 其他测试模式
          ),
        );

      if (testUsers.length === 0) {
        return;
      }

      const userIds = testUsers.map(u => u.id);

      // 删除用户角色关联
      await tx
        .delete(systemUserRoles)
        .where(or(...userIds.map(id => eq(systemUserRoles.userId, id))));

      // 删除 Casbin 规则（如果有用户相关的规则）
      await tx
        .delete(casbinRule)
        .where(
          and(
            eq(casbinRule.ptype, "g"),
            or(...userIds.map(id => eq(casbinRule.v0, id))),
          ),
        );

      // 删除用户本身
      await tx
        .delete(systemUsers)
        .where(
          or(
            like(systemUsers.username, "t123_%"),
            like(systemUsers.username, "test_%"),
            like(systemUsers.username, "t%_test"),
          ),
        );
    });
  }
  catch (error) {
    console.error("清理测试用户失败:", error);
    throw error;
  }
}

describe("system user routes", () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    // 清理可能存在的遗留测试数据
    await cleanupTestUsers();

    adminToken = await getAdminToken();
    userToken = await getUserToken();
  });

  // 确保测试结束后清理所有测试数据
  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe("authentication & authorization", () => {
    it("should allow authenticated admin requests", async () => {
      const response = await client.system.users.$get(
        { query: {} },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);
    });

    it("should deny access with user token (no admin permissions)", async () => {
      const response = await client.system.users.$get(
        { query: {} },
        { headers: getAuthHeaders(userToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);
    });

    it("should require authentication", async () => {
      const response = await client.system.users.$get(
        { query: {} },
        {},
      );

      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });
  });

  describe("get /system/user - list users", () => {
    it("should validate pagination parameters", async () => {
      const response = await client.system.users.$get(
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

    it("should list users with default pagination", async () => {
      const response = await client.system.users.$get(
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

    it("should support filtering by username", async () => {
      const response = await client.system.users.$get(
        {
          query: {
            filters: JSON.stringify([
              { field: "username", operator: "contains", value: "admin" },
            ]),
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        const items = Array.isArray(json.data) ? json.data : [];

        expect(items.some((user: { username: string }) =>
          user.username.includes("admin"),
        )).toBe(true);
      }
    });

    it("should support sorting", async () => {
      const response = await client.system.users.$get(
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

  describe("post /system/user - create user", () => {
    it("should validate required fields", async () => {
      const response = await client.system.users.$post(
        {
          // @ts-expect-error - 测试必填字段验证，故意传入不完整的数据
          json: {
            username: `${testUsername}_required`,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

      if (response.status === HttpStatusCodes.UNPROCESSABLE_ENTITY) {
        const json = await response.json() as { message?: string; error?: { issues?: unknown } };

        expect(json.error?.issues).toBeDefined();
      }
    });

    it("should validate username format (4-15 chars, alphanumeric)", async () => {
      const response = await client.system.users.$post(
        {
          json: {
            ...testUser,
            username: "ab", // Too short
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

      const response2 = await client.system.users.$post(
        {
          json: {
            ...testUser,
            username: "test-user!", // Invalid characters
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response2.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should validate password length (6-20 chars)", async () => {
      const response = await client.system.users.$post(
        {
          json: {
            ...testUser,
            username: `${testUsername}_pwd`,
            password: "12345", // Too short
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should create a new user", async () => {
      const newUsername = `${testUsername}_create`;
      const response = await client.system.users.$post(
        {
          json: {
            ...testUser,
            username: newUsername,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);

      if (response.status === HttpStatusCodes.CREATED) {
        const json = await response.json();

        expect(json.data.username).toBe(newUsername);
        expect(json.data.nickName).toBe(testUser.nickName);
        expect(json.data).not.toHaveProperty("password"); // Password should not be returned
      }
    });

    it("should return 409 for duplicate username", async () => {
      const duplicateUsername = `${testUsername}_duplicate`;

      // Create first user
      const response1 = await client.system.users.$post(
        {
          json: {
            ...testUser,
            username: duplicateUsername,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response1.status).toBe(HttpStatusCodes.CREATED);

      // Try to create duplicate
      const response2 = await client.system.users.$post(
        {
          json: {
            ...testUser,
            username: duplicateUsername,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response2.status).toBe(HttpStatusCodes.CONFLICT);

      if (response2.status === HttpStatusCodes.CONFLICT) {
        const json = await response2.json() as { message: string };

        expect(json.message).toBeDefined();
      }
    });
  });

  describe("get /system/user/{id} - get user", () => {
    let userId: string;

    beforeAll(async () => {
      // Create a user for testing
      const response = await client.system.users.$post(
        {
          json: {
            ...testUser,
            username: `${testUsername}_gettest`,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);

      if (response.status === HttpStatusCodes.CREATED) {
        const json = await response.json();
        userId = json.data.id;
      }
    });

    it("should validate UUID format", async () => {
      const response = await client.system.users[":id"].$get(
        { param: { id: "invalid-uuid" } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = crypto.randomUUID();
      const response = await client.system.users[":id"].$get(
        { param: { id: nonExistentId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);

      if (response.status === HttpStatusCodes.NOT_FOUND) {
        const json = await response.json() as { message: string };

        expect(json.message).toBeDefined();
      }
    });

    it("should get user details", async () => {
      const response = await client.system.users[":id"].$get(
        { param: { id: userId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();

        expect(json.data.id).toBe(userId);
        expect(json.data.username).toBe(`${testUsername}_gettest`);
        expect(json.data).not.toHaveProperty("password"); // Password should not be returned
      }
    });
  });

  describe("patch /system/user/{id} - update user", () => {
    let userId: string;
    let builtInUserId: string;

    beforeAll(async () => {
      // Create a regular user for testing
      const response = await client.system.users.$post(
        {
          json: {
            ...testUser,
            username: `${testUsername}_update`,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);

      if (response.status === HttpStatusCodes.CREATED) {
        const json = await response.json();
        userId = json.data.id;
      }

      // Get built-in admin user ID
      const adminResponse = await client.system.users.$get(
        {
          query: {
            filters: JSON.stringify([
              { field: "username", operator: "eq", value: "admin" },
            ]),
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      if (adminResponse.status === HttpStatusCodes.OK) {
        const json = await adminResponse.json();
        const items = Array.isArray(json.data) ? json.data : [];
        if (items.length > 0) {
          builtInUserId = items[0].id;
        }
      }
    });

    it("should validate empty body", async () => {
      const response = await client.system.users[":id"].$patch(
        {
          param: { id: userId },
          json: {},
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should update user fields", async () => {
      const response = await client.system.users[":id"].$patch(
        {
          param: { id: userId },
          json: {
            nickName: "更新后的昵称",
            avatar: "https://example.com/new-avatar.png",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();

        expect(json.data.nickName).toBe("更新后的昵称");
        expect(json.data.avatar).toBe("https://example.com/new-avatar.png");
      }
    });

    it("should return 403 when updating built-in user status", async () => {
      if (!builtInUserId) {
        console.warn("No built-in user found, skipping test");
        return;
      }

      const response = await client.system.users[":id"].$patch(
        {
          param: { id: builtInUserId },
          json: {
            status: Status.DISABLED,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);

      if (response.status === HttpStatusCodes.FORBIDDEN) {
        const json = await response.json() as { message: string };

        expect(json.message).toBeDefined();
      }
    });

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = crypto.randomUUID();
      const response = await client.system.users[":id"].$patch(
        {
          param: { id: nonExistentId },
          json: {
            nickName: "Test",
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });
  });

  describe("delete /system/user/{id} - delete user", () => {
    let builtInUserId: string;

    beforeAll(async () => {
      // Get built-in admin user ID
      const adminResponse = await client.system.users.$get(
        {
          query: {
            filters: JSON.stringify([
              { field: "username", operator: "eq", value: "admin" },
            ]),
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      if (adminResponse.status === HttpStatusCodes.OK) {
        const json = await adminResponse.json();
        const items = Array.isArray(json.data) ? json.data : [];
        if (items.length > 0) {
          builtInUserId = items[0].id;
        }
      }
    });

    it("should validate UUID format", async () => {
      const response = await client.system.users[":id"].$delete(
        { param: { id: "invalid-uuid" } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should return 403 when deleting built-in user", async () => {
      if (!builtInUserId) {
        console.warn("No built-in user found, skipping test");
        return;
      }

      const response = await client.system.users[":id"].$delete(
        { param: { id: builtInUserId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.FORBIDDEN);

      if (response.status === HttpStatusCodes.FORBIDDEN) {
        const json = await response.json() as { message: string };

        expect(json.message).toBeDefined();
      }
    });

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = crypto.randomUUID();
      const response = await client.system.users[":id"].$delete(
        { param: { id: nonExistentId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });

    it("should delete user successfully", async () => {
      // 先创建一个用户用于测试删除功能
      const createResponse = await client.system.users.$post(
        {
          json: {
            ...testUser,
            username: `${testUsername}_delete`,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(createResponse.status).toBe(HttpStatusCodes.CREATED);

      if (createResponse.status !== HttpStatusCodes.CREATED) {
        throw new Error("Failed to create test user");
      }
      const json = await createResponse.json();
      const deleteTestUserId = json.data.id;

      // 测试删除功能
      const deleteResponse = await client.system.users[":id"].$delete(
        { param: { id: deleteTestUserId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(deleteResponse.status).toBe(HttpStatusCodes.OK);

      if (deleteResponse.status === HttpStatusCodes.OK) {
        const deleteJson = await deleteResponse.json();

        expect(deleteJson.data.id).toBe(deleteTestUserId);
      }

      // 验证用户已被删除
      const verifyResponse = await client.system.users[":id"].$get(
        { param: { id: deleteTestUserId } },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(verifyResponse.status).toBe(HttpStatusCodes.NOT_FOUND);
    });
  });

  describe("put /system/user/{userId}/roles - save user roles", () => {
    let userId: string;

    beforeAll(async () => {
      // Create a user for role testing
      const response = await client.system.users.$post(
        {
          json: {
            ...testUser,
            username: `${testUsername}_roles`,
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.CREATED);

      if (response.status === HttpStatusCodes.CREATED) {
        const json = await response.json();
        userId = json.data.id;
      }
    });

    it("should validate userId format", async () => {
      const response = await client.system.users[":userId"].roles.$put(
        {
          param: { userId: "invalid-uuid" },
          json: {
            roleIds: ["admin"],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should validate roleIds array", async () => {
      const response = await client.system.users[":userId"].roles.$put(
        {
          param: { userId },
          json: {
            roleIds: "not-an-array" as unknown as string[],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);

      const response2 = await client.system.users[":userId"].roles.$put(
        {
          param: { userId },
          json: {
            roleIds: [""], // Empty string not allowed
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response2.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should return 404 for non-existent user", async () => {
      const nonExistentId = crypto.randomUUID();
      const response = await client.system.users[":userId"].roles.$put(
        {
          param: { userId: nonExistentId },
          json: {
            roleIds: ["admin"],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    });

    it("should save user roles successfully", async () => {
      const response = await client.system.users[":userId"].roles.$put(
        {
          param: { userId },
          json: {
            roleIds: ["admin", "user"],
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
      }
    });

    it("should update roles (replace existing)", async () => {
      // First set some roles
      await client.system.users[":userId"].roles.$put(
        {
          param: { userId },
          json: {
            roleIds: ["admin", "user"],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      // Then replace with different roles
      const response = await client.system.users[":userId"].roles.$put(
        {
          param: { userId },
          json: {
            roleIds: ["user"], // 使用实际存在的角色
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      expect(response.status).toBe(HttpStatusCodes.OK);

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();

        expect(json.data.total).toBe(1);
        expect(json.data.removed).toBeGreaterThan(0); // Should have removed previous roles
      }
    });

    it("should clear all roles when empty array provided", async () => {
      // First set some roles
      await client.system.users[":userId"].roles.$put(
        {
          param: { userId },
          json: {
            roleIds: ["admin"],
          },
        },
        { headers: getAuthHeaders(adminToken) },
      );

      // Then clear all roles
      const response = await client.system.users[":userId"].roles.$put(
        {
          param: { userId },
          json: {
            roleIds: [],
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
    });
  });
});
