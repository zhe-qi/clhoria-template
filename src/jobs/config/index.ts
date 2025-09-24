import type { TaskOptions, WorkerConfig } from "../types";

import {
  DEFAULT_BACKOFF_DELAY,
  DEFAULT_BACKOFF_TYPE,
  DEFAULT_JOB_ATTEMPTS,
  DEFAULT_MAX_STALLED_COUNT,
  DEFAULT_STALLED_INTERVAL,
  DEFAULT_WORKER_CONCURRENCY,
  jobSystemConfig,
} from "./job-system.config";

/**
 * 获取默认任务选项
 */
export function getDefaultJobOptions(): TaskOptions {
  return (
    jobSystemConfig.defaultJobOptions || {
      attempts: DEFAULT_JOB_ATTEMPTS,
      backoff: {
        type: DEFAULT_BACKOFF_TYPE,
        delay: DEFAULT_BACKOFF_DELAY,
      },
      removeOnComplete: {
        age: 3600, // 1小时
        count: 100, // 保留最近100个
      },
      removeOnFail: {
        age: 24 * 3600, // 24小时
        count: 500, // 保留最近500个失败任务
      },
    }
  );
}

/**
 * 获取默认 Worker 配置
 */
export function getDefaultWorkerConfig(): WorkerConfig {
  return (
    jobSystemConfig.workerConfig || {
      concurrency: DEFAULT_WORKER_CONCURRENCY,
      maxStalledCount: DEFAULT_MAX_STALLED_COUNT,
      stalledInterval: DEFAULT_STALLED_INTERVAL,
    }
  );
}

/**
 * 合并任务选项
 */
export function mergeJobOptions(
  custom?: TaskOptions,
  defaults: TaskOptions = getDefaultJobOptions(),
): TaskOptions {
  if (!custom)
    return defaults;

  // 处理 backoff 可能是 number | BackoffOptions | undefined 的情况
  let mergedBackoff = defaults.backoff;

  if (custom.backoff !== undefined) {
    if (typeof custom.backoff === "object" && typeof defaults.backoff === "object") {
      mergedBackoff = {
        ...defaults.backoff,
        ...custom.backoff,
      };
    }
    else {
      mergedBackoff = custom.backoff;
    }
  }

  return {
    ...defaults,
    ...custom,
    backoff: mergedBackoff,
  };
}

/**
 * 合并 Worker 配置
 */
export function mergeWorkerConfig(
  custom?: WorkerConfig,
  defaults: WorkerConfig = getDefaultWorkerConfig(),
): WorkerConfig {
  if (!custom)
    return defaults;

  return {
    ...defaults,
    ...custom,
  };
}

// 导出所有常量
export {
  DEFAULT_BACKOFF_DELAY,
  DEFAULT_BACKOFF_TYPE,
  DEFAULT_IDEMPOTENCY_TTL,
  DEFAULT_JOB_ATTEMPTS,
  DEFAULT_LOCK_TTL,
  DEFAULT_MAX_STALLED_COUNT,
  DEFAULT_QUEUE_NAME,
  DEFAULT_STALLED_INTERVAL,
  DEFAULT_WORKER_CONCURRENCY,
  LOCK_REFRESH_INTERVAL,
  REDIS_KEY_PREFIX,
} from "./job-system.config";
