import { z, ZodError } from "zod";

export const respErr = z.object({
  message: z.string().describe("错误信息"),
}).describe("错误响应");

type RespErr = z.infer<typeof respErr>;

export class Resp {
  /** 失败响应，支持 字符串、Error、ZodError */
  static fail(input: string | Error | ZodError): RespErr {
    if (typeof input === "string") {
      return {
        message: input,
      };
    }

    if (input instanceof ZodError) {
      return {
        message: z.prettifyError(input),
      };
    }

    return {
      message: input.message || "未知错误",
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
