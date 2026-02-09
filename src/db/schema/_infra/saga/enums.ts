import { SagaStatus, SagaStepStatus } from "@/lib/enums";

import { infraSchema } from "../schema";

/**
 * 类型安全的枚举值提取函数
 * 将对象的值转换为 pgEnum 所需的元组类型
 */
function extractEnumValues<T extends Record<string, string>>(
  enumObj: T,
): [T[keyof T], ...T[keyof T][]] {
  const values = Object.values(enumObj) as T[keyof T][];
  if (values.length === 0) {
    throw new Error("Enum object must have at least one value");
  }
  return values as [T[keyof T], ...T[keyof T][]];
}

export const sagaStatusEnum = infraSchema.enum("saga_status", extractEnumValues(SagaStatus));
export const sagaStepStatusEnum = infraSchema.enum("saga_step_status", extractEnumValues(SagaStepStatus));
