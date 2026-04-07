import type { Job, JobsOptions, Queue, QueueOptions, RepeatOptions, Worker, WorkerOptions } from "bullmq";
import type Redis from "ioredis";
import type { JobDefinitionRegistry, QueueJobsMapping } from "./bullmq/job-registry";
import type { JobNameType, QueueNameType } from "@/lib/enums/bullmq";
import { Queue as BullQueue, Worker as BullWorker } from "bullmq";

import { Effect } from "effect";
import RedisClient from "ioredis";
import { parseURL } from "ioredis/built/utils/index.js";
import env from "@/env";
import { createSingleton } from "@/lib/core/singleton";

import logger from "@/lib/services/logger";
import { JobSchemaRegistry } from "./bullmq/job-registry";

/**
 * 辅助函数：安全地添加任务到 BullMQ 队列
 * 解决 TypeScript ExtractNameType/ExtractDataType 类型推断问题
 */
function addToQueue<T>(queue: Queue<T>, jobName: string, data: T, opts?: JobsOptions) {
  // 类型断言：jobName 和 data 的类型在运行时是正确的
  return queue.add(
    jobName as Parameters<typeof queue.add>[0],
    data as Parameters<typeof queue.add>[1],
    opts,
  );
}

/**
 * 根据 job name 获取对应的 data 类型
 */
type JobDataByName<N extends JobNameType> = N extends keyof JobDefinitionRegistry
  ? JobDefinitionRegistry[N]
  : never;

class QueueManager {
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  private readonly connection: Redis;

  constructor(redis: Redis) {
    this.connection = redis;
  }

