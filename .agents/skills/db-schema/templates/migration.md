# 数据库迁移指南

## 核心原则

- **DB Schema 也要像代码一样版本管理**
- **禁止手动执行 ALTER TABLE，破坏协作**
- **不要修改已执行的迁移文件和 `meta/` 文件夹；未执行的迁移文件可以修改或删除后重新生成**

## 规则

| 规则 | 状态 | 说明 |
|------|------|------|
| 使用迁移文件 | 🔴 必须 | 禁止手动 SQL |
| 可回滚 | 🔴 必须 | 确保可以回退 |
| 顺序执行 | 🔴 必须 | 保证迁移顺序 |
| 生产备份 | 🔴 必须 | 迁移前备份 |

## Drizzle 工作流程

### 开发环境

```bash
# 1. 修改 schema 文件 (src/db/schema/*.ts)
# 2. 直接推送到开发数据库
pnpm push

# push 会自动同步 schema 变更，无需生成迁移文件
# 适用于快速迭代开发
```

### 生产环境

```bash
# 1. 生成迁移文件
pnpm generate

# 2. 审查生成的 SQL（在 drizzle/ 目录下）
# 3. 执行迁移
pnpm migrate

# 4. 验证应用正常运行
```

### CI/CD 流程

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    steps:
      - name: Run migrations
        run: pnpm migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## 迁移最佳实践

### 1. 小单位迁移

```typescript
// ❌ BAD: 一次性大量变更
// 一个 schema 文件中同时添加多个表和字段

// ✅ GOOD: 分步进行
// Step 1: 添加 age 字段
// Step 2: push/generate
// Step 3: 添加 address 字段
// Step 4: push/generate
```

### 2. 安全添加列

```typescript
// ❌ BAD: NOT NULL 无默认值（会导致现有数据报错）
status: varchar({ length: 32 }).notNull(),

// ✅ GOOD: 包含默认值
status: varchar({ length: 32 }).notNull().default("active"),

// 或者分步进行：
// Step 1: 添加可空列
status: varchar({ length: 32 }),
// Step 2: 更新现有数据
// UPDATE users SET status = 'active' WHERE status IS NULL;
// Step 3: 改为非空
status: varchar({ length: 32 }).notNull(),
```

### 3. 安全删除列

```typescript
// ❌ BAD: 直接删除
// 从 schema 中移除字段后立即 push

// ✅ GOOD: 分步删除
// Step 1: 从代码中移除对该列的所有使用
// Step 2: 部署代码，确认稳定
// Step 3: 等待一段时间（确保无回滚需求）
// Step 4: 从 schema 中移除字段
// Step 5: 执行迁移
```

### 4. 安全重命名列

```typescript
// ❌ BAD: 直接重命名（Drizzle 会视为删除+新增）
// 旧: userName: varchar({ length: 64 }),
// 新: username: varchar({ length: 64 }),

// ✅ GOOD: 手动处理
// 1. 添加新列
// 2. 迁移数据
// 3. 更新代码使用新列
// 4. 删除旧列
```

### 5. 安全添加索引

```sql
-- ❌ BAD: 普通索引（会锁表）
CREATE INDEX users_email_idx ON users(email);

-- ✅ GOOD: 并发创建索引（不锁表，仅 PostgreSQL）
CREATE INDEX CONCURRENTLY users_email_idx ON users(email);
```

> **注意**: Drizzle 生成的索引默认不带 CONCURRENTLY，大表需要手动修改迁移 SQL

## 生产检查清单

### 迁移前

- [ ] 数据库备份完成
- [ ] 审查迁移 SQL
- [ ] 在测试环境验证
- [ ] 制定回滚计划
- [ ] 必要时发送维护通知

### 迁移中

- [ ] 监控仪表盘
- [ ] 错误日志监控
- [ ] 检查锁等待
- [ ] 关注响应时间

### 迁移后

- [ ] 确认应用正常运行
- [ ] 数据完整性验证
- [ ] 性能无下降
- [ ] 清理测试数据（如有）

## 回滚策略

### Drizzle 回滚方式

Drizzle 不像 Prisma 那样自动生成 down migration，需要手动处理：

```bash
# 方式1：使用数据库备份恢复
pg_restore -d your_database backup.dump

# 方式2：手动编写回滚 SQL
# 在 drizzle/ 目录下创建回滚脚本
```

### 建议

1. **重要迁移前务必备份**
2. **保存迁移前的 schema 快照**
3. **在测试环境先验证回滚流程**

## 常见问题

### Q: push 和 migrate 有什么区别？

| 命令 | 用途 | 场景 |
|------|------|------|
| `pnpm push` | 直接同步 schema 到数据库 | 开发环境快速迭代 |
| `pnpm generate` | 生成迁移 SQL 文件 | 准备生产部署 |
| `pnpm migrate` | 执行迁移文件 | 生产环境部署 |

### Q: 迁移失败怎么办？

1. 查看错误日志，定位问题
2. 如果是部分执行，手动回滚已执行的部分
3. 修复 schema 或迁移文件
4. 重新执行迁移

### Q: 如何处理大表迁移？

1. **分批处理**: 将大变更拆分为多个小迁移
2. **低峰期执行**: 选择流量低的时段
3. **使用 CONCURRENTLY**: 索引创建使用并发模式
4. **监控锁等待**: 设置合理的锁超时

### Q: 多人协作时如何避免冲突？

1. 频繁同步主分支
2. 迁移文件按时间戳命名（Drizzle 自动处理）
3. 合并前在本地测试迁移
4. 避免同时修改同一张表
