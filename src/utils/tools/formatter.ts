import { toZonedTime, format as tzFormat } from "date-fns-tz";

import { logger } from "@/lib/logger";

/**
 * 格式化日期
 * @param date - 日期或日期字符串
 * @param formatString - 格式化字符串
 * @param timeZone - 时区
 */
export function formatDate<T extends Date | string>(
  date: T,
  formatString = "yyyy-MM-dd HH:mm:ss",
  timeZone = "Asia/Shanghai",
) {
  return tzFormat(toZonedTime(date, timeZone), formatString);
}

/**
 * 解析json, 如果解析失败, 返回原始字符串
 * @params data - 需要解析的json字符串
 */
export function formatSafeJson<T extends object>(data: unknown): T {
  try {
    return JSON.parse(data as string) as T;
  }
  catch (error) {
    logger.warn({ error, data }, "JSON解析失败，返回原始数据");
    return data as T;
  }
}