  /**
   * 获取或创建队列（原始方法，用于内部和 Bull Board）
   */
  getQueue<T extends ParamsType = ParamsType>(name: string, options?: Partial<QueueOptions>): Queue<T> {
    if (!this.queues.has(name)) {
      const queue = new BullQueue<T>(name, {
        connection: this.connection,
        ...options,
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name) as Queue<T>;
  }

  /**
   * 类型安全地添加任务到队列（Effect 封装 + Zod 验证）
   */
  addJob = <Q extends QueueNameType, N extends QueueJobsMapping[Q]>(
    queueName: Q,
    jobName: N,
    data: JobDataByName<N>,
    opts?: JobsOptions,
  ) =>
    Effect.tryPromise({
      try: async () => {
        // Runtime validation with Zod
        const schema = JobSchemaRegistry[jobName];
        const validatedData = schema.parse(data);

        const queue = new BullQueue<JobDataByName<N>>(queueName, {
          connection: this.connection,
        });
        if (!this.queues.has(queueName)) {
          this.queues.set(queueName, queue);
        }

        return addToQueue(queue, jobName as string, validatedData as JobDataByName<N>, opts);
      },
      catch: (error) => {
        logger.error({ queueName, jobName, error }, "[BullMQ]: 添加任务失败");
        return new Error(`Failed to add job: ${error}`);
      },
    });

  /**
   * 类型安全地注册 Worker（Effect 封装 + Zod 验证）
   */
  registerWorker = <Q extends QueueNameType, R = void>(
    queueName: Q,
    processor: (job: Job<JobDataByName<QueueJobsMapping[Q]>>) => Promise<R>,
    options?: Partial<WorkerOptions>,
  ) =>
    Effect.sync(() => {
      if (this.workers.has(queueName)) return this.workers.get(queueName);

      const worker = new BullWorker<JobDataByName<QueueJobsMapping[Q]>>(
        queueName,
        async (job) => {
          // Runtime validation before processing
          const schema = JobSchemaRegistry[job.name as JobNameType];
          if (schema) job.data = schema.parse(job.data) as JobDataByName<QueueJobsMapping[Q]>;
          return processor(job);
        },
        {
          connection: this.connection,
          ...options,
        },
      );

      worker.on("error", (error) => {
        logger.error({ queueName, error }, "[BullMQ]: Worker 错误");
      });

      worker.on("failed", (job, error) => {
        logger.error({ queueName, jobId: job?.id, error }, "[BullMQ]: 任务失败");
      });

      this.workers.set(queueName, worker);

      return worker;
    });

  /**
   * 类型安全地调度定时任务（Effect 封装 + Zod 验证）
   * 使用 Job Schedulers API (v5.16.0+)
   */
  scheduleJob = <Q extends QueueNameType, N extends QueueJobsMapping[Q]>(
    queueName: Q,
    jobName: N,
    data: JobDataByName<N>,
    repeatOptions: RepeatOptions,
  ) =>
    Effect.tryPromise({
      try: async () => {
        // Runtime validation with Zod
        const schema = JobSchemaRegistry[jobName];
        const validatedData = schema.parse(data);

        const queue = new BullQueue<JobDataByName<N>>(queueName, {
          connection: this.connection,
        });

        if (!this.queues.has(queueName)) this.queues.set(queueName, queue);

        // 使用 Job Schedulers API (schedulerId = queueName:jobName)
        await (queue as any).upsertJobScheduler(`${queueName}:${jobName}`, repeatOptions, {
          name: jobName,
          data: validatedData,
        });
      },
      catch: (error) => {
        logger.error({ queueName, jobName, error }, "[BullMQ]: 调度定时任务失败");
        return new Error(`Failed to schedule job: ${error}`);
      },
    });

  /**
   * 移除定时任务（Effect 封装）
   * 使用 Job Schedulers API (v5.16.0+)
   */
  unscheduleJob = (queueName: string, jobName: string) =>
    Effect.tryPromise({
      try: () => {
        const queue = this.getQueue(queueName);
        return queue.removeJobScheduler(`${queueName}:${jobName}`);
      },
      catch: (error) => {
        logger.error({ queueName, jobName, schedulerId: `${queueName}:${jobName}`, error }, "[BullMQ]: 取消定时任务失败");
        return new Error(`Failed to unschedule job: ${error}`);
      },
    });

  /**
   * 获取所有定时任务（Effect 封装）
   * 使用 Job Schedulers API (v5.16.0+)
   */
  getScheduledJobs = (queueName: string) =>
    Effect.tryPromise({
      try: () => this.getQueue(queueName).getJobSchedulers(),
      catch: error => new Error(`Failed to get scheduled jobs: ${error}`),
    });

  /**
   * 优雅关闭（Effect 封装，带超时）
   */
  close = (timeoutMs: number = 10000) =>
    Effect.gen(this, function* () {
      const closeEffects: Effect.Effect<void, Error>[] = [];

      // 关闭所有 Workers
      for (const [name, worker] of this.workers.entries()) {
        closeEffects.push(Effect.tryPromise({
          try: () => worker.close(),
          catch: error => new Error(`Failed to close worker ${name}: ${error}`),
        }));
      }

      // 关闭所有队列
      for (const [name, queue] of this.queues.entries()) {
        closeEffects.push(Effect.tryPromise({
          try: () => queue.close(),
          catch: error => new Error(`Failed to close queue ${name}: ${error}`),
        }));
      }

      // 带超时的并行关闭
      yield* Effect.all(closeEffects, { concurrency: "unbounded" }).pipe(
        Effect.timeout(`${timeoutMs} millis`),
        Effect.catchAll(() => Effect.void),
      );

      this.workers.clear();
      this.queues.clear();

      // 关闭 Redis 连接（检查状态避免重复关闭）
      yield* Effect.tryPromise({
        try: async () => {
          if (!["close", "end"].includes(this.connection.status)) {
            await this.connection.quit();
          }
        },
        catch: (error) => {
          logger.debug({ error }, "[BullMQ]: Redis 连接关闭时的预期错误");
        },
      });
    });

  /**
   * 获取所有队列名称
   */
  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * 获取所有 Worker 名称
   */
  getWorkerNames(): string[] {
    return Array.from(this.workers.keys());
  }
}

/**
 * 创建 BullMQ 专用 Redis 连接
 * BullMQ Worker 需要 maxRetriesPerRequest: null 用于阻塞操作
 */
function createBullMQRedis() {
  const connectionOptions = parseURL(env.REDIS_URL);
  return new RedisClient({
    ...connectionOptions,
    maxRetriesPerRequest: null, // BullMQ 要求
  });
}

/**
 * QueueManager singleton
 * 自动在 shutdown 时销毁
 */
export const queueManager = createSingleton(
  "bullmq-queue-manager",
  () => {
    const redis = createBullMQRedis();
    return new QueueManager(redis);
  },
  {
    destroy: async (manager) => {
      // close() 方法会关闭所有队列、Worker 和 Redis 连接
      await Effect.runPromise(manager.close(10000));
    },
  },
);
