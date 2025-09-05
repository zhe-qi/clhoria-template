import { z, ZodError } from "zod";

export const respErr = z.object({
  message: z.string().describe("错误信息"),
}).describe("错误响应");

type RespErr = z.infer<typeof respErr>;

export class Resp {
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
      message: "未知错误",
    };
  }

  static ok<T = ParamsType>(data: T): {
    data: T;
  } {
    return {
      data,
    };
  }
}
