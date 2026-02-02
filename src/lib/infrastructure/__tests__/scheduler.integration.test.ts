/**
 * Scheduler 定时任务调度器集成测试
 *
 * Mock pg-boss 队列操作，测试调度器的核心功能
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock pg-boss
const mockBoss = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
  deleteQueue: vi.fn().mockResolvedValue(undefined),
  work: vi.fn().mockResolvedValue(undefined),
  offWork: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
  unschedule: vi.fn().mockResolvedValue(undefined),
  send: vi.fn().mockResolvedValue("mock-job-id"),
  getSchedules: vi.fn().mockResolvedValue([
    { name: "schedule_test-job", cron: "0 3 * * *", timezone: "Asia/Shanghai" },
    { name: "schedule_another-job", cron: "0 0 * * *", timezone: "UTC" },
    { name: "other-queue", cron: "* * * * *", timezone: "UTC" },
  ]),
};

vi.mock("@/lib/infrastructure/pg-boss-adapter", () => ({
  default: Promise.resolve(mockBoss),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock singleton - 让每次测试都创建新实例
vi.mock("@/lib/internal/singleton", () => ({
  createSingleton: <T>(_name: string, factory: () => T, _options?: { destroy?: (instance: T) => void }) => {
    return factory();
  },
}));

// 在 mock 之后动态导入
const { default: scheduler } = await import("../scheduler");

describe("Scheduler 定时任务调度器", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await scheduler.stop();
  });

  describe("start - 启动调度器", () => {
    it("应获取 pg-boss 实例", async () => {
      await scheduler.start();

      // scheduler 不再调用 boss.start()，因为 bootstrap 已经启动了 pg-boss
      // 这里只验证 start 方法可以正常执行
      expect(scheduler.getScheduleNames()).toEqual([]);
    });

    it("重复调用 start 应跳过", async () => {
      await scheduler.start();
      await scheduler.start();

      // 验证可以安全地多次调用
      expect(scheduler.getScheduleNames()).toEqual([]);
    });
  });

  describe("register - 注册定时任务", () => {
    it("应正确注册定时任务", async () => {
      await scheduler.start();

      const handler = vi.fn();
      await scheduler.register({
        name: "test-job",
        pattern: "0 3 * * *",
        timezone: "Asia/Shanghai",
      }, handler);

      // 验证 createQueue 被调用（pg-boss 12.x 必须先创建队列）
      expect(mockBoss.createQueue).toHaveBeenCalledWith("schedule_test-job");

      // 验证 work 被调用
      expect(mockBoss.work).toHaveBeenCalledWith(
        "schedule_test-job",
        { batchSize: 1 },
        expect.any(Function),
      );

      // 验证 schedule 被调用
      expect(mockBoss.schedule).toHaveBeenCalledWith(
        "schedule_test-job",
        "0 3 * * *",
        {},
        expect.objectContaining({ tz: "Asia/Shanghai" }),
      );
    });

    it("应使用默认时区 Asia/Shanghai", async () => {
      await scheduler.start();

      await scheduler.register({
        name: "default-tz-job",
        pattern: "0 0 * * *",
      }, vi.fn());

      expect(mockBoss.schedule).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ tz: "Asia/Shanghai" }),
      );
    });

    it("应支持自定义数据", async () => {
      await scheduler.start();

      await scheduler.register({
        name: "data-job",
        pattern: "0 0 * * *",
        data: { key: "value" },
      }, vi.fn());

      expect(mockBoss.schedule).toHaveBeenCalledWith(
        "schedule_data-job",
        "0 0 * * *",
        { key: "value" },
        expect.any(Object),
      );
    });

    it("未启动时注册应抛出错误", async () => {
      // 确保调度器已停止（未启动状态）
      await scheduler.stop();

      await expect(
        scheduler.register({ name: "fail-job", pattern: "* * * * *" }, vi.fn()),
      ).rejects.toThrow("调度器未启动");
    });

    it("重复注册同名任务应跳过", async () => {
      await scheduler.start();

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      await scheduler.register({ name: "dup-job", pattern: "* * * * *" }, handler1);
      await scheduler.register({ name: "dup-job", pattern: "0 0 * * *" }, handler2);

      // work 和 schedule 只应调用一次
      expect(mockBoss.work).toHaveBeenCalledTimes(1);
      expect(mockBoss.schedule).toHaveBeenCalledTimes(1);
    });
  });

  describe("unregister - 取消注册", () => {
    it("应正确取消注册定时任务", async () => {
      await scheduler.start();
      await scheduler.register({ name: "to-remove", pattern: "* * * * *" }, vi.fn());

      await scheduler.unregister("to-remove");

      expect(mockBoss.unschedule).toHaveBeenCalledWith("schedule_to-remove");
      expect(mockBoss.offWork).toHaveBeenCalledWith("schedule_to-remove");
      expect(mockBoss.deleteQueue).toHaveBeenCalledWith("schedule_to-remove");
    });

    it("取消注册后任务应从列表中移除", async () => {
      await scheduler.start();
      await scheduler.register({ name: "remove-test", pattern: "* * * * *" }, vi.fn());

      expect(scheduler.getScheduleNames()).toContain("remove-test");

      await scheduler.unregister("remove-test");

      expect(scheduler.getScheduleNames()).not.toContain("remove-test");
    });
  });

  describe("trigger - 手动触发", () => {
    it("应发送任务到队列", async () => {
      await scheduler.start();
      await scheduler.register({ name: "trigger-test", pattern: "0 0 * * *" }, vi.fn());

      const jobId = await scheduler.trigger("trigger-test");

      expect(jobId).toBe("mock-job-id");
      expect(mockBoss.send).toHaveBeenCalledWith("schedule_trigger-test", {});
    });

    it("应支持自定义数据", async () => {
      await scheduler.start();
      await scheduler.register({ name: "trigger-data", pattern: "0 0 * * *" }, vi.fn());

      await scheduler.trigger("trigger-data", { custom: "data" });

      expect(mockBoss.send).toHaveBeenCalledWith("schedule_trigger-data", { custom: "data" });
    });

    it("未注册的任务应返回 null", async () => {
      await scheduler.start();

      const jobId = await scheduler.trigger("non-existent");

      expect(jobId).toBeNull();
      expect(mockBoss.send).not.toHaveBeenCalled();
    });

    it("未启动时触发应返回 null", async () => {
      // 确保调度器已停止（未启动状态）
      await scheduler.stop();

      const jobId = await scheduler.trigger("any-job");

      expect(jobId).toBeNull();
    });
  });

  describe("getScheduleNames - 获取任务名称", () => {
    it("应返回所有已注册的任务名称", async () => {
      await scheduler.start();
      await scheduler.register({ name: "job-1", pattern: "* * * * *" }, vi.fn());
      await scheduler.register({ name: "job-2", pattern: "0 0 * * *" }, vi.fn());

      const names = scheduler.getScheduleNames();

      expect(names).toContain("job-1");
      expect(names).toContain("job-2");
      expect(names).toHaveLength(2);
    });
  });

  describe("getSchedules - 获取调度信息", () => {
    it("应只返回 scheduler 管理的调度", async () => {
      await scheduler.start();

      const schedules = await scheduler.getSchedules();

      // 应过滤掉 other-queue
      expect(schedules).toHaveLength(2);
      expect(schedules.every(s => s.name.startsWith("schedule_"))).toBe(true);
    });

    it("pg-boss 返回空时应返回空数组", async () => {
      await scheduler.start();
      mockBoss.getSchedules.mockResolvedValueOnce([]);

      const schedules = await scheduler.getSchedules();

      expect(schedules).toEqual([]);
    });
  });

  describe("stop - 停止调度器", () => {
    it("应停止所有 worker", async () => {
      await scheduler.start();
      await scheduler.register({ name: "stop-test-1", pattern: "* * * * *" }, vi.fn());
      await scheduler.register({ name: "stop-test-2", pattern: "0 0 * * *" }, vi.fn());

      await scheduler.stop();

      expect(mockBoss.offWork).toHaveBeenCalledWith("schedule_stop-test-1");
      expect(mockBoss.offWork).toHaveBeenCalledWith("schedule_stop-test-2");
    });

    it("停止后任务列表应清空", async () => {
      await scheduler.start();
      await scheduler.register({ name: "clear-test", pattern: "* * * * *" }, vi.fn());

      await scheduler.stop();

      expect(scheduler.getScheduleNames()).toHaveLength(0);
    });

    it("未启动时停止应安全处理", async () => {
      // 确保调度器已停止
      await scheduler.stop();

      // 再次停止不应抛出错误
      await expect(scheduler.stop()).resolves.toBeUndefined();
    });
  });

  describe("worker 执行", () => {
    it("worker 应正确调用 handler", async () => {
      await scheduler.start();

      const handler = vi.fn().mockResolvedValue(undefined);
      await scheduler.register({ name: "worker-test", pattern: "* * * * *" }, handler);

      // 获取注册的 worker 回调
      const workCall = mockBoss.work.mock.calls[0];
      const workerCallback = workCall[2];

      // 模拟 pg-boss 调用 worker
      const mockJobs = [{ id: "job-123", data: { testKey: "testValue" } }];
      await workerCallback(mockJobs);

      expect(handler).toHaveBeenCalledWith({ testKey: "testValue" });
    });

    it("worker 执行失败应抛出错误", async () => {
      await scheduler.start();

      const error = new Error("Handler failed");
      const handler = vi.fn().mockRejectedValue(error);
      await scheduler.register({ name: "error-test", pattern: "* * * * *" }, handler);

      const workCall = mockBoss.work.mock.calls[0];
      const workerCallback = workCall[2];

      const mockJobs = [{ id: "job-456", data: {} }];

      await expect(workerCallback(mockJobs)).rejects.toThrow("Handler failed");
    });
  });
});
