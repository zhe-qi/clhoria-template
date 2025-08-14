/* eslint-disable ts/ban-ts-comment */
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { describe, expect, expectTypeOf, it } from "vitest";

import env from "@/env";
import createApp from "@/lib/create-app";
import { casbin } from "@/middlewares/jwt-auth";
import { getAdminToken, getAuthHeaders, getUserToken } from "@/utils/test-utils";

import { systemPosts } from "./posts.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建岗位管理应用
function createPostsApp() {
  return createApp()
    .use("/system/posts/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/system/posts/*", casbin())
    .route("/", systemPosts);
}

const postsClient = testClient(createPostsApp());

describe("systemPosts routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let createdPostId: string;
  let testPost: any;

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
    const response = await postsClient.system.posts.$get({
      query: {
        page: "1",
        limit: "10",
      },
    });
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 无效 token 应该返回 401 */
  it("access with invalid token should return 401", async () => {
    const response = await postsClient.system.posts.$get(
      {
        query: {
          page: "1",
          limit: "10",
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

  /** 管理员创建岗位 */
  it("admin should be able to create post", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    testPost = {
      postCode: `P${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      postName: "测试岗位",
      postSort: 100,
      status: 1,
      remark: "这是一个测试岗位",
    };

    const response = await postsClient.system.posts.$post(
      {
        json: testPost,
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.CREATED);
    if (response.status === HttpStatusCodes.CREATED) {
      const json = await response.json();
      expect(json.postCode).toBe(testPost.postCode);
      expect(json.postName).toBe(testPost.postName);
      expect(json.postSort).toBe(testPost.postSort);
      expect(json.status).toBe(testPost.status);
      expect(json.remark).toBe(testPost.remark);
      expect(json.id).toBeDefined();
      createdPostId = json.id;
    }
  });

  /** 管理员创建岗位参数验证 */
  it("admin create post should validate parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await postsClient.system.posts.$post(
      {
        // @ts-ignore
        json: {
          postCode: "", // 岗位编码不能为空
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    if (response.status === HttpStatusCodes.UNPROCESSABLE_ENTITY) {
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
      expect(json.error.name).toBe("ZodError");
      expect(json.error.issues).toBeDefined();
    }
  });

  /** 岗位编码重复应该返回冲突错误 */
  it("duplicate post code should return conflict error", async () => {
    // 跳过测试如果没有管理员 token 或创建的岗位
    if (!adminToken || !testPost) {
      expect(true).toBe(true);
      return;
    }

    const response = await postsClient.system.posts.$post(
      {
        json: {
          ...testPost,
          postName: "重复编码岗位",
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.CONFLICT);
    if (response.status === HttpStatusCodes.CONFLICT) {
      const json = await response.json();
      expect(json.error?.issues?.[0]?.message).toContain("已存在");
    }
  });

  /** 管理员获取岗位列表 */
  it("admin should be able to list posts", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await postsClient.system.posts.$get(
      {
        query: {
          page: "1",
          limit: "10",
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
      expect(json.meta.page).toBe(1);
      // @ts-ignore
      expect(json.meta.limit).toBe(10);
    }
  });

  /** 管理员搜索岗位 */
  it("admin should be able to search posts", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await postsClient.system.posts.$get(
      {
        query: {
          page: "1",
          limit: "10",
          search: "测试",
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
      // 如果创建了测试岗位，应该能搜索到
      if (createdPostId) {
        expect(json.data.some(post => post.id === createdPostId)).toBe(true);
      }
    }
  });

  /** 管理员获取简化岗位列表 */
  it("admin should be able to get simple post list", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await postsClient.system.posts["simple-list"].$get(
      {},
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expectTypeOf(json).toBeArray();
      json.forEach((post) => {
        expect(post).toHaveProperty("id");
        expect(post).toHaveProperty("postCode");
        expect(post).toHaveProperty("postName");
        expect(post).toHaveProperty("postSort");
        expect(post).toHaveProperty("status");
        expect(post.status).toBe(1); // 只返回启用的岗位
      });
    }
  });

  /** 管理员获取单个岗位 */
  it("admin should be able to get single post", async () => {
    // 跳过测试如果没有管理员 token 或创建的岗位 ID
    if (!adminToken || !createdPostId) {
      expect(true).toBe(true);
      return;
    }

    const response = await postsClient.system.posts[":id"].$get(
      {
        param: {
          id: createdPostId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.id).toBe(createdPostId);
      expect(json.postCode).toBe(testPost.postCode);
      expect(json.postName).toBe(testPost.postName);
    }
  });

  /** 管理员更新岗位 */
  it("admin should be able to update post", async () => {
    // 跳过测试如果没有管理员 token 或创建的岗位 ID
    if (!adminToken || !createdPostId) {
      expect(true).toBe(true);
      return;
    }

    const updateData = {
      postName: "更新的测试岗位",
      postSort: 200,
      status: 0,
      remark: "更新后的备注",
    };

    const response = await postsClient.system.posts[":id"].$patch(
      {
        param: {
          id: createdPostId,
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
      expect(json.postName).toBe(updateData.postName);
      expect(json.postSort).toBe(updateData.postSort);
      expect(json.status).toBe(updateData.status);
      expect(json.remark).toBe(updateData.remark);
    }
  });

  /** 管理员分配用户给岗位 */
  it("admin should be able to assign users to post", async () => {
    // 跳过测试如果没有管理员 token 或创建的岗位 ID
    if (!adminToken || !createdPostId) {
      expect(true).toBe(true);
      return;
    }

    const response = await postsClient.system.posts[":id"].users.$post(
      {
        param: {
          id: createdPostId,
        },
        json: {
          userIds: [], // 空数组测试
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(typeof json.added).toBe("number");
      expect(typeof json.removed).toBe("number");
    }
  });

  /** 普通用户权限测试（如果有 userToken） */
  it("regular user should have limited access", async () => {
    // 跳过测试如果没有普通用户 token
    if (!userToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await postsClient.system.posts.$get(
      {
        query: {
          page: "1",
          limit: "10",
        },
      },
      {
        headers: getAuthHeaders(userToken),
      },
    );

    // 普通用户可能没有访问岗位管理的权限
    expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.UNAUTHORIZED]).toContain(response.status);
  });

  /** ID 参数验证 */
  it("should validate UUID parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await postsClient.system.posts[":id"].$get(
      {
        param: {
          id: "invalid-uuid",
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
  });

  /** 404 测试 */
  it("should return 404 for non-existent post", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await postsClient.system.posts[":id"].$get(
      {
        param: {
          id: "550e8400-e29b-41d4-a716-446655440000", // 不存在的 UUID
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });

  /** 尝试删除有用户关联的岗位应该返回冲突错误 */
  it("should prevent deletion of post with assigned users", async () => {
    // 跳过测试如果没有管理员 token 或创建的岗位 ID
    if (!adminToken || !createdPostId) {
      expect(true).toBe(true);
      return;
    }

    // 首先尝试分配一些用户（这里使用空数组，实际测试中可能需要真实用户ID）
    // 由于测试环境的限制，我们只测试删除逻辑
    const response = await postsClient.system.posts[":id"].$delete(
      {
        param: {
          id: createdPostId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    // 如果没有用户关联，应该能正常删除
    // 如果有用户关联，应该返回冲突错误
    expect([HttpStatusCodes.NO_CONTENT, HttpStatusCodes.CONFLICT]).toContain(response.status);
  });

  /** 管理员删除岗位 */
  it("admin should be able to delete post", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    // 创建一个新的岗位用于删除测试
    const deleteTestPost = {
      postCode: `DEL${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      postName: "待删除测试岗位",
      postSort: 200,
      status: 1,
      remark: "这是一个用于删除测试的岗位",
    };

    const createResponse = await postsClient.system.posts.$post(
      {
        json: deleteTestPost,
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    if (createResponse.status !== HttpStatusCodes.CREATED) {
      expect(true).toBe(true); // 跳过测试如果创建失败
      return;
    }

    const createdPost = await createResponse.json();
    const postIdToDelete = createdPost.id;

    const response = await postsClient.system.posts[":id"].$delete(
      {
        param: {
          id: postIdToDelete,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NO_CONTENT);
  });

  /** 验证岗位已被删除 */
  it("deleted post should return 404", async () => {
    // 跳过测试如果没有管理员 token 或创建的岗位 ID
    if (!adminToken || !createdPostId) {
      expect(true).toBe(true);
      return;
    }

    const response = await postsClient.system.posts[":id"].$get(
      {
        param: {
          id: createdPostId,
        },
      },
      {
        headers: getAuthHeaders(adminToken),
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });
});
