import { z, ZodError } from "zod";

export const respErr = z.object({
  message: z.string().describe("错误信息"),
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

    if (typeof input === "string") {
      message = input;
    }
    else if (input instanceof ZodError) {
      message = z.prettifyError(input);
    }
    else {
      message = input.message || "未知错误";
    }

    return {
      message,
      ...(extra || {}),
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
