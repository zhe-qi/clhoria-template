# Zod Schema 模板

## 标准 Schema 文件

```typescript
// {feature}.schema.ts
import { z } from "zod";
import { insert{Feature}sSchema, select{Feature}sSchema } from "@/db/schema";
import { Status } from "@/lib/enums";

/** 创建 Schema */
export const {feature}CreateSchema = insert{Feature}sSchema.extend({
  // 覆盖或添加字段验证
  name: z.string()
    .min(1, "名称不能为空")
    .max(128, "名称最多128个字符")
    .meta({ description: "名称" }),
  status: z.enum([Status.ENABLED, Status.DISABLED])
    .optional()
    .meta({ description: "状态" }),
});

/** 更新 Schema（partial + refine） */
export const {feature}PatchSchema = insert{Feature}sSchema.extend({
  name: z.string()
    .min(1, "名称不能为空")
    .max(128, "名称最多128个字符")
    .meta({ description: "名称" }),
}).partial().refine(
  data => Object.keys(data).length > 0,
  { message: "至少需要提供一个字段进行更新" },
);

/** 查询参数 Schema（自定义过滤字段） */
export const {feature}QuerySchema = z.object({
  name: z.string().optional().meta({ description: "名称（模糊搜索）" }),
  status: z.enum([Status.ENABLED, Status.DISABLED])
    .optional()
    .meta({ description: "状态" }),
});

/** ID 参数 Schema */
export const {feature}IdParams = z.object({
  id: z.uuid("ID 必须是有效的 UUID").meta({ description: "ID" }),
});

/** 响应 Schema */
export const {feature}ResponseSchema = select{Feature}sSchema;

/** 列表响应 Schema */
export const {feature}ListResponse = z.array({feature}ResponseSchema);
```

## Schema 派生规则

| 用途 | 方法 | 示例 |
|------|------|------|
| 部分更新 | `.partial()` | PATCH 请求体 |
| 隐藏字段 | `.omit({ password: true })` | 响应中隐藏密码 |
| 扩展字段 | `.extend({ roles: ... })` | 添加关联数据 |
| 提取字段 | `.pick({ id: true, name: true })` | 简化响应 |
| 自定义验证 | `.refine()` | 至少一个字段 |

## 注意事项

- 使用 `.extend()` 合并 schema，不用 `.merge()`
- 使用 `z.enum([...])` 不用 `z.nativeEnum()`
- 使用 `z.uuid()` 不用 `z.string().uuid()`
- 所有字段添加 `.meta({ description })` 用于 OpenAPI 文档
