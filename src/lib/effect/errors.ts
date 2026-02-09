import { Data } from "effect";

/** 数据库操作错误 */
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly code?: string;
}> {}

/** 分布式锁获取失败 */
export class LockAcquisitionError extends Data.TaggedError("LockAcquisitionError")<{
  readonly key: string;
  readonly cause?: unknown;
}> {}

/** Saga 步骤执行失败 */
export class SagaStepError extends Data.TaggedError("SagaStepError")<{
  readonly sagaId: string;
  readonly stepIndex: number;
  readonly stepName: string;
  readonly message: string;
}> {}
