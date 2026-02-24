import { z, ZodError } from "zod";

export const respErrSchema = z.object({
  message: z.string().optional().describe("错误信息"),
  stack: z.string().optional().describe("错误堆栈"),
  error: z.object({
    name: z.string().describe("错误名称"),
    issues: z.array(
      z.object({
        code: z.string().describe("错误码"),
        path: z.array(z.union([z.string(), z.number()])).describe("错误路径"),
        message: z.string().describe("错误信息"),
      }),
    ).optional().describe("错误详情"),
  }).optional().describe("错误对象"),
}).catchall(z.unknown()).describe("错误响应");

export type RespErr = z.infer<typeof respErrSchema>;

/**
 * Success response type
 * @template T Response body data type / 响应主体数据类型
 * 成功响应类型
 */
export type SuccessResponse<T = unknown> = {
  data: T;
  [key: string]: unknown;
};

export class Resp {
  /**
   * Private utility: transform ZodError path (extracted for reuse, avoid duplicate logic)
   * @param path ZodError original path (may contain symbols) / ZodError 原始 path（可能包含 symbol）
   * @returns Normalized path (string/number only) / 标准化的 path（仅 string/number）
   * 私有工具方法：转换 ZodError 的 path（抽离复用，避免重复逻辑）
   */
  private static transformZodPath(
    path: (string | number | symbol)[],
  ): (string | number)[] {
    return path.map(p => typeof p === "symbol" ? p.toString() : p);
  }

  /**
   * Failure response, supports string, Error, ZodError
   * @param input Error source (string/Error/ZodError) / 错误源（字符串/Error/ZodError）
   * @param extra Extra extension fields (spread at the same level as message) / 额外扩展字段（与 message 平级展开）
   * @returns Normalized error response object (conforms to RespErr type) / 标准化的错误响应对象（符合 RespErr 类型）
   * 失败响应，支持 字符串、Error、ZodError
   */
  static fail(
    input: string | Error | ZodError,
    extra?: Record<string, unknown>,
  ): RespErr {
    // Initialize response object, merge extra upfront to avoid multiple spreads / 初始化响应对象，提前合并 extra，避免多次展开
    const response: RespErr = {
      ...(extra ?? {}),
    };

    // Branch logic: centralize message/error/stack field handling, resolve uninitialized variable issue / 分支逻辑：集中处理 message/error/stack 字段，解决变量未初始化问题
    if (typeof input === "string") {
      // String input: only set message / 字符串输入：仅设置 message
      response.message = input;
    }
    else if (input instanceof ZodError) {
      // ZodError input: format message + error fields / ZodError 输入：格式化 message + error 字段
      response.message = z.prettifyError(input);
      response.error = {
        name: input.name,
        issues: input.issues.map(issue => ({
          code: issue.code,
          message: issue.message,
          path: this.transformZodPath(issue.path),
        })),
      };
    }
    else {
      // Error instance: extract message + optional stack / Error 实例：提取 message + 可选 stack
      response.message = input.message || "未知错误";
      // Add stack field (was missing in original code, now more complete) / 补充 stack 字段（原有代码遗漏，优化后更完整）
      if (input.stack) {
        response.stack = input.stack;
      }
    }

    // Fallback: ensure message always has a value (avoid Zod validation failure) / 兜底：确保 message 必有值（避免 Zod 校验失败）
    if (!response.message) {
      response.message = "未知错误";
    }

    return response;
  }

  /**
   * Success response
   * @param data Response body data / 响应主体数据
   * @param extra Extra extension fields (spread at the same level as data) / 额外扩展字段（与 data 平级展开）
   * @returns Normalized success response object / 标准化的成功响应对象
   * 成功响应
   */
  static ok<T>(data: T, extra?: Record<string, unknown>): SuccessResponse<T> {
    return { data, ...extra };
  }

  /**
   * Validate whether error response conforms to schema (optional, for debugging/API validation)
   * @param resp Error response object / 错误响应对象
   * @returns Validation result (true means valid) / 校验结果（true 表示合法）
   * 校验错误响应是否符合 Schema（可选，用于调试/接口校验）
   */
  static validateErrResp(resp: unknown): resp is RespErr {
    const result = respErrSchema.safeParse(resp);
    return result.success;
  }
}
