# 权限系统开发者文档

## 概述

本系统基于 Hono 框架实现了一套完整的多层级权限管理系统，采用基于角色的访问控制 (RBAC) 模型，结合 Casbin 提供强大的权限验证能力。系统支持多租户架构，通过域 (Domain) 实现租户隔离。

## 系统架构

### 权限层级结构

```
用户 (User) → 角色 (Role) → 权限 (Permission) → 资源 (Resource) + 动作 (Action)
```

### 路由分层

系统采用三层路由架构，不同层级有不同的权限验证策略：

1. **公共路由** (`/routes/public/`) - 无需认证
2. **客户端路由** (`/routes/client/`) - JWT 认证 (CLIENT_JWT_SECRET)
3. **管理端路由** (`/routes/admin/`) - JWT + Casbin 权限验证 (ADMIN_JWT_SECRET)

路由注册顺序影响中间件执行顺序，公共路由必须最先注册。

## 核心组件

### 1. 认证中间件

#### JWT 认证中间件
- **位置**: `src/middlewares/jwt-auth.ts`
- **作用**: 验证 JWT token，提取用户信息到上下文
- **配置**: 客户端和管理端使用不同的 JWT 密钥

#### Casbin 权限中间件
- **位置**: `src/middlewares/jwt-auth.ts:19-90`
- **作用**: 基于角色的权限验证
- **流程**:
  1. 验证用户状态
  2. 获取用户角色 (支持 Redis 缓存)
  3. 检查端点权限配置
  4. 执行 Casbin 权限验证
  5. 缓存验证结果

### 2. 权限配置管理

#### 权限配置管理器
- **位置**: `src/lib/permissions/permission-config.ts`
- **类**: `PermissionConfigManager`
- **功能**:
  - 端点权限注册和查询
  - 权限配置缓存
  - 统计信息

#### 权限推断系统
- **位置**: `src/lib/permissions/permission-inference.ts`
- **作用**: 自动推断路由的权限配置
- **支持**: 基于路径和 HTTP 方法的智能推断

### 3. 权限枚举定义

#### 权限资源 (PermissionResource)
- **位置**: `src/lib/enums/permissions.ts:2-44`
- **包含**:
  - 系统用户管理 (`system-users`)
  - 角色管理 (`system-roles`)
  - 菜单管理 (`system-menus`)
  - 组织管理 (`system-organization`)
  - 等 13 个系统资源

#### 权限动作 (PermissionAction)
- **位置**: `src/lib/enums/permissions.ts:50-92`
- **包含**:
  - 基础 CRUD: `create`, `read`, `update`, `delete`
  - 特殊操作: `assign-permissions`, `assign-routes`, `reset-password`
  - 状态管理: `enable`, `disable`, `change-status`

## 数据库设计

### 权限相关表结构

#### 1. 用户表 (`system_user`)
- **位置**: `src/db/schema/system/user.ts`
- **关键字段**:
  - `username`: 用户名 (唯一)
  - `domain`: 租户域
  - `status`: 状态 (启用/禁用/封禁)

#### 2. 角色表 (`system_role`)
- **位置**: `src/db/schema/system/role.ts`
- **关键字段**:
  - `code`: 角色代码 (如 `ROLE_ADMIN`)
  - `name`: 角色名称
  - `pid`: 父角色ID (支持角色继承)

#### 3. 用户角色关联表 (`system_user_role`)
- **位置**: `src/db/schema/system/user-role.ts`
- **结构**: 用户ID + 角色ID 的多对多关系

#### 4. Casbin 规则表 (`casbin_rule`)
- **位置**: `src/db/schema/auth/casbin-rule.ts`
- **用途**: 存储 Casbin RBAC 策略和角色继承关系
- **字段映射**:
  - `v0`: 主体 (用户/角色)
  - `v1`: 资源
  - `v2`: 动作
  - `v3`: 域 (租户)
  - `v4`: 效果 (allow/deny)

#### 5. 系统端点表 (`system_endpoint`)
- **位置**: `src/db/schema/system/endpoint.ts`
- **作用**: 存储 API 端点的权限配置信息

#### 6. 角色菜单关联表 (`system_role_menu`)
- **位置**: `src/db/schema/system/role-menu.ts`
- **作用**: 控制角色可访问的菜单

## 权限验证流程

### 请求权限验证流程

1. **JWT 验证**: 验证 token 合法性，提取用户信息
2. **用户状态检查**: 验证用户是否存在且状态正常
3. **角色获取**: 从缓存或数据库获取用户角色列表
4. **端点权限查询**: 查找当前请求端点的权限配置
5. **权限验证**: 使用 Casbin 验证用户角色是否有访问权限
6. **结果缓存**: 缓存验证结果以提升性能

### 缓存策略

系统使用 Redis 实现多级缓存：

- **用户角色缓存**: `user:roles:{userId}:{domain}`
- **权限验证结果缓存**: `permission:result:{userId}:{domain}:{method}:{path}`
- **用户菜单缓存**: `user:menus:{userId}:{domain}`

