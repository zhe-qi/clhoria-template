import { z } from "zod";

import { insertSystemParamsSchema, selectSystemParamsSchema } from "@/db/schema";
import { ParamValueType, Status } from "@/lib/enums";

/** 参数键字段 */
export const paramKeyField = z.string()
  .min(1, "参数键不能为空")
  .max(128, "参数键最多128个字符")
  .regex(/^[a-z0-9_]+$/, "参数键只能包含小写字母、数字和下划线")
  .meta({ description: "参数键" });

/** 参数基础字段（共享） */
const paramBaseFields = {
  key: paramKeyField,
  value: z.string().min(1, "参数值不能为空").meta({ description: "参数值" }),
  valueType: z.enum([ParamValueType.STRING, ParamValueType.NUMBER, ParamValueType.BOOLEAN, ParamValueType.JSON]).optional().meta({ description: "参数值类型" }),
  name: z.string().min(1, "参数名称不能为空").max(128, "参数名称最多128个字符").meta({ description: "参数名称" }),
  description: z.string().optional().meta({ description: "参数描述" }),
  status: z.enum([Status.ENABLED, Status.DISABLED]).optional().meta({ description: "状态" }),
};

/** 创建参数 Schema */
export const systemParamCreateSchema = insertSystemParamsSchema.extend(paramBaseFields);

/** 更新参数 Schema */
export const systemParamPatchSchema = insertSystemParamsSchema
  .extend(paramBaseFields)
  .partial()
  .refine(
    data => Object.keys(data).length > 0,
    { message: "至少需要提供一个字段进行更新" },
  );

/** 查询参数 Schema（自定义过滤字段，不包含分页参数） */
export const systemParamQuerySchema = z.object({
  key: z.string().optional().meta({ description: "参数键（模糊搜索）" }),
  name: z.string().optional().meta({ description: "参数名称（模糊搜索）" }),
  status: z.enum([Status.ENABLED, Status.DISABLED]).optional().meta({ description: "状态" }),
});

/** 响应 Schema */
export const systemParamResponseSchema = selectSystemParamsSchema;

/** 列表响应 Schema */
export const systemParamListResponseSchema = z.array(systemParamResponseSchema);
