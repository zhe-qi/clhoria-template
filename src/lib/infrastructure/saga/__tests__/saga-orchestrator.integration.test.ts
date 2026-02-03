import type { Mock } from "vitest";

/**
 * Saga 协调器集成测试
 *
 * 使用真实数据库，只 mock pg-boss 队列操作
 */
import type { SagaDefinition } from "../types";
import { eq, like } from "drizzle-orm";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import db from "@/db";
import { sagas, sagaSteps } from "@/db/schema";
import env from "@/env";
import { SagaStatus, SagaStepStatus } from "@/lib/enums";

import { destroySingleton } from "@/lib/internal/singleton";

if (env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV must be 'test'");
}

type MockBoss = {
  createQueue: Mock<() => Promise<void>>;
  work: Mock<() => Promise<void>>;
  send: Mock<() => Promise<string>>;
  stop: Mock<() => Promise<void>>;
};

// 使用 vi.hoisted 确保 mock 对象在 vi.mock 之前可用
const { mockBoss } = vi.hoisted(() => ({
  mockBoss: {
    createQueue: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    work: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    send: vi.fn<() => Promise<string>>().mockResolvedValue("mock-job-id"),
    stop: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  } as MockBoss,
}));

// Mock pg-boss - 只 mock 队列操作，不真正发送任务
vi.mock("@/lib/infrastructure/pg-boss-adapter", () => ({
  default: mockBoss,
}));

// Mock logger 避免测试输出过多日志
vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

/** 测试用 Saga 类型前缀 */
const TEST_SAGA_TYPE_PREFIX = "integration-test-";

/** 清理测试数据 */
async function cleanupTestData(): Promise<void> {
  // 删除测试创建的 Saga（按类型前缀匹配）
  await db.delete(sagas).where(like(sagas.type, `${TEST_SAGA_TYPE_PREFIX}%`));
}

/** 创建测试用 Saga 定义 */
function createTestSagaDefinition(type: string): SagaDefinition {
  return {
    type,
    timeoutSeconds: 300,
    maxRetries: 3,
    steps: [
      {
        name: "step-1",
        timeoutSeconds: 60,
        execute: async (_input, context) => {
          return { success: true, output: { step1Result: "done", sagaId: context.sagaId } };
        },
        compensate: async () => {
          return { success: true };
        },
      },
      {
        name: "step-2",
        timeoutSeconds: 60,
        execute: async (_input, _context) => {
          return { success: true, output: { step2Result: "done" } };
        },
        compensate: async () => {
          return { success: true };
        },
      },
    ],
    prepareOutput: context => ({
      finalResult: "completed",
      sagaId: context.sagaId,
    }),
  };
}

/** 获取 mock boss 实例 */
function getMockBoss(): MockBoss {
  return mockBoss;
}

