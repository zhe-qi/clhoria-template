/**
 * BullMQ 任务类型定义
 */

export interface EmailJobData {
  to: string;
  subject: string;
  content: string;
  template?: string;
  variables?: Record<string, unknown>;
}

export interface FileJobData {
  filePath: string;
  operation: "compress" | "convert" | "upload" | "delete";
  options?: Record<string, unknown>;
}

export interface UserJobData {
  userId: string;
  action: "welcome" | "notification" | "cleanup" | "export";
  data?: Record<string, unknown>;
}

export interface SystemJobData {
  task: "backup" | "cleanup" | "report" | "maintenance";
  params?: Record<string, unknown>;
}

// 任务状态类型
export type JobStatus = "waiting" | "active" | "completed" | "failed" | "delayed" | "paused";

// 队列统计信息
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  total: number;
}

// API 响应类型
export interface QueueInfo {
  name: string;
  isPaused: boolean;
  stats: QueueStats;
}

export interface JobInfo {
  id: string;
  name: string;
  data: Record<string, unknown>;
  status: JobStatus;
  progress: number;
  attempts: number;
  failedReason?: string;
  processedOn?: number;
  finishedOn?: number;
  timestamp: number;
}

// 队列名称常量
export const QUEUE_NAMES = {
  EMAIL: "email",
  FILE: "file",
  USER: "user",
  SYSTEM: "system",
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
