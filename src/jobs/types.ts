import type { Job } from "bullmq";

/** 任务执行结果 */
export interface JobResult {
  /** 执行是否成功 */
  success: boolean;
  /** 结果消息 */
  message?: string;
  /** 执行时间戳 */
  executedAt?: string;
  /** 额外数据 */
  data?: any;
}

/** 任务处理器函数类型 */
export type JobHandler<T = any, R = any> = (job: Job<T>) => Promise<R>;

/** 任务处理器元数据 */
export interface JobHandlerMeta {
  /** 处理器名称 */
  name: string;
  /** 处理器描述 */
  description: string;
  /** 处理器函数 */
  handler: JobHandler;
  /** 文件路径 */
  filePath: string;
}

/** 定时任务配置 */
export interface ScheduledJobConfig {
  /** 任务ID */
  id: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description?: string;
  /** 处理器名称 */
  handlerName: string;
  /** Cron表达式 */
  cronExpression: string;
  /** 时区 */
  timezone?: string;
  /** 任务状态 */
  status: number;
  /** 任务参数 */
  payload: Record<string, unknown>;
  /** 重试次数 */
  retryAttempts: number;
  /** 重试延迟 */
  retryDelay: number;
  /** 超时时间 */
  timeout: number;
  /** 优先级 */
  priority: number;
  /** 所属域 */
  domain: string;
}

/** 任务执行状态枚举 */
export const JobExecutionStatus = {
  WAITING: "waiting",
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed",
  DELAYED: "delayed",
  PAUSED: "paused",
} as const;

export type JobExecutionStatusType = (typeof JobExecutionStatus)[keyof typeof JobExecutionStatus];

/** 任务执行日志 */
export interface JobExecutionLog {
  /** 日志ID */
  id: string;
  /** 任务ID */
  jobId: string;
  /** 执行ID */
  executionId: string;
  /** 执行状态 */
  status: JobExecutionStatusType;
  /** 开始时间 */
  startedAt?: Date;
  /** 结束时间 */
  finishedAt?: Date;
  /** 执行耗时 */
  durationMs?: number;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  errorMessage?: string;
  /** 重试次数 */
  retryCount: number;
}

/** 任务状态枚举 */
export const JobStatus = {
  ENABLED: 1,
  DISABLED: 0,
  PAUSED: 2,
} as const;

export type JobStatusType = (typeof JobStatus)[keyof typeof JobStatus];

/** 创建定时任务参数 */
export interface CreateScheduledJobParams {
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description?: string;
  /** 处理器名称 */
  handlerName: string;
  /** Cron表达式 */
  cronExpression: string;
  /** 时区 */
  timezone?: string;
  /** 任务参数 */
  payload?: Record<string, unknown>;
  /** 重试次数 */
  retryAttempts?: number;
  /** 重试延迟 */
  retryDelay?: number;
  /** 超时时间 */
  timeout?: number;
  /** 优先级 */
  priority?: number;
  /** 所属域 */
  domain: string;
}

/** 更新定时任务参数 */
export interface UpdateScheduledJobParams extends Partial<CreateScheduledJobParams> {
  /** 任务状态 */
  status?: JobStatusType;
}

/** 任务处理上下文 */
export interface JobContext {
  /** 任务配置 */
  config: ScheduledJobConfig;
  /** 日志记录函数 */
  log: (message: string, level?: "info" | "warn" | "error") => void;
  /** 更新进度 */
  updateProgress: (progress: number | object) => Promise<void>;
}

/** BullMQ队列选项 */
export interface QueueOptions {
  /** 队列名称 */
  name: string;
  /** Redis连接配置 */
  connection?: any;
  /** 默认任务选项 */
  defaultJobOptions?: {
    removeOnComplete?: number;
    removeOnFail?: number;
    attempts?: number;
    backoff?: {
      type: string;
      delay: number;
    };
  };
}

/** Worker选项 */
export interface WorkerOptions {
  /** 并发数 */
  concurrency?: number;
  /** 限制器配置 */
  limiter?: {
    max: number;
    duration: number;
  };
  /** 连接配置 */
  connection?: any;
}
