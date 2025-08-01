import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { describe, expect, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";

import { notices } from "./notices.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建公开通知应用
function createPublicNoticesApp() {
  return createApp().route("/", notices);
}

const publicNoticesClient = testClient(createPublicNoticesApp());

describe("public notices routes", () => {
  /** 公开获取通知公告列表 */
  it("should be able to get public notices list", async () => {
    const response = await publicNoticesClient.notices.$get({
      query: {
        page: "1",
        limit: "10",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      if ("data" in json) {
        // 分页结果
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.data.length).toBeGreaterThanOrEqual(0);
        expect(typeof json.meta.total).toBe("number");
        expect(json.meta.page).toBe(1);
        expect(json.meta.limit).toBe(10);

        // 验证所有返回的通知都是已启用的
        json.data.forEach((notice: any) => {
          expect(notice.status).toBe(1);
          expect(notice.id).toBeDefined();
          expect(notice.title).toBeDefined();
          expect(notice.type).toMatch(/^(NOTIFICATION|ANNOUNCEMENT)$/);
        });
      }
      else {
        // 数组结果
        expect(Array.isArray(json)).toBe(true);
        (json as any[]).forEach((notice: any) => {
          expect(notice.status).toBe(1);
          expect(notice.id).toBeDefined();
          expect(notice.title).toBeDefined();
          expect(notice.type).toMatch(/^(NOTIFICATION|ANNOUNCEMENT)$/);
        });
      }
    }
  });

  /** 按类型筛选公开通知公告 */
  it("should be able to filter public notices by type", async () => {
    const response = await publicNoticesClient.notices.$get({
      query: {
        page: "1",
        limit: "10",
        type: "NOTIFICATION",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      if ("data" in json) {
        expect(Array.isArray(json.data)).toBe(true);
        // 验证所有返回的通知都是 NOTIFICATION 类型且已启用
        json.data.forEach((notice: any) => {
          expect(notice.type).toBe("NOTIFICATION");
          expect(notice.status).toBe(1);
        });
      }
    }
  });

  /** 按类型筛选公开公告 */
  it("should be able to filter public announcements by type", async () => {
    const response = await publicNoticesClient.notices.$get({
      query: {
        page: "1",
        limit: "10",
        type: "ANNOUNCEMENT",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      if ("data" in json) {
        expect(Array.isArray(json.data)).toBe(true);
        // 验证所有返回的通知都是 ANNOUNCEMENT 类型且已启用
        json.data.forEach((notice: any) => {
          expect(notice.type).toBe("ANNOUNCEMENT");
          expect(notice.status).toBe(1);
        });
      }
    }
  });

  /** 搜索公开通知公告 */
  it("should be able to search public notices", async () => {
    const response = await publicNoticesClient.notices.$get({
      query: {
        page: "1",
        limit: "10",
        search: "测试",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      if ("data" in json) {
        expect(Array.isArray(json.data)).toBe(true);
        // 验证搜索结果中的通知都包含搜索关键词
        json.data.forEach((notice: any) => {
          expect(notice.status).toBe(1); // 只返回已启用的
          const titleMatch = notice.title && notice.title.includes("测试");
          const contentMatch = notice.content && notice.content.includes("测试");
          expect(titleMatch || contentMatch).toBe(true);
        });
      }
    }
  });

  /** 分页参数验证 */
  it("should validate pagination parameters", async () => {
    // 测试页码为0
    const response1 = await publicNoticesClient.notices.$get({
      query: {
        page: "0",
        limit: "10",
        domain: "default",
      },
    });
    expect([HttpStatusCodes.OK, HttpStatusCodes.BAD_REQUEST].includes(response1.status)).toBe(true);

    // 测试每页数量为0
    const response2 = await publicNoticesClient.notices.$get({
      query: {
        page: "1",
        limit: "0",
        domain: "default",
      },
    });
    expect([HttpStatusCodes.OK, HttpStatusCodes.BAD_REQUEST].includes(response2.status)).toBe(true);

    // 测试超大分页数量
    const response3 = await publicNoticesClient.notices.$get({
      query: {
        page: "1",
        limit: "1000",
        domain: "default",
      },
    });
    expect([HttpStatusCodes.OK, HttpStatusCodes.BAD_REQUEST].includes(response3.status)).toBe(true);
  });

  /** 无效类型参数 */
  it("should handle invalid type parameter", async () => {
    const response = await publicNoticesClient.notices.$get({
      query: {
        page: "1",
        limit: "10",
        // @ts-expect-error 测试用
        type: "INVALID_TYPE",
        domain: "default",
      },
    });

    expect([HttpStatusCodes.OK, HttpStatusCodes.BAD_REQUEST].includes(response.status)).toBe(true);
  });

  /** 大分页测试 */
  it("should handle large page numbers gracefully", async () => {
    const response = await publicNoticesClient.notices.$get({
      query: {
        page: "999999",
        limit: "10",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      if ("data" in json) {
        expect(Array.isArray(json.data)).toBe(true);
        // 超大页码应该返回空数组
        expect(json.data.length).toBe(0);
        expect(json.meta.page).toBe(999999);
      }
    }
  });

  /** 空搜索条件测试 */
  it("should handle empty search gracefully", async () => {
    const response = await publicNoticesClient.notices.$get({
      query: {
        page: "1",
        limit: "10",
        search: "",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      if ("data" in json) {
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.data.length).toBeGreaterThanOrEqual(0);
      }
    }
  });

  /** 获取单个公开通知公告 - 有效ID */
  it("should be able to get single public notice with valid id", async () => {
    // 先获取列表中的第一条记录
    const listResponse = await publicNoticesClient.notices.$get({
      query: {
        page: "1",
        limit: "1",
        domain: "default",
      },
    });

    expect(listResponse.status).toBe(HttpStatusCodes.OK);

    if (listResponse.status === HttpStatusCodes.OK) {
      const listJson = await listResponse.json();

      const notices = "data" in listJson ? listJson.data : listJson;

      if (notices.length > 0) {
        const firstNotice = notices[0];

        // 测试获取单个通知
        const response = await publicNoticesClient.notices[":id"].$get({
          param: {
            id: firstNotice.id,
          },
          query: {
            domain: "default",
          },
        });

        expect(response.status).toBe(HttpStatusCodes.OK);
        if (response.status === HttpStatusCodes.OK) {
          const json = await response.json();
          expect(json.id).toBe(firstNotice.id);
          expect(json.title).toBe(firstNotice.title);
          expect(json.type).toBe(firstNotice.type);
          expect(json.status).toBe(1); // 只能获取已启用的
        }
      }
    }
  });

  /** 获取单个公开通知公告 - 无效ID */
  it("should return 404 for non-existent notice", async () => {
    const response = await publicNoticesClient.notices[":id"].$get({
      param: {
        id: "550e8400-e29b-41d4-a716-446655440000", // 有效UUID格式但不存在
      },
      query: {
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });

  /** 获取单个公开通知公告 - 格式错误的ID */
  it("should handle invalid uuid format", async () => {
    const response = await publicNoticesClient.notices[":id"].$get({
      param: {
        id: "invalid-uuid-format",
      },
      query: {
        domain: "default",
      },
    });

    expect([HttpStatusCodes.BAD_REQUEST, HttpStatusCodes.NOT_FOUND].includes(response.status)).toBe(true);
  });

  /** 默认排序测试 */
  it("should return notices in correct order (by sortOrder desc, then createdAt desc)", async () => {
    const response = await publicNoticesClient.notices.$get({
      query: {
        page: "1",
        limit: "5",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();

      const notices = "data" in json ? json.data : json;

      if (notices.length > 1) {
        // 验证排序：sortOrder 降序，然后 createdAt 降序
        for (let i = 0; i < notices.length - 1; i++) {
          const current = notices[i];
          const next = notices[i + 1];

          if (current.sortOrder === next.sortOrder) {
            // 如果 sortOrder 相同，则应该按 createdAt 降序
            expect(new Date(current.createdAt).getTime()).toBeGreaterThanOrEqual(
              new Date(next.createdAt).getTime(),
            );
          }
          else {
            // 否则应该按 sortOrder 降序
            expect(current.sortOrder).toBeGreaterThanOrEqual(next.sortOrder);
          }
        }
      }
    }
  });
});
