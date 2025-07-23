import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { createMessageObjectSchema } from "stoker/openapi/schemas";

import { formatZodError } from "@/utils";

export const notFoundSchema = createMessageObjectSchema(HttpStatusPhrases.NOT_FOUND);

export const updatesZodError = formatZodError({
  issues: [
    {
      code: "invalid_updates",
      path: [],
      message: "没有更新内容",
    },
  ],
  name: "ZodError",
});

export function getQueryValidationError(error: { message: string }) {
  return formatZodError({
    issues: [
      {
        code: "invalid_query",
        path: [],
        message: error.message,
      },
    ],
    name: "ZodError",
  });
}

export function getDuplicateKeyError(field: string, message: string) {
  return {
    error: {
      issues: [{
        code: "duplicate_key",
        path: [field],
        message,
      }],
      name: "ValidationError",
    },
    success: false,
  };
}

export function getNotFoundError(resource: string) {
  return {
    message: `${resource}不存在`,
  };
}

/** Zod 错误代码枚举 */
export const ZodErrorCodes = {
  /** 无效的更新操作 */
  INVALID_UPDATES: "invalid_updates",
  /** 重复键错误 */
  DUPLICATE_KEY: "duplicate_key",
  /** 无效查询 */
  INVALID_QUERY: "invalid_query",
  /** 字符串太短 */
  TOO_SMALL: "too_small",
  /** 字符串太长 */
  TOO_BIG: "too_big",
  /** 无效类型 */
  INVALID_TYPE: "invalid_type",
  /** 无效枚举值 */
  INVALID_ENUM_VALUE: "invalid_enum_value",
  /** 无效字符串格式 */
  INVALID_STRING: "invalid_string",
  /** 无效数字 */
  INVALID_NUMBER: "invalid_number",
  /** 无效日期 */
  INVALID_DATE: "invalid_date",
  /** 无效UUID */
  INVALID_UUID: "invalid_uuid",
  /** 无效邮箱 */
  INVALID_EMAIL: "invalid_email",
  /** 无效URL */
  INVALID_URL: "invalid_url",
  /** 必填字段 */
  REQUIRED: "required",
  /** 自定义验证失败 */
  CUSTOM: "custom",
} as const;

/** Zod 错误代码类型 */
export type ZodErrorCodesType = (typeof ZodErrorCodes)[keyof typeof ZodErrorCodes];

/** Zod 错误消息枚举 */
export const ZodErrorMessages = {
  /** 必填字段消息 */
  REQUIRED: "必填字段",
  /** 无更新内容消息 */
  NO_UPDATES: "没有更新内容",
  /** 期望数字类型消息 */
  EXPECTED_NUMBER: "期望数字类型",
  /** 期望字符串类型消息 */
  EXPECTED_STRING: "期望字符串类型",
  /** 期望布尔类型消息 */
  EXPECTED_BOOLEAN: "期望布尔类型",
  /** 期望数组类型消息 */
  EXPECTED_ARRAY: "期望数组类型",
  /** 期望对象类型消息 */
  EXPECTED_OBJECT: "期望对象类型",
  /** 无效UUID格式消息 */
  INVALID_UUID: "Invalid uuid",
  /** 无效邮箱格式消息 */
  INVALID_EMAIL: "邮箱格式不正确",
  /** 无效URL格式消息 */
  INVALID_URL: "URL格式不正确",
  /** 字符串太短消息 */
  TOO_SHORT: "字符串长度不足",
  /** 字符串太长消息 */
  TOO_LONG: "字符串长度超限",
  /** 数字太小消息 */
  NUMBER_TOO_SMALL: "数值过小",
  /** 数字太大消息 */
  NUMBER_TOO_BIG: "数值过大",
  /** 重复键消息 */
  DUPLICATE_KEY: "重复的键值",
  /** 无效枚举值消息 */
  INVALID_ENUM: "无效的枚举值",
  /** 自定义验证失败消息 */
  VALIDATION_FAILED: "验证失败",
} as const;

/** Zod 错误消息类型 */
export type ZodErrorMessagesType = (typeof ZodErrorMessages)[keyof typeof ZodErrorMessages];

/** 错误响应类型枚举 */
export const ErrorResponseTypes = {
  /** 验证错误 */
  VALIDATION_ERROR: "ValidationError",
  /** 业务错误 */
  BUSINESS_ERROR: "BusinessError",
  /** 系统错误 */
  SYSTEM_ERROR: "SystemError",
  /** 权限错误 */
  PERMISSION_ERROR: "PermissionError",
  /** 资源不存在错误 */
  NOT_FOUND_ERROR: "NotFoundError",
  /** 重复资源错误 */
  DUPLICATE_ERROR: "DuplicateError",
} as const;

/** 错误响应类型 */
export type ErrorResponseTypesType = (typeof ErrorResponseTypes)[keyof typeof ErrorResponseTypes];
