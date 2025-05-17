import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";

import type { PaginatedResult } from "@/lib/pagination";

import { createTestApp } from "@/lib/create-app";

import { tasks } from "./tasks.index";

const client = testClient(createTestApp(tasks));

describe("任务路由", () => {
  it("get /tasks 获取任务列表", async () => {
    const response = await client.tasks.$get({
      query: {},
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json() as PaginatedResult<unknown>;
      expect(json).toHaveProperty("data");
      expect(json).toHaveProperty("meta");
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta).toHaveProperty("total");
      expect(json.meta).toHaveProperty("skip");
      expect(json.meta).toHaveProperty("take");
    }
  });

  it("get /tasks 支持分页参数", async () => {
    const response = await client.tasks.$get({
      query: {
        skip: 0,
        take: 5,
      },
    });
    expect(response.status).toBe(200);
    if (response.status === 200) {
      const json = await response.json() as PaginatedResult<unknown>;
      expect(json.meta.skip).toBe(0);
      expect(json.meta.take).toBe(5);
    }
  });

  it("get /tasks 支持排序参数", async () => {
    const response = await client.tasks.$get({
      query: {
        orderBy: JSON.stringify({
          id: "desc",
        }),
      },
    });

    expect(response.status).toBe(200);
  });

  it("get /tasks 支持过滤条件", async () => {
    const response = await client.tasks.$get({
      query: {
        where: JSON.stringify({
          name: {
            contains: "任务",
          },
        }),
      },
    });
    expect(response.status).toBe(200);
  });

  it("get /tasks 参数验证 - 无效的skip参数", async () => {
    const response = await client.tasks.$get({
      query: {
        // @ts-expect-error 测试类型错误
        skip: "invalid",
      },
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json() as { error: { issues: Array<{ path: string[] }> } };
      expect(json.error.issues[0].path[0]).toBe("skip");
    }
  });

  it("get /tasks 参数验证 - 无效的take参数", async () => {
    const response = await client.tasks.$get({
      query: {
        // @ts-expect-error 测试类型错误
        take: "invalid",
      },
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json() as { error: { issues: Array<{ path: string[] }> } };
      expect(json.error.issues[0].path[0]).toBe("take");
    }
  });

  it("get /tasks 参数验证 - 无效的JSON格式", async () => {
    const response = await client.tasks.$get({
      query: {
        where: "{invalid json}",
      },
    });
    expect(response.status).toBe(422);
    if (response.status === 422) {
      const json = await response.json() as { error: { issues: Array<{ path: string[] }> } };
      expect(json.error.issues[0].path[0]).toBe("where");
    }
  });
});
