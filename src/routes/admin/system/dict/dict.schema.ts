import { z } from "zod";

import { insertSystemDictSchema, selectSystemDictSchema } from "@/db/schema";
import { Status } from "@/lib/enums";

/** 字典项 Schema */
export const dictItemSchema = z.object({
  label: z.string().min(1, "显示文本不能为空").max(64, "显示文本最多64个字符").meta({ description: "显示文本" }),
  value: z.string().min(1, "字典值不能为空").max(64, "字典值最多64个字符").meta({ description: "字典值" }),
  sort: z.number().int("排序序号必须是整数").min(0, "排序序号不能为负数").meta({ description: "排序序号" }),
  disabled: z.boolean().optional().meta({ description: "是否禁用" }),
  color: z.string().max(32, "颜色值最多32个字符").optional().meta({ description: "标签颜色" }),
});

/** 字典编码字段 */
export const dictCodeField = z.string()
  .min(1, "字典编码不能为空")
  .max(64, "字典编码最多64个字符")
  .regex(/^[a-z0-9_]+$/, "字典编码只能包含小写字母、数字和下划线")
  .meta({ description: "字典编码" });

/** 创建字典 Schema */
export const systemDictCreateSchema = insertSystemDictSchema.extend({
  code: dictCodeField,
  name: z.string().min(1, "字典名称不能为空").max(128, "字典名称最多128个字符").meta({ description: "字典名称" }),
  description: z.string().optional().meta({ description: "字典描述" }),
  items: z.array(dictItemSchema).default([]).meta({ description: "字典项列表" }),
  status: z.enum([Status.ENABLED, Status.DISABLED]).optional().meta({ description: "状态" }),
});

/** 更新字典 Schema */
export const systemDictPatchSchema = insertSystemDictSchema.extend({
  code: dictCodeField,
  name: z.string().min(1, "字典名称不能为空").max(128, "字典名称最多128个字符").meta({ description: "字典名称" }),
  description: z.string().optional().meta({ description: "字典描述" }),
  items: z.array(dictItemSchema).default([]).meta({ description: "字典项列表" }),
  status: z.enum([Status.ENABLED, Status.DISABLED]).optional().meta({ description: "状态" }),
}).partial().refine(
  data => Object.keys(data).length > 0,
  { message: "至少需要提供一个字段进行更新" },
);

/** 查询参数 Schema（自定义过滤字段，不包含分页参数） */
export const systemDictQuerySchema = z.object({
  code: z.string().optional().meta({ description: "字典编码（模糊搜索）" }),
  name: z.string().optional().meta({ description: "字典名称（模糊搜索）" }),
  status: z.enum([Status.ENABLED, Status.DISABLED]).optional().meta({ description: "状态" }),
});

/** ID 参数 Schema */
export const systemDictIdParams = z.object({
  id: z.uuid("ID 必须是有效的 UUID").meta({ description: "字典ID" }),
});

/** 响应 Schema */
export const systemDictResponseSchema = selectSystemDictSchema;

/** 列表响应 Schema */
export const systemDictListResponse = z.array(systemDictResponseSchema);
