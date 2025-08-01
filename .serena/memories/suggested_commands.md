# 建议的开发命令

## 核心开发命令
- `pnpm dev` - 启动开发服务器（文件监听）
- `pnpm build` - 生产构建
- `pnpm start` - 启动生产服务器
- `pnpm typecheck` - TypeScript 类型检查
- `pnpm lint` - ESLint 代码检查
- `pnpm lint:fix` - 自动修复 ESLint 问题
- `pnpm test` - 运行测试（Vitest）

## 数据库相关命令
- `pnpm generate` - 生成 Drizzle 迁移文件
- `pnpm push` - 直接推送架构变更到数据库
- `pnpm studio` - 打开 Drizzle Studio 数据库管理界面
- `pnpm seed` - 执行数据填充
- `pnpm sync:permissions` - 同步权限配置

## 任务完成后必须运行的命令
1. `pnpm typecheck` - 确保类型检查通过
2. `pnpm lint` - 确保代码风格符合规范

## 系统工具（macOS Darwin）
标准的 Unix 命令可用：`git`, `ls`, `cd`, `grep`, `find` 等
