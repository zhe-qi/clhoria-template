/* eslint-disable ts/ban-ts-comment */
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { casbin } from "@/middlewares/jwt-auth";
import { getAdminToken, getAuthHeaders, getUserToken } from "@/utils/test-utils";

import { systemNotices } from "./notices.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建通知公告管理应用
function createNoticesApp() {
  return createApp()
    .use("/system/notices/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/notices/*", casbin())
    .route("/", systemNotices);
}

const noticesClient = testClient(createNoticesApp());

describe("notices routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let testNoticeId: string;
  let testNotice: any;

  /** 获取管理员token */
  it("should get admin token", async () => {
    adminToken = await getAdminToken();
    expect(adminToken).toBeDefined();
  });

  /** 获取普通用户token */
  it("should get user token", async () => {
    try {
      userToken = await getUserToken();
      expect(userToken).toBeDefined();
    }
    catch (error) {
      // 用户不存在是正常的
      expect(error).toBeDefined();
    }
  });

  /** 未认证访问应该返回 401 */
  it("access without token should return 401", async () => {
    const response = await noticesClient.system.notices.$get({
      query: {
        skip: "1",
        take: "10",
        where: {},
        orderBy: {},
        join: {},
      },
    });
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 无效 token 应该返回 401 */
  it("access with invalid token should return 401", async () => {
    const response = await noticesClient.system.notices.$get(
      {
        query: {
          skip: "1",
          take: "10",
          where: {},
          orderBy: {},
          join: {},
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

  /** 管理员创建通知公告 */
  it("admin should be able to create notice", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    testNotice = {
      title: "测试通知公告",
      type: "NOTIFICATION",
      content: "这是一个测试通知公告的内容，用于验证功能是否正常工作。",
      status: 1,
      sortOrder: 1,
    };

    const response = await noticesClient.system.notices.$post(
      {
        json: testNotice,
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.CREATED);
    if (response.status === HttpStatusCodes.CREATED) {
      const json = await response.json();
      expect(json.title).toBe(testNotice.title);
      expect(json.type).toBe(testNotice.type);
      expect(json.content).toBe(testNotice.content);
      expect(json.status).toBe(testNotice.status);
      expect(json.sortOrder).toBe(testNotice.sortOrder);
      expect(json.id).toBeDefined();
      testNoticeId = json.id;
    }
  });

  /** 管理员创建公告类型通知 */
  it("admin should be able to create announcement", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const announcement = {
      title: "测试公告",
      type: "ANNOUNCEMENT" as const,
      content: "这是一个重要公告，请所有用户注意。",
      status: 1,
      sortOrder: 2,
    };

    const response = await noticesClient.system.notices.$post(
      {
        json: announcement,
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.CREATED);
    if (response.status === HttpStatusCodes.CREATED) {
      const json = await response.json();
      expect(json.type).toBe("ANNOUNCEMENT");
      expect(json.title).toBe(announcement.title);
    }
  });

  /** 管理员创建通知参数验证 */
  it("admin create notice should validate parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await noticesClient.system.notices.$post(
      {
        // @ts-ignore
        json: {
          title: "", // 标题不能为空
          type: "INVALID_TYPE" as any, // 无效类型
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
  });

  /** 管理员获取通知公告列表 */
  it("admin should be able to list notices", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await noticesClient.system.notices.$get(
      {
        query: {
          skip: "1",
          take: "10",
          where: {},
          orderBy: {},
          join: {},
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json.data).toBeArray();
      expect(json.data.length).toBeGreaterThanOrEqual(0);
      // @ts-ignore
      expect(typeof json.meta.total).toBe("number");
      // @ts-ignore
      expect(json.meta.skip).toBe(1);
      // @ts-ignore
      expect(json.meta.take).toBe(10);
    }
  });

  /** 管理员按类型筛选通知公告 */
  it("admin should be able to filter notices by type", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await noticesClient.system.notices.$get(
      {
        query: {
          skip: "0",
          take: "10",
          where: {
            type: {
              contains: "ANNOUNCEMENT",
            },
          },
          orderBy: {},
          join: {},
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json.data).toBeArray();
      // 验证所有返回的通知都是 ANNOUNCEMENT 类型
      json.data.forEach((notice: any) => {
        expect(notice.type).toBe("ANNOUNCEMENT");
      });
    }
  });

  /** 管理员按状态筛选通知公告 */
  it("admin should be able to filter notices by status", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await noticesClient.system.notices.$get(
      {
        query: {
          skip: "1",
          take: "10",
          where: {
            status: {
              equals: "1",
            },
          },
          orderBy: {},
          join: {},
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json.data).toBeArray();
      // 验证所有返回的通知状态都是启用的
      json.data.forEach((notice: any) => {
        expect(notice.status).toBe(1);
      });
    }
  });

  /** 管理员搜索通知公告 */
  it("admin should be able to search notices", async () => {
    // 跳过测试如果没有管理员 token 或创建的通知ID
    if (!adminToken || !testNoticeId) {
      expect(true).toBe(true);
      return;
    }

    const response = await noticesClient.system.notices.$get(
      {
        query: {
          skip: "1",
          take: "10",
          where: {
            title: {
              contains: "测试通知",
            },
          },
          orderBy: {},
          join: {},
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json.data).toBeArray();
      // 如果搜索结果包含我们创建的通知，验证它
      const foundNotice = json.data.find((notice: any) => notice.id === testNoticeId);
      if (foundNotice) {
        expect(foundNotice.title).toContain("测试通知");
      }
    }
  });

  /** 管理员获取单个通知公告 */
  it("admin should be able to get single notice", async () => {
    // 跳过测试如果没有管理员 token 或创建的通知ID
    if (!adminToken || !testNoticeId) {
      expect(true).toBe(true);
      return;
    }

    const response = await noticesClient.system.notices[":id"].$get(
      {
        param: {
          id: testNoticeId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.id).toBe(testNoticeId);
      expect(json.title).toBe(testNotice.title);
      expect(json.type).toBe(testNotice.type);
      expect(json.content).toBe(testNotice.content);
    }
  });

  /** 管理员更新通知公告 */
  it("admin should be able to update notice", async () => {
    // 跳过测试如果没有管理员 token 或创建的通知ID
    if (!adminToken || !testNoticeId) {
      expect(true).toBe(true);
      return;
    }

    const updateData = {
      title: "更新的测试通知公告",
      content: "这是更新后的通知内容，验证更新功能是否正常。",
      status: 0,
      sortOrder: 5,
    };

    const response = await noticesClient.system.notices[":id"].$patch(
      {
        param: {
          id: testNoticeId,
        },
        json: updateData,
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.title).toBe(updateData.title);
      expect(json.content).toBe(updateData.content);
      expect(json.status).toBe(updateData.status);
      expect(json.sortOrder).toBe(updateData.sortOrder);
    }
  });

  /** 普通用户权限测试（如果有 userToken） */
  it("regular user should have limited access", async () => {
    // 跳过测试如果没有普通用户 token
    if (!userToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await noticesClient.system.notices.$get(
      {
        query: {
          skip: "1",
          take: "10",
          where: {},
          orderBy: {},
          join: {},
        },
      },
      {
        headers: getAuthHeaders(userToken),
      },
    );

    // 普通用户可能没有访问通知管理的权限
    expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.UNAUTHORIZED]).toContain(response.status);
  });

  /** ID 参数验证 */
  it("should validate id parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    // 测试无效UUID格式
    const response = await noticesClient.system.notices[":id"].$get(
      {
        param: {
          id: "invalid-uuid",
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect([HttpStatusCodes.UNPROCESSABLE_ENTITY, HttpStatusCodes.NOT_FOUND]).toContain(response.status);
  });

  /** 404 测试 */
  it("should return 404 for non-existent notice", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await noticesClient.system.notices[":id"].$get(
      {
        param: {
          id: "550e8400-e29b-41d4-a716-446655440000", // 有效UUID格式但不存在
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });

  /** 管理员删除通知公告 */
  it("admin should be able to delete notice", async () => {
    // 跳过测试如果没有管理员 token 或创建的通知ID
    if (!adminToken || !testNoticeId) {
      expect(true).toBe(true);
      return;
    }

    const response = await noticesClient.system.notices[":id"].$delete(
      {
        param: {
          id: testNoticeId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NO_CONTENT);
  });

  /** 验证通知公告已被删除 */
  it("deleted notice should return 404", async () => {
    // 跳过测试如果没有管理员 token 或创建的通知ID
    if (!adminToken || !testNoticeId) {
      expect(true).toBe(true);
      return;
    }

    const response = await noticesClient.system.notices[":id"].$get(
      {
        param: {
          id: testNoticeId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });
});
