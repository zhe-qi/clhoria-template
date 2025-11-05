import { pgEnum } from "drizzle-orm/pg-core";

import { Gender, RealNameAuthStatus, RealNameAuthType, Status, UserStatus, VerificationStatus } from "@/lib/enums";

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

// 定义所有数据库枚举类型
export const statusEnum = pgEnum("status", extractEnumValues(Status));
export const genderEnum = pgEnum("gender", extractEnumValues(Gender));
export const userStatusEnum = pgEnum("user_status", extractEnumValues(UserStatus));
export const verificationStatusEnum = pgEnum("verification_status", extractEnumValues(VerificationStatus));
export const realNameAuthTypeEnum = pgEnum("real_name_auth_type", extractEnumValues(RealNameAuthType));
export const realNameAuthStatusEnum = pgEnum("real_name_auth_status", extractEnumValues(RealNameAuthStatus));
