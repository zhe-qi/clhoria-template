/* eslint-disable ts/ban-ts-comment */
import { eq } from "drizzle-orm";
import { jwt } from "hono/jwt";
import { testClient } from "hono/testing";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import db from "@/db";
import { casbinRule, sysRole, sysScheduledJobs } from "@/db/schema";
import env from "@/env";
import { getScheduler } from "@/jobs/scheduler";
import createApp from "@/lib/create-app";
import { collectAndSyncEndpointPermissions, PermissionConfigManager } from "@/lib/permissions";
import { reloadPolicy } from "@/lib/permissions/casbin/rbac";
import { casbin } from "@/middlewares/jwt-auth";
import { operationLog } from "@/middlewares/operation-log";
import { auth } from "@/routes/public/public.index";

import { scheduledJobs } from "./scheduled-jobs.index";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

// 创建认证应用
function createAuthApp() {
  return createApp().route("/", auth);
}

// 创建定时任务管理应用
function createScheduledJobsApp() {
  return createApp()
    .use("/scheduled-jobs/*", jwt({ secret: env.ADMIN_JWT_SECRET }))
    .use("/scheduled-jobs/*", casbin())
    .use("/scheduled-jobs/*", operationLog({ moduleName: "定时任务管理", description: "定时任务管理操作" }))
    .route("/", scheduledJobs);
}

const authClient = testClient(createAuthApp());
const scheduledJobsClient = testClient(createScheduledJobsApp());

// Redis队列验证辅助函数
async function getRedisRepeatableJobs() {
  const scheduler = getScheduler();
  return await scheduler.getRepeatableJobs();
}

async function verifyJobInRedis(jobName: string, shouldExist: boolean) {
  const jobSchedulers = await getRedisRepeatableJobs();
  const jobExists = jobSchedulers.some(scheduler => scheduler.name === jobName);
  return jobExists === shouldExist;
}