## API 接口

### 权限管理相关接口

#### 1. 角色权限分配
- **端点**: `POST /sys-authorization/assign-permissions`
- **作用**: 为角色分配权限
- **权限**: `system-authorization:assign-permissions`

#### 2. 角色菜单分配
- **端点**: `POST /sys-authorization/assign-routes`
- **作用**: 为角色分配可访问菜单
- **权限**: `system-authorization:assign-routes`

#### 3. 角色用户分配
- **端点**: `POST /sys-authorization/assign-users`
- **作用**: 为角色分配用户
- **权限**: `system-authorization:assign-users`

#### 4. 获取用户路由
- **端点**: `GET /sys-authorization/user-routes`
- **作用**: 获取用户可访问的前端路由配置
- **权限**: `system-authorization:get-user-routes`

## 开发指南

### 1. 添加新的权限资源

在 `src/lib/enums/permissions.ts` 中添加新的资源定义：

```typescript
export const PermissionResource = {
  // 现有资源...
  NEW_RESOURCE: "new-resource",
} as const;
```

### 2. 添加新的权限动作

```typescript
export const PermissionAction = {
  // 现有动作...
  NEW_ACTION: "new-action",
} as const;
```

### 3. 配置路由权限

在路由定义中使用 OpenAPI 标签配置权限：

```typescript
app.meta(createRoute({
  method: "post",
  path: "/resource",
  tags: ["/resource (资源管理)"],
  // ... 其他配置
}), handler);
```

### 4. 手动配置端点权限

使用权限配置管理器：

```typescript
import { PermissionConfigManager } from "@/lib/permissions";

const manager = PermissionConfigManager.getInstance();
manager.registerEndpointPermission({
  id: "unique-id",
  path: "/api/resource",
  method: "POST",
  resource: "new-resource",
  action: "create",
  controller: "ResourceController",
  summary: "创建资源"
});
```

### 5. 上下文数据获取

在处理器中获取权限相关上下文：

```typescript
import { pickContext } from "@/utils";

export async function handler(c: Context) {
  // 获取单个参数
  const domain = c.get("userDomain");
  const userId = c.get("userId");

  // 获取多个参数
  const { userRoles, currentPermission } = pickContext(c, [
    "userRoles", "currentPermission"
  ]);

  // ... 业务逻辑
}
```

## 性能优化

### 1. 缓存策略
- 用户角色信息缓存到 Redis
- 权限验证结果缓存
- 支持缓存失效和刷新

### 2. 批量操作
- 批量权限分配和撤销
- 批量用户角色更新

### 3. 数据库优化
- Casbin 规则表建立复合索引
- 用户角色关联表建立主键索引

## 安全考虑

### 1. JWT 安全
- 客户端和管理端使用不同密钥
- Token 过期时间控制
- 支持 Token 刷新机制

### 2. 权限验证
- 严格的权限验证流程
- 默认拒绝策略
- 域隔离确保多租户安全

### 3. 缓存安全
- 权限变更时及时清理相关缓存
- 缓存键包含域信息避免跨租户访问

## 故障排查

### 1. 权限验证失败
- 检查用户状态是否正常
- 确认用户是否有对应角色
- 验证端点权限配置是否正确
- 检查 Casbin 规则是否存在

### 2. 缓存问题
- 权限更新后清理相关缓存
- 检查 Redis 连接状态
- 确认缓存键格式正确

### 3. 性能问题
- 监控权限验证耗时
- 检查缓存命中率
- 优化数据库查询

## 监控和日志

### 1. 操作日志
- **中间件**: `src/middlewares/operation-log.ts`
- **作用**: 记录管理端所有操作
- **字段**: 用户、操作、模块、IP、时间等

### 2. 登录日志
- **表**: `system_login_log`
- **记录**: 用户登录行为和结果

### 3. 权限验证监控
- 权限验证成功/失败统计
- 缓存命中率监控
- 性能指标跟踪

## 最佳实践

### 1. 权限设计
- 遵循最小权限原则
- 合理设计角色层级
- 避免权限过于细粒度

### 2. 代码规范
- 使用枚举定义权限资源和动作
- 统一的错误处理和响应格式
- 完整的权限配置和文档

### 3. 测试策略
- 权限验证单元测试
- 集成测试覆盖完整流程
- 安全测试确保权限隔离

### 4. 部署和运维
- 权限配置的版本控制
- 生产环境权限变更审批
- 定期权限审计和清理

## 扩展性

### 1. 自定义权限验证
- 支持自定义权限验证逻辑
- 可扩展的权限推断系统
- 插件化的权限配置

### 2. 多租户支持
- 基于域的完全隔离
- 灵活的租户权限配置
- 租户级别的权限模板

### 3. 集成第三方系统
- 支持 LDAP/AD 集成
- SSO 单点登录支持
- 外部权限系统集成接口
