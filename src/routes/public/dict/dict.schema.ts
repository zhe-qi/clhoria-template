import { z } from "zod";

import { dictCodeField, dictItemSchema } from "@/routes/admin/system/dict/dict.schema";

/** Code 参数 Schema */
export const dictCodeParams = z.object({
  code: dictCodeField,
});

/** 字典项响应 Schema */
export const dictItemsResponseSchema = z.object({
  code: z.string().meta({ description: "字典编码" }),
  name: z.string().meta({ description: "字典名称" }),
  items: z.array(dictItemSchema).meta({ description: "字典项列表" }),
});
