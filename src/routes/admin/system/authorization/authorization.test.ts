import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import { beforeAll, describe, expect, it } from "vitest";

import db from "@/db";
import env from "@/env";
import createApp from "@/lib/create-app";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
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
      const response = await authorizationClient.system.authorization.roles[":roleId"].permissions.$get({
        param: { roleId: testRoleId },
        query: { domain: "default" },
      });
      expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
    });

    it("should reject requests with invalid token", async () => {
      const response = await authorizationClient.system.authorization.roles[":roleId"].permissions.$get(
        {
          param: { roleId: testRoleId },
          query: { domain: "default" },
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
    it("should get role permissions successfully", async () => {
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
    it("should get role menus successfully", async () => {
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
    it("should get user roles successfully", async () => {
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
      }
      else {
        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
      }
    });
  });

  describe("user route management", () => {
    it("should get user routes successfully", async () => {
      const response = await authorizationClient.system.authorization.users[":id"].routes.$get(
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
        expect(Array.isArray(json.routes)).toBe(true);
      }
      else {
        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
      }
    });
  });
});
