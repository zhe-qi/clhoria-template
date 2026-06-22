# Zod Schema 模板

## 技术栈

- **验证库**: Zod v4
- **Drizzle 集成**: drizzle-zod

## 标准 Schema 文件

```typescript
// {feature}.schema.ts
import { z } from "zod";
import { insert{Feature}sSchema, select{Feature}sSchema } from "@/db/schema";
import { Status } from "@/lib/enums";

/** 基础字段（共享，避免 Create/Patch 重复定义） */
const {feature}BaseFields = {
  name: z.string()
    .min(1, "名称不能为空")
    .max(128, "名称最多128个字符")
    .meta({ description: "名称" }),
  status: z.enum([Status.ENABLED, Status.DISABLED])
    .optional()
    .meta({ description: "状态" }),
};

/** 创建 Schema */
export const {feature}CreateSchema = insert{Feature}sSchema.extend({feature}BaseFields);

/** 更新 Schema（partial + refine） */
export const {feature}PatchSchema = insert{Feature}sSchema
  .extend({feature}BaseFields)
  .partial()
  .refine(
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

// ID 参数使用 stoker 提供的 IdUUIDParamsSchema
// import { IdUUIDParamsSchema } from "@/lib/core/stoker/openapi/schemas";

/** 响应 Schema */
export const {feature}ResponseSchema = select{Feature}sSchema;

/** 列表响应 Schema */
export const {feature}ListResponseSchema = z.array({feature}ResponseSchema);
```

## Schema 派生规则

| 用途 | 方法 | 示例 |
|------|------|------|
| 部分更新 | `.partial()` | PATCH 请求体 |
| 隐藏字段 | `.omit({ password: true })` | 响应中隐藏密码 |
| 扩展字段 | `.extend({ roles: ... })` | 添加关联数据 |
| 提取字段 | `.pick({ id: true, name: true })` | 简化响应 |
| 自定义验证 | `.refine()` | 至少一个字段 |

## 最佳实践

### 使用规范

- 使用 `.extend()` 合并 schema，不用 `.merge()`
- 使用 `z.enum([...])` 不用 `z.nativeEnum()`
- 使用 `z.uuid()` 不用 `z.string().uuid()`
- 所有字段添加 `.meta({ description })` 用于 OpenAPI 文档

### 中文错误消息

```typescript
z.string().min(1, "名称不能为空")
z.string().max(128, "名称最多128个字符")
z.uuid("ID 必须是有效的 UUID")
z.number().min(0, "数量不能为负数")
```

### 类型推导

```typescript
// 从 Schema 推导类型，而非手动定义
type CreateInput = z.infer<typeof {feature}CreateSchema>;
type ResponseOutput = z.infer<typeof {feature}ResponseSchema>;
```

## Zod v4 注意事项

```typescript
// Zod v4.3+: 包含 refine 的 schema 不能调用 partial()
// 解决方案：先 partial() 再 refine()

// 错误示例
const baseSchema = z.object({ ... }).refine(...);
const patchSchema = baseSchema.partial();  // 报错！

// 正确示例
const baseSchema = z.object({ ... });
const patchSchema = baseSchema.partial().refine(...);
```
