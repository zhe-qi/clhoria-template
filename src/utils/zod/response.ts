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
 * 成功响应类型
 * @template T 响应主体数据类型
 */
export type SuccessResponse<T = unknown> = {
  data: T;
  [key: string]: unknown;
};

export class Resp {
  /**
   * 私有工具方法：转换 ZodError 的 path（抽离复用，避免重复逻辑）
   * @param path ZodError 原始 path（可能包含 symbol）
   * @returns 标准化的 path（仅 string/number）
   */
  private static transformZodPath(
    path: (string | number | symbol)[],
  ): (string | number)[] {
    return path.map(p => typeof p === "symbol" ? p.toString() : p);
  }

  /**
   * 失败响应，支持 字符串、Error、ZodError
   * @param input 错误源（字符串/Error/ZodError）
   * @param extra 额外扩展字段（与 message 平级展开）
   * @returns 标准化的错误响应对象（符合 RespErr 类型）
   */
  static fail(
    input: string | Error | ZodError,
    extra?: Record<string, unknown>,
  ): RespErr {
    // 初始化响应对象，提前合并 extra，避免多次展开
    const response: RespErr = {
      ...(extra ?? {}), // 用 ?? 替代 ||，避免 0/false 等假值被错误覆盖
    };

    // 分支逻辑：集中处理 message/error/stack 字段，解决变量未初始化问题
    if (typeof input === "string") {
      // 字符串输入：仅设置 message
      response.message = input;
    }
    else if (input instanceof ZodError) {
      // ZodError 输入：格式化 message + error 字段
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
      // Error 实例：提取 message + 可选 stack
      response.message = input.message || "未知错误";
      // 补充 stack 字段（原有代码遗漏，优化后更完整）
      if (input.stack) {
        response.stack = input.stack;
      }
    }

    // 兜底：确保 message 必有值（避免 Zod 校验失败）
    if (!response.message) {
      response.message = "未知错误";
    }

    return response;
  }

  /**
   * 成功响应
   * @param data 响应主体数据
   * @param extra 额外扩展字段（与 data 平级展开）
   * @returns 标准化的成功响应对象
   */
  static ok<T>(data: T, extra?: Record<string, unknown>): SuccessResponse<T> {
    return { data, ...extra };
  }

  /**
   * 校验错误响应是否符合 Schema（可选，用于调试/接口校验）
   * @param resp 错误响应对象
   * @returns 校验结果（true 表示合法）
   */
  static validateErrResp(resp: unknown): resp is RespErr {
    const result = respErrSchema.safeParse(resp);
    return result.success;
  }
}