describe("SagaOrchestrator 集成测试", () => {
  // 使用动态导入，确保在单例清理后重新获取模块
  let SagaOrchestrator: typeof import("../saga-orchestrator").SagaOrchestrator;
  let sagaRegistry: typeof import("../saga-registry").sagaRegistry;
  let orchestrator: InstanceType<typeof SagaOrchestrator>;

  beforeAll(async () => {
    // 销毁可能存在的真实单例，确保使用 mock
    await destroySingleton("saga-orchestrator");
    await destroySingleton("pg-boss");
    // 重置模块缓存，确保使用 mock
    vi.resetModules();
    // 动态导入，使用 mock 后的模块
    const orchestratorModule = await import("../saga-orchestrator");
    const registryModule = await import("../saga-registry");
    SagaOrchestrator = orchestratorModule.SagaOrchestrator;
    sagaRegistry = registryModule.sagaRegistry;
    // 清理可能残留的测试数据
    await cleanupTestData();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    sagaRegistry.clear();
    orchestrator = new SagaOrchestrator();
    await orchestrator.initialize();
  });

  afterEach(async () => {
    // 调用 mock boss 的 stop 方法，确保清理
    await getMockBoss().stop();
  });

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData();
    sagaRegistry.clear();
  });

  describe("start - 创建 Saga 实例", () => {
    it("应在数据库中创建 Saga 实例和步骤记录", async () => {
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}create-test`;
      sagaRegistry.register(createTestSagaDefinition(sagaType));

      const input = { orderId: "order-123", amount: 100 };
      const sagaId = await orchestrator.start(sagaType, input, {
        correlationId: "corr-123",
      });

      // 验证 Saga 实例
      const saga = await db.query.sagas.findFirst({
        where: eq(sagas.id, sagaId),
        with: { steps: true },
      });

      expect(saga).toBeDefined();
      expect(saga?.type).toBe(sagaType);
      expect(saga?.correlationId).toBe("corr-123");
      expect(saga?.status).toBe(SagaStatus.PENDING);
      expect(saga?.totalSteps).toBe(2);
      expect(saga?.currentStepIndex).toBe(0);
      expect(saga?.input).toEqual(input);
      expect(saga?.retryCount).toBe(0);
      expect(saga?.maxRetries).toBe(3);

      // 验证步骤记录
      expect(saga?.steps).toHaveLength(2);
      expect(saga?.steps[0].name).toBe("step-1");
      expect(saga?.steps[0].status).toBe(SagaStepStatus.PENDING);
      expect(saga?.steps[1].name).toBe("step-2");
      expect(saga?.steps[1].status).toBe(SagaStepStatus.PENDING);
    });

    it("应发送执行任务和超时任务到队列", async () => {
      const mockBoss = getMockBoss();
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}queue-test`;
      sagaRegistry.register(createTestSagaDefinition(sagaType));

      const sagaId = await orchestrator.start(sagaType, { test: true });

      // 验证 pg-boss.send 被调用
      expect(mockBoss.send).toHaveBeenCalledTimes(2);

      // 第一次调用：执行任务
      expect(mockBoss.send).toHaveBeenCalledWith(
        "saga-execute",
        { sagaId, stepIndex: 0 },
        expect.any(Object),
      );

      // 第二次调用：超时任务
      expect(mockBoss.send).toHaveBeenCalledWith(
        "saga-timeout",
        { sagaId },
        expect.objectContaining({ startAfter: expect.any(Date) }),
      );
    });

    it("未注册的 Saga 类型应抛出错误", async () => {
      await expect(
        orchestrator.start("non-existent-type", {}),
      ).rejects.toThrow("Saga 类型 \"non-existent-type\" 未注册");
    });

    it("支持延迟执行", async () => {
      const mockBoss = getMockBoss();
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}delay-test`;
      sagaRegistry.register(createTestSagaDefinition(sagaType));

      await orchestrator.start(sagaType, {}, { delaySeconds: 60 });

      // 验证执行任务带有 startAfter
      expect(mockBoss.send).toHaveBeenCalledWith(
        "saga-execute",
        expect.any(Object),
        expect.objectContaining({ startAfter: expect.any(Date) }),
      );
    });

    it("支持优先级设置", async () => {
      const mockBoss = getMockBoss();
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}priority-test`;
      sagaRegistry.register(createTestSagaDefinition(sagaType));

      await orchestrator.start(sagaType, {}, { priority: 10 });

      expect(mockBoss.send).toHaveBeenCalledWith(
        "saga-execute",
        expect.any(Object),
        expect.objectContaining({ priority: 10 }),
      );
    });
  });

  describe("get - 获取 Saga 状态", () => {
    it("应返回完整的 Saga 状态信息", async () => {
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}get-test`;
      sagaRegistry.register(createTestSagaDefinition(sagaType));

      const input = { testData: "value" };
      const sagaId = await orchestrator.start(sagaType, input, {
        correlationId: "get-test-corr",
      });

      const result = await orchestrator.get(sagaId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(sagaId);
      expect(result?.type).toBe(sagaType);
      expect(result?.correlationId).toBe("get-test-corr");
      expect(result?.status).toBe(SagaStatus.PENDING);
      expect(result?.input).toEqual(input);
      expect(result?.steps).toHaveLength(2);
      expect(result?.steps[0].name).toBe("step-1");
      expect(result?.steps[1].name).toBe("step-2");
    });

    it("不存在的 Saga 应返回 null", async () => {
      const result = await orchestrator.get(crypto.randomUUID());

      expect(result).toBeNull();
    });
  });

  describe("cancel - 取消 Saga", () => {
    it("运行中的 Saga 应能取消并触发补偿", async () => {
      const mockBoss = getMockBoss();
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}cancel-test`;
      sagaRegistry.register(createTestSagaDefinition(sagaType));

      const sagaId = await orchestrator.start(sagaType, {});

      // 模拟 Saga 已经在运行
      await db.update(sagas).set({
        status: SagaStatus.RUNNING,
        currentStepIndex: 1,
      }).where(eq(sagas.id, sagaId));

      vi.clearAllMocks();

      const result = await orchestrator.cancel(sagaId);

      expect(result).toBe(true);

      // 验证状态更新
      const saga = await db.query.sagas.findFirst({
        where: eq(sagas.id, sagaId),
      });

      expect(saga?.status).toBe(SagaStatus.COMPENSATING);
      expect(saga?.error).toBe("用户手动取消");

      // 验证发送了补偿任务
      expect(mockBoss.send).toHaveBeenCalledWith(
        "saga-compensate",
        expect.objectContaining({ sagaId }),
      );
    });

    it("已完成的 Saga 不能取消", async () => {
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}cancel-completed`;
      sagaRegistry.register(createTestSagaDefinition(sagaType));

      const sagaId = await orchestrator.start(sagaType, {});

      // 设置为已完成
      await db.update(sagas).set({
        status: SagaStatus.COMPLETED,
      }).where(eq(sagas.id, sagaId));

      const result = await orchestrator.cancel(sagaId);

      expect(result).toBe(false);
    });

    it("不存在的 Saga 返回 false", async () => {
      const result = await orchestrator.cancel(crypto.randomUUID());

      expect(result).toBe(false);
    });
  });

  describe("retry - 重试失败的 Saga", () => {
    it("失败的 Saga 应能重试", async () => {
      const mockBoss = getMockBoss();
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}retry-test`;
      sagaRegistry.register(createTestSagaDefinition(sagaType));

      const sagaId = await orchestrator.start(sagaType, {});

      // 模拟 Saga 失败
      await db.update(sagas).set({
        status: SagaStatus.FAILED,
        currentStepIndex: 1,
        retryCount: 1,
        error: "Step failed",
      }).where(eq(sagas.id, sagaId));

      // 设置第二个步骤为失败状态
      const steps = await db.query.sagaSteps.findMany({
        where: eq(sagaSteps.sagaId, sagaId),
      });
      const step2 = steps.find(s => s.stepIndex === 1);
      if (step2) {
        await db.update(sagaSteps).set({
          status: SagaStepStatus.FAILED,
          error: "Execution failed",
        }).where(eq(sagaSteps.id, step2.id));
      }

      vi.clearAllMocks();

      const result = await orchestrator.retry(sagaId);

      expect(result).toBe(true);

      // 验证状态重置
      const saga = await db.query.sagas.findFirst({
        where: eq(sagas.id, sagaId),
      });

      expect(saga?.status).toBe(SagaStatus.PENDING);
      expect(saga?.retryCount).toBe(2);
      expect(saga?.error).toBeNull();

      // 验证发送了执行任务
      expect(mockBoss.send).toHaveBeenCalledWith(
        "saga-execute",
        { sagaId, stepIndex: 1 },
      );
    });

    it("超过最大重试次数应返回 false", async () => {
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}retry-max`;
      sagaRegistry.register(createTestSagaDefinition(sagaType));

      const sagaId = await orchestrator.start(sagaType, {});

      // 设置为已达到最大重试次数
      await db.update(sagas).set({
        status: SagaStatus.FAILED,
        retryCount: 3,
        maxRetries: 3,
      }).where(eq(sagas.id, sagaId));

      const result = await orchestrator.retry(sagaId);

      expect(result).toBe(false);
    });

    it("非失败状态的 Saga 不能重试", async () => {
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}retry-running`;
      sagaRegistry.register(createTestSagaDefinition(sagaType));

      const sagaId = await orchestrator.start(sagaType, {});

      // 保持 PENDING 状态
      const result = await orchestrator.retry(sagaId);

      expect(result).toBe(false);
    });
  });

  describe("数据完整性验证", () => {
    it("Saga 和步骤的外键关系应正确", async () => {
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}fk-test`;
      sagaRegistry.register(createTestSagaDefinition(sagaType));

      const sagaId = await orchestrator.start(sagaType, {});

      // 验证所有步骤都关联到正确的 Saga
      const steps = await db.query.sagaSteps.findMany({
        where: eq(sagaSteps.sagaId, sagaId),
      });

      expect(steps).toHaveLength(2);

      steps.forEach((step) => {
        expect(step.sagaId).toBe(sagaId);
      });
    });

    it("删除 Saga 应级联删除步骤", async () => {
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}cascade-test`;
      sagaRegistry.register(createTestSagaDefinition(sagaType));

      const sagaId = await orchestrator.start(sagaType, {});

      // 验证步骤存在
      let steps = await db.query.sagaSteps.findMany({
        where: eq(sagaSteps.sagaId, sagaId),
      });

      expect(steps).toHaveLength(2);

      // 删除 Saga
      await db.delete(sagas).where(eq(sagas.id, sagaId));

      // 验证步骤也被删除
      steps = await db.query.sagaSteps.findMany({
        where: eq(sagaSteps.sagaId, sagaId),
      });

      expect(steps).toHaveLength(0);
    });
  });

  describe("prepareInput 和 prepareOutput", () => {
    it("应正确处理 prepareInput", async () => {
      const sagaType = `${TEST_SAGA_TYPE_PREFIX}prepare-input`;
      const definition: SagaDefinition<{ raw: string }> = {
        ...createTestSagaDefinition(sagaType),
        prepareInput: rawInput => ({
          processed: rawInput.raw.toUpperCase(),
        }),
      };
      sagaRegistry.register(definition);

      const sagaId = await orchestrator.start(sagaType, { raw: "test" });

      const saga = await db.query.sagas.findFirst({
        where: eq(sagas.id, sagaId),
      });

      expect(saga?.input).toEqual({ processed: "TEST" });
    });
  });
});
