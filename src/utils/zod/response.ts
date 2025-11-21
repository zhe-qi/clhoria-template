import { z, ZodError } from "zod";

export const respErr = z.object({
  message: z.string().optional().describe("错误信息"),
  stack: z.string().optional().describe("错误堆栈"),
  error: z.object({
    name: z.string().describe("错误名称"),
    issues: z.array(z.object({
      code: z.string().describe("错误码"),
      path: z.array(z.union([z.string(), z.number()])).describe("错误路径"),
      message: z.string().describe("错误信息"),
    })).optional().describe("错误详情"),
  }).optional().describe("错误对象"),
}).catchall(z.unknown()).describe("错误响应");

type RespErr = z.infer<typeof respErr>;

export class Resp {
  /**
   * 失败响应，支持 字符串、Error、ZodError
   * extra为可选参数，会与message平级展开
   */
  static fail(
    input: string | Error | ZodError,
    extra?: Record<string, unknown>,
  ): RespErr {
    let message: string;
    let error: RespErr["error"];

    if (typeof input === "string") {
      message = input;
    }
    else if (input instanceof ZodError) {
      message = z.prettifyError(input);
      error = {
        name: input.name,
        issues: input.issues.map(issue => ({
          code: issue.code,
          message: issue.message,
          path: issue.path.map(p => typeof p === "symbol" ? p.toString() : p), // convert symbol → string
        })),
      };
    }
    else {
      message = input.message || "未知错误";
    }

    return {
      message,
      ...(extra || {}),
      ...(error ? { error } : {}),
    };
  }

  /** 成功响应 */
  static ok<T = ParamsType>(data: T): {
    data: T;
  } {
    return {
      data,
    };
  }
}
