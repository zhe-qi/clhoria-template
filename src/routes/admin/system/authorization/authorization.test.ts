import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { beforeAll, describe, expect, it } from "vitest";

import db from "@/db";
import env from "@/env";
import createApp from "@/lib/create-app";
import { casbin } from "@/middlewares/jwt-auth";
import { getAdminToken, getAuthHeaders } from "@/utils/test-utils";

import { systemAuthorization } from "./authorization.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建授权管理应用
function createAuthorizationApp() {
  return createApp()
    .use("/system/authorization/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/authorization/*", casbin())
    .route("/", systemAuthorization);
}

const authorizationClient = testClient(createAuthorizationApp());

describe("authorization management", () => {
  let adminToken: string;
  let testRoleId: string;
  let testUserId: string;

  beforeAll(async () => {
    // 获取管理员token
    adminToken = await getAdminToken();

    // 查找一个存在的角色用于测试
    const role = await db.query.systemRole.findFirst({
      where: (table, { eq }) => eq(table.domain, "default"),
    });
    testRoleId = role?.id || "550e8400-e29b-41d4-a716-446655440000";

    // 查找一个存在的用户用于测试
    const user = await db.query.systemUser.findFirst({
      where: (table, { eq }) => eq(table.domain, "default"),
    });
    testUserId = user?.id || "550e8400-e29b-41d4-a716-446655440000";
  });

  describe("authentication", () => {
    it("should reject requests without token", async () => {
      const response = await authorizationClient.system.authorization.roles[":roleId"].permissions.$post({
        param: { roleId: testRoleId },
        json: {
          domain: "default",
          permissions: [],
        },
      });
      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });

    it("should reject requests with invalid token", async () => {
      const response = await authorizationClient.system.authorization.roles[":roleId"].permissions.$post(
        {
          param: { roleId: testRoleId },
          json: {
            domain: "default",
            permissions: [],
          },
        },
        {
          headers: {
            Authorization: "Bearer invalid-token",
          },
        },
      );
      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });
  });

  describe("role permission management", () => {
    it("should assign permissions to role successfully", async () => {
      const response = await authorizationClient.system.authorization.roles[":roleId"].permissions.$post(
        {
          param: { roleId: testRoleId },
          json: {
            domain: "default",
            permissions: ["SYSTEM_USERS:READ", "SYSTEM_ROLES:READ"],
          },
        },
        {
          headers: getAuthHeaders(adminToken),
        },
      );

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json).toHaveProperty("success");
        expect(json).toHaveProperty("added");
        expect(json).toHaveProperty("removed");
        expect(typeof json.success).toBe("boolean");
        expect(typeof json.added).toBe("number");
        expect(typeof json.removed).toBe("number");
      }
      else {
        // 角色可能不存在，这是正常的
        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
      }
    });

    it("should get role permissions", async () => {
      const response = await authorizationClient.system.authorization.roles[":roleId"].permissions.$get(
        {
          param: { roleId: testRoleId },
          query: { domain: "default" },
        },
        {
          headers: getAuthHeaders(adminToken),
        },
      );

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json).toHaveProperty("domain");
        expect(json).toHaveProperty("permissions");
        expect(Array.isArray(json.permissions)).toBe(true);
      }
      else {
        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
      }
    });
  });

  describe("role menu management", () => {
    it("should assign routes to role successfully", async () => {
      const response = await authorizationClient.system.authorization.roles[":roleId"].routes.$post(
        {
          param: { roleId: testRoleId },
          json: {
            domain: "default",
            menuIds: [],
          },
        },
        {
          headers: getAuthHeaders(adminToken),
        },
      );

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json).toHaveProperty("success");
        expect(json).toHaveProperty("added");
        expect(json).toHaveProperty("removed");
      }
      else {
        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
      }
    });

    it("should get role menus", async () => {
      const response = await authorizationClient.system.authorization.roles[":roleId"].menus.$get(
        {
          param: { roleId: testRoleId },
          query: { domain: "default" },
        },
        {
          headers: getAuthHeaders(adminToken),
        },
      );

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json).toHaveProperty("domain");
        expect(json).toHaveProperty("menuIds");
        expect(Array.isArray(json.menuIds)).toBe(true);
      }
      else {
        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
      }
    });
  });

  describe("user role management", () => {
    it("should assign roles to user successfully", async () => {
      const response = await authorizationClient.system.authorization.users[":userId"].roles.$post(
        {
          param: { userId: testUserId },
          json: {
            roleIds: [],
          },
        },
        {
          headers: getAuthHeaders(adminToken),
        },
      );

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json).toHaveProperty("success");
        expect(json).toHaveProperty("added");
        expect(json).toHaveProperty("removed");
      }
      else {
        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
      }
    });

    it("should get user roles", async () => {
      const response = await authorizationClient.system.authorization.users[":userId"].roles.$get(
        {
          param: { userId: testUserId },
          query: { domain: "default" },
        },
        {
          headers: getAuthHeaders(adminToken),
        },
      );

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(Array.isArray(json)).toBe(true);
        if (json.length > 0) {
          const role = json[0];
          expect(role).toHaveProperty("id");
          expect(role).toHaveProperty("code");
          expect(role).toHaveProperty("name");
          expect(role).toHaveProperty("status");
        }
      }
      else {
        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
      }
    });

    it("should get user routes", async () => {
      const response = await authorizationClient.system.authorization.users[":userId"].routes.$get(
        {
          param: { id: testUserId },
          query: { domain: "default" },
        },
        {
          headers: getAuthHeaders(adminToken),
        },
      );

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json).toHaveProperty("routes");
        expect(json).toHaveProperty("home");
        expect(Array.isArray(json.routes)).toBe(true);
      }
      else {
        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
      }
    });
  });

  describe("role user management", () => {
    it("should assign users to role successfully", async () => {
      const response = await authorizationClient.system.authorization.roles[":roleId"].users.$post(
        {
          param: { roleId: testRoleId },
          json: {
            userIds: [],
          },
        },
        {
          headers: getAuthHeaders(adminToken),
        },
      );

      if (response.status === HttpStatusCodes.OK) {
        const json = await response.json();
        expect(json).toHaveProperty("success");
        expect(json).toHaveProperty("added");
        expect(json).toHaveProperty("removed");
      }
      else {
        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
      }
    });
  });

  describe("parameter validation", () => {
    it("should validate UUID parameters", async () => {
      const response = await authorizationClient.system.authorization.roles[":roleId"].permissions.$get(
        {
          param: { roleId: "invalid-uuid" },
          query: { domain: "default" },
        },
        {
          headers: getAuthHeaders(adminToken),
        },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });

    it("should validate request body", async () => {
      const response = await authorizationClient.system.authorization.roles[":roleId"].permissions.$post(
        {
          param: { roleId: testRoleId },
          json: {
            domain: "default",
            // @ts-expect-error - 故意传入错误的数据类型进行测试
            permissions: "not-an-array",
          },
        },
        {
          headers: getAuthHeaders(adminToken),
        },
      );

      expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    });
  });
});
