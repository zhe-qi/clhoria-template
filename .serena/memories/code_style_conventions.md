# 代码风格和约定

## 基本约定
- 使用 TypeScript 严格模式
- ES 模块语法（`"type": "module"`）
- 使用 `pnpm` 作为包管理器
- ESLint 配置：@antfu/eslint-config

## 控制台输出规则
- **禁止使用 emoji**：console.log、console.warn、console.error 中不得使用装饰性图标
- **纯文本输出**：所有控制台输出应为纯文本，无装饰符号
- 示例：✅ `console.log("权限同步完成: 新增 3, 更新 1")` ❌ `console.log("✅ 权限同步完成")`

## 路由注释标准
所有路由定义必须包含注释：
- 单行：`/** 描述 */`
- 多行：`/** 创建新用户 * 支持批量创建和角色分配 */`
- 使用中文描述，专注业务目的
- 不使用 JSDoc 标签（@param、@returns 等）

## 数据库架构规则
- 表名使用 snake_case
- 表字段必须使用 `.describe()` 添加中文描述
- 状态字段使用 `integer().default(1)`（1=启用，0=禁用）
- JSON 字段使用 `jsonb()` 而非 `json()`，配合 `.$type<Interface>()` 进行类型约束

## 错误处理标准
- **禁止盲目使用 try-catch**：先研究函数是否会抛出异常
- Drizzle 查询不抛异常（返回空数组/undefined），插入操作可能抛约束错误
- 只在已知异常场景使用 try-catch（如数据库约束违反）
- 让全局错误处理器处理未知异常

## 状态码使用
- 必须使用 `HttpStatusCodes` 常量，禁止直接使用数字
- 单行返回格式：`return c.json(data, HttpStatusCodes.OK)`
- 路由定义中必须包含所有可能的状态码响应