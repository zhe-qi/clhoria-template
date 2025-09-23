import type { JobsOptions, Processor } from "bullmq";

/**
 * 任务处理器函数类型
 */
export type TaskProcessor<T = any, R = any> = Processor<T, R>;

/**
 * 任务数据基础接口
 */
export interface TaskData {
  [key: string]: any;
}

/**
 * 任务选项
 */
export interface TaskOptions extends JobsOptions {
  // 添加自定义选项
  idempotencyKey?: string; // 幂等性键
}

/**
 * Worker 配置
 */
export interface WorkerConfig {
  concurrency?: number; // 并发数，默认 1
  maxStalledCount?: number; // 最大停滞次数，默认 1
  stalledInterval?: number; // 停滞检查间隔（毫秒），默认 30000
}

/**
 * 定时任务配置
 */
export interface ScheduledTaskConfig {
  name: string; // 任务名称
  pattern: string; // Cron 表达式
  data?: TaskData; // 任务数据
  options?: TaskOptions; // 任务选项
  useLock?: boolean; // 是否使用分布式锁，默认 true
  lockTTL?: number; // 锁过期时间（秒），默认 60
}

/**
 * 任务处理器注册项
 */
export interface ProcessorRegistration {
  name: string; // 任务名称
  processor: TaskProcessor; // 处理器函数
  workerConfig?: WorkerConfig; // Worker 配置
}

/**
 * 任务系统配置
 */
export interface JobSystemConfig {
  queueName?: string; // 队列名称，默认 'default'
  defaultJobOptions?: TaskOptions; // 默认任务选项
  workerConfig?: WorkerConfig; // 默认 Worker 配置
}

/**
 * 分布式锁接口
 */
export interface DistributedLock {
  key: string;
  ttl: number;
  value: string;
}

/**
 * 幂等性记录
 */
export interface IdempotencyRecord {
  key: string;
  result?: any;
  createdAt: string;
  expiresAt?: string;
}
