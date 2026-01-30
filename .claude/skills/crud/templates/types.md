# Types 模板

## 标准类型文件

```typescript
// {feature}.types.ts
import type { z } from "zod";
import type * as routes from "./{feature}.routes";
import type { {feature}ResponseSchema } from "./{feature}.schema";
import type { AppRouteHandler } from "@/types/lib";

/** 实体类型 */
export type {Feature} = z.infer<typeof {feature}ResponseSchema>;

/** 路由类型映射 */
type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

/** 路由 Handler 类型 */
export type {Feature}RouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
```

## 说明

- `RouteTypes` 自动从 routes 模块推导所有路由类型
- `{Feature}RouteHandlerType<"list">` 用于 handler 函数的类型标注
- 确保 handler 的请求/响应类型完全匹配路由定义