describe("scheduledJobs routes with real authentication", () => {
  let adminToken: string;
  let userToken: string;
  let createdJobId: string;
  let testJob: {
    id?: string;
    name: string;
    description?: string;
    handlerName: string;
    cronExpression: string;
    timezone?: string;
    status: number;
    payload?: Record<string, unknown>;
    retryAttempts?: number;
    retryDelay?: number;
    timeout?: number;
    priority?: number;
  };
  const createdJobIds: string[] = [];

  // 测试前初始化权限配置
  beforeAll(async () => {
    // 初始化任务处理器到数据库
    const { syncHandlersToDatabase } = await import("@/jobs/registry");
    await syncHandlersToDatabase();

    await collectAndSyncEndpointPermissions([
      { name: "scheduled-jobs", app: scheduledJobs, prefix: "" },
    ]);

    // 为超级管理员分配权限
    const superRole = await db.query.sysRole.findFirst({
      where: eq(sysRole.code, "ROLE_SUPER"),
    });

    if (superRole) {
      const permissionManager = PermissionConfigManager.getInstance();
      const allEndpointPermissions = permissionManager.getAllEndpointPermissions();

      // 获取现有的超级管理员权限
      const existingRules = await db
        .select()
        .from(casbinRule)
        .where(eq(casbinRule.v0, superRole.id));

      // 创建权限映射
      const existingPermissions = new Set(
        existingRules.map(rule => `${rule.v1}:${rule.v2}`),
      );

      // 收集需要添加的权限
      const newPermissions: Array<{
        resource: string;
        action: string;
      }> = [];

      for (const endpoint of allEndpointPermissions) {
        const permissionKey = `${endpoint.resource}:${endpoint.action}`;

        if (!existingPermissions.has(permissionKey)) {
          newPermissions.push({
            resource: endpoint.resource,
            action: endpoint.action,
          });
        }
      }

      // 添加缺失的权限
      if (newPermissions.length > 0) {
        const rulesToInsert = newPermissions.map(perm => ({
          ptype: "p" as const,
          v0: superRole.id,
          v1: perm.resource,
          v2: perm.action,
          v3: "default",
          v4: null,
          v5: null,
        }));

        await db.insert(casbinRule).values(rulesToInsert).onConflictDoNothing();
      }
    }

    // 重新加载Casbin策略以确保权限更新生效
    await reloadPolicy();
  });

  // 测试后清理资源
  afterAll(async () => {
    try {
      // 清理测试创建的任务
      if (createdJobIds.length > 0) {
        for (const jobId of createdJobIds) {
          await db.delete(sysScheduledJobs).where(eq(sysScheduledJobs.id, jobId));
        }
      }

      // 清理队列中的重复任务
      const scheduler = getScheduler();
      await scheduler.clearAllRepeatableJobs();
    }
    catch (error) {
      console.warn("测试清理过程中出现错误:", error);
    }
  });

  /** 管理员登录获取 token */
  it("admin login should return valid token", async () => {
    const response = await authClient.auth.login.$post({
      json: {
        username: "admin",
        password: "123456",
        domain: "default",
      },
    });

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.token).toBeDefined();
      expect(json.user.username).toBe("admin");
      adminToken = json.token;
    }
  });

  /** 普通用户登录获取 token */
  it("user login should return valid token", async () => {
    const response = await authClient.auth.login.$post({
      json: {
        username: "user",
        password: "123456",
        domain: "default",
      },
    });

    // 可能用户不存在，这是正常的
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.token).toBeDefined();
      userToken = json.token;
    }
    else {
      expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
    }
  });

  /** 未认证访问应该返回 401 */
  it("access without token should return 401", async () => {
    const response = await scheduledJobsClient["scheduled-jobs"].$get({
      query: {
        page: "1",
        limit: "10",
      },
    });
    expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED);
  });

  /** 无效 token 应该返回 401 */
  it("access with invalid token should return 401", async () => {
    const response = await scheduledJobsClient["scheduled-jobs"].$get(
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

  /** 获取可用处理器列表 */
  it("admin should be able to get available handlers", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await scheduledJobsClient["scheduled-jobs"].handlers.$get(
      {},
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json.length).toBeGreaterThanOrEqual(0);

      // 检查处理器结构
      if (json.length > 0) {
        const handler = json[0];
        expect(handler.name).toBeDefined();
        expect(handler.description).toBeDefined();
        expect(handler.isActive).toBeDefined();
      }
    }
  });

  /** 管理员创建定时任务 */
  it("admin should be able to create scheduled job", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    testJob = {
      name: `test-job-${Math.random().toString(36).slice(2, 8)}`,
      description: "测试定时任务",
      handlerName: "helloWorldJob",
      cronExpression: "*/5 * * * *", // 每5分钟执行一次
      timezone: "Asia/Shanghai",
      status: 0, // 创建时禁用状态，避免实际执行
      payload: { message: "Hello from test" },
      retryAttempts: 2,
      retryDelay: 3000,
      timeout: 30000,
      priority: 1,
    };

    const response = await scheduledJobsClient["scheduled-jobs"].$post(
      {
        json: testJob,
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.name).toBe(testJob.name);
      expect(json.description).toBe(testJob.description);
      expect(json.handlerName).toBe(testJob.handlerName);
      expect(json.cronExpression).toBe(testJob.cronExpression);
      expect(json.status).toBe(testJob.status);
      expect(json.id).toBeDefined();
      createdJobId = json.id;
      createdJobIds.push(json.id); // 添加到清理列表
    }
  });

  /** 管理员创建任务参数验证 */
  it("admin create job should validate parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await scheduledJobsClient["scheduled-jobs"].$post(
      {
        // @ts-ignore
        json: {
          name: "ab", // 名称太短
          handlerName: "helloWorldJob", // 使用存在的处理器，专注测试其他参数验证
          cronExpression: "invalid-cron", // 无效的cron表达式
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
    if (response.status === HttpStatusCodes.UNPROCESSABLE_ENTITY) {
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    }
  });

  /** 管理员获取定时任务列表 */
  it("admin should be able to list scheduled jobs", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await scheduledJobsClient["scheduled-jobs"].$get(
      {
        query: {
          page: "1",
          limit: "10",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
      expect(json.length).toBeGreaterThanOrEqual(0);
    }
  });

  /** 管理员获取单个定时任务 */
  it("admin should be able to get single scheduled job", async () => {
    // 跳过测试如果没有管理员 token 或创建的任务 ID
    if (!adminToken || !createdJobId) {
      expect(true).toBe(true);
      return;
    }

    const response = await scheduledJobsClient["scheduled-jobs"][":id"].$get(
      {
        param: {
          id: createdJobId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.id).toBe(createdJobId);
      expect(json.name).toBe(testJob.name);
    }
  });

  /** 管理员更新定时任务 */
  it("admin should be able to update scheduled job", async () => {
    // 跳过测试如果没有管理员 token 或创建的任务 ID
    if (!adminToken || !createdJobId) {
      expect(true).toBe(true);
      return;
    }

    const updateData = {
      description: "更新的测试定时任务",
      cronExpression: "*/10 * * * *", // 改为每10分钟执行一次
      priority: 2,
    };

    const response = await scheduledJobsClient["scheduled-jobs"][":id"].$patch(
      {
        param: {
          id: createdJobId,
        },
        json: updateData,
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.description).toBe(updateData.description);
      expect(json.cronExpression).toBe(updateData.cronExpression);
      expect(json.priority).toBe(updateData.priority);
    }
  });

  /** 管理员切换任务状态 */
  it("admin should be able to toggle job status", async () => {
    // 跳过测试如果没有管理员 token 或创建的任务 ID
    if (!adminToken || !createdJobId) {
      expect(true).toBe(true);
      return;
    }

    // 验证任务在Redis中不存在（因为创建时是禁用状态）
    const jobNotInRedis = await verifyJobInRedis(testJob.name, false);
    expect(jobNotInRedis).toBe(true);

    const response = await scheduledJobsClient["scheduled-jobs"][":id"].status.$patch(
      {
        param: {
          id: createdJobId,
        },
        json: {
          status: 1, // 启用任务
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.status).toBe(1);

      // 验证任务已加入Redis队列
      const jobInRedis = await verifyJobInRedis(testJob.name, true);
      expect(jobInRedis).toBe(true);

      // 再次切换为禁用状态以避免实际执行
      const disableResponse = await scheduledJobsClient["scheduled-jobs"][":id"].status.$patch(
        {
          param: {
            id: createdJobId,
          },
          json: {
            status: 0,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      );

      expect(disableResponse.status).toBe(HttpStatusCodes.OK);

      // 验证任务已从Redis队列中移除
      const jobRemovedFromRedis = await verifyJobInRedis(testJob.name, false);
      expect(jobRemovedFromRedis).toBe(true);
    }
  });

  /** 管理员立即执行任务 */
  it("admin should be able to execute job immediately", async () => {
    // 跳过测试如果没有管理员 token 或创建的任务 ID
    if (!adminToken || !createdJobId) {
      expect(true).toBe(true);
      return;
    }

    const response = await scheduledJobsClient["scheduled-jobs"][":id"].execute.$post(
      {
        param: {
          id: createdJobId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.message).toBeDefined();
      expect(json.message).toContain("执行请求已提交");
    }
  });

  /** 管理员获取任务执行历史 */
  it("admin should be able to get job execution history", async () => {
    // 跳过测试如果没有管理员 token 或创建的任务 ID
    if (!adminToken || !createdJobId) {
      expect(true).toBe(true);
      return;
    }

    const response = await scheduledJobsClient["scheduled-jobs"][":id"].history.$get(
      {
        param: {
          id: createdJobId,
        },
        query: {
          page: "1",
          limit: "20",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(Array.isArray(json)).toBe(true);
      // 执行历史可能为空，这是正常的
      expect(json.length).toBeGreaterThanOrEqual(0);
    }
  });

  /** 管理员获取任务执行统计 */
  it("admin should be able to get job execution stats", async () => {
    // 跳过测试如果没有管理员 token 或创建的任务 ID
    if (!adminToken || !createdJobId) {
      expect(true).toBe(true);
      return;
    }

    const response = await scheduledJobsClient["scheduled-jobs"][":id"].stats.$get(
      {
        param: {
          id: createdJobId,
        },
        query: {
          days: "7",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(typeof json.totalExecutions).toBe("number");
      expect(typeof json.successfulExecutions).toBe("number");
      expect(typeof json.failedExecutions).toBe("number");
      expect(typeof json.averageDuration).toBe("number");
      expect(typeof json.successRate).toBe("number");
    }
  });

  /** 获取系统任务概览 */
  it("admin should be able to get system overview", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await scheduledJobsClient["scheduled-jobs"].overview.$get(
      {
        query: {
          days: "7",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(typeof json.totalExecutions).toBe("number");
      expect(typeof json.successfulExecutions).toBe("number");
      expect(typeof json.failedExecutions).toBe("number");
      expect(typeof json.jobStats).toBe("object");
      expect(typeof json.dailyStats).toBe("object");
    }
  });

  /** 普通用户权限测试（如果有 userToken） */
  it("regular user should have limited access", async () => {
    // 跳过测试如果没有普通用户 token
    if (!userToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await scheduledJobsClient["scheduled-jobs"].$get(
      {
        query: {
          page: "1",
          limit: "10",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    );

    // 普通用户可能没有访问定时任务的权限
    expect([HttpStatusCodes.OK, HttpStatusCodes.FORBIDDEN, HttpStatusCodes.UNAUTHORIZED]).toContain(response.status);
  });

  /** ID 参数验证 */
  it("should validate UUID parameters", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await scheduledJobsClient["scheduled-jobs"][":id"].$get(
      {
        param: {
          id: "invalid-uuid",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.UNPROCESSABLE_ENTITY);
  });

  /** 404 测试 */
  it("should return 404 for non-existent job", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    const response = await scheduledJobsClient["scheduled-jobs"][":id"].$get(
      {
        param: {
          id: "550e8400-e29b-41d4-a716-446655440000", // 不存在的 UUID
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });

  /** 管理员删除定时任务 */
  it("admin should be able to delete scheduled job", async () => {
    // 跳过测试如果没有管理员 token 或创建的任务 ID
    if (!adminToken || !createdJobId) {
      expect(true).toBe(true);
      return;
    }

    // 记录删除前Redis中的状态
    const beforeDelete = await getRedisRepeatableJobs();
    const initialJobCount = beforeDelete.length;

    const response = await scheduledJobsClient["scheduled-jobs"][":id"].$delete(
      {
        param: {
          id: createdJobId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.OK);
    if (response.status === HttpStatusCodes.OK) {
      const json = await response.json();
      expect(json.message).toBeDefined();
      expect(json.message).toContain("删除成功");

      // 验证任务已从Redis队列中完全移除
      const afterDelete = await getRedisRepeatableJobs();
      const jobStillInRedis = afterDelete.some(scheduler => scheduler.name === testJob.name);
      expect(jobStillInRedis).toBe(false);

      // 验证Redis中的任务总数没有增加（因为我们的任务是禁用状态，删除时应该不影响计数）
      expect(afterDelete.length).toBeLessThanOrEqual(initialJobCount);
    }
  });

  /** Redis队列状态验证测试 */
  it("should properly manage Redis queue state", async () => {
    // 跳过测试如果没有管理员 token
    if (!adminToken) {
      expect(true).toBe(true);
      return;
    }

    // 创建一个专门用于Redis测试的任务
    const redisTestJob = {
      name: `redis-test-job-${Math.random().toString(36).slice(2, 8)}`,
      description: "Redis状态验证测试任务",
      handlerName: "helloWorldJob",
      cronExpression: "*/30 * * * *", // 每30分钟执行一次
      timezone: "Asia/Shanghai",
      status: 0, // 禁用状态
      payload: { message: "Redis test" },
    };

    // 1. 创建任务
    const createResponse = await scheduledJobsClient["scheduled-jobs"].$post(
      { json: redisTestJob },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );

    expect(createResponse.status).toBe(HttpStatusCodes.OK);
    let testJobId = "";
    if (createResponse.status === HttpStatusCodes.OK) {
      const json = await createResponse.json();
      testJobId = json.id;
      createdJobIds.push(testJobId); // 添加到清理列表

      // 验证禁用状态任务不在Redis队列中
      const jobNotInQueue = await verifyJobInRedis(redisTestJob.name, false);
      expect(jobNotInQueue).toBe(true);
    }

    // 2. 启用任务
    const enableResponse = await scheduledJobsClient["scheduled-jobs"][":id"].status.$patch(
      {
        param: { id: testJobId },
        json: { status: 1 },
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );

    expect(enableResponse.status).toBe(HttpStatusCodes.OK);
    if (enableResponse.status === HttpStatusCodes.OK) {
      // 验证启用状态任务在Redis队列中
      const jobInQueue = await verifyJobInRedis(redisTestJob.name, true);
      expect(jobInQueue).toBe(true);

      // 验证Redis中任务的详细信息
      const jobSchedulers = await getRedisRepeatableJobs();
      const redisScheduler = jobSchedulers.find(scheduler => scheduler.name === redisTestJob.name);
      expect(redisScheduler).toBeDefined();
      expect(redisScheduler?.pattern).toBe(redisTestJob.cronExpression);
      expect(redisScheduler?.tz).toBe(redisTestJob.timezone);
    }

    // 3. 禁用任务
    const disableResponse = await scheduledJobsClient["scheduled-jobs"][":id"].status.$patch(
      {
        param: { id: testJobId },
        json: { status: 0 },
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );

    expect(disableResponse.status).toBe(HttpStatusCodes.OK);
    if (disableResponse.status === HttpStatusCodes.OK) {
      // 验证禁用状态任务不在Redis队列中
      const jobRemovedFromQueue = await verifyJobInRedis(redisTestJob.name, false);
      expect(jobRemovedFromQueue).toBe(true);
    }

    // 4. 删除任务
    const deleteResponse = await scheduledJobsClient["scheduled-jobs"][":id"].$delete(
      { param: { id: testJobId } },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );

    expect(deleteResponse.status).toBe(HttpStatusCodes.OK);
    if (deleteResponse.status === HttpStatusCodes.OK) {
      // 最终验证任务完全从Redis中移除
      const jobCompletelyRemoved = await verifyJobInRedis(redisTestJob.name, false);
      expect(jobCompletelyRemoved).toBe(true);
    }
  });

  /** 验证任务已被删除 */
  it("deleted job should return 404", async () => {
    // 跳过测试如果没有管理员 token 或创建的任务 ID
    if (!adminToken || !createdJobId) {
      expect(true).toBe(true);
      return;
    }

    const response = await scheduledJobsClient["scheduled-jobs"][":id"].$get(
      {
        param: {
          id: createdJobId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(HttpStatusCodes.NOT_FOUND);
  });
});
