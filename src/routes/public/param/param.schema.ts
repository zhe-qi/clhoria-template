import { z } from "zod";

import { ParamValueType } from "@/lib/enums";
import { paramKeyField } from "@/routes/admin/system/param/param.schema";

/** Key 参数 Schema */
export const paramKeyParams = z.object({
  key: paramKeyField,
});

/** 参数响应 Schema */
export const paramResponseSchema = z.object({
  key: z.string().meta({ description: "参数键" }),
  value: z.string().meta({ description: "参数值" }),
  valueType: z.enum([ParamValueType.STRING, ParamValueType.NUMBER, ParamValueType.BOOLEAN, ParamValueType.JSON]).meta({ description: "参数值类型" }),
  name: z.string().meta({ description: "参数名称" }),
});
