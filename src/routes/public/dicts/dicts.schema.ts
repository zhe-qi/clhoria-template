import { z } from "zod";

import { dictCodeField, dictItemSchema } from "@/routes/admin/system/dicts/dicts.schema";

/** Code params schema / Code 参数 Schema */
export const dictCodeParamsSchema = z.object({
  code: dictCodeField,
});

/** Dict items response schema / 字典项响应 Schema */
export const dictItemsResponseSchema = z.object({
  code: z.string().meta({ description: "字典编码" }),
  name: z.string().meta({ description: "字典名称" }),
  items: z.array(dictItemSchema).meta({ description: "字典项列表" }),
});
