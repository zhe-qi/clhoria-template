#!/bin/sh

# 设置迁移锁文件
MIGRATION_LOCK_FILE="/tmp/migration.lock"

echo "检查数据库迁移状态..."

# 检查是否已有迁移正在运行
if [ -f "$MIGRATION_LOCK_FILE" ]; then
    echo "检测到迁移锁文件，等待其他容器完成迁移..."
    # 等待最多 60 秒
    timeout=60
    while [ -f "$MIGRATION_LOCK_FILE" ] && [ $timeout -gt 0 ]; do
        sleep 1
        timeout=$((timeout - 1))
    done

    if [ -f "$MIGRATION_LOCK_FILE" ]; then
        echo "等待迁移超时，可能存在死锁，删除锁文件并继续..."
        rm -f "$MIGRATION_LOCK_FILE"
    fi
fi

echo "开始执行数据库迁移..."

# 创建迁移锁文件
touch "$MIGRATION_LOCK_FILE"

# 使用自定义迁移脚本执行迁移
cd /app/migrate && pnpm run db:migrate ../migrations
migration_exit_code=$?

# 删除迁移锁文件
rm -f "$MIGRATION_LOCK_FILE"

if [ $migration_exit_code -ne 0 ]; then
  echo "迁移失败，退出代码 $migration_exit_code"

  # 如果环境变量设置为忽略迁移错误，则继续运行
  if [ "$IGNORE_MIGRATION_ERRORS" = "true" ]; then
    echo "IGNORE_MIGRATION_ERRORS=true，忽略迁移错误并继续..."
  else
    echo "退出应用，如需忽略迁移错误并强制启动应用，请设置环境变量 IGNORE_MIGRATION_ERRORS=true"
    exit $migration_exit_code
  fi
fi

echo "迁移完成，开始同步权限端点..."

# 同步权限端点
cd /app && pnpm sync:permissions
sync_exit_code=$?

if [ $sync_exit_code -ne 0 ]; then
  echo "权限同步失败，退出代码 $sync_exit_code"
  
  # 如果环境变量设置为忽略同步错误，则继续运行
  if [ "$IGNORE_SYNC_ERRORS" = "true" ]; then
    echo "IGNORE_SYNC_ERRORS=true，忽略权限同步错误并继续..."
  else
    echo "退出应用，如需忽略权限同步错误并强制启动应用，请设置环境变量 IGNORE_SYNC_ERRORS=true"
    exit $sync_exit_code
  fi
fi

echo "权限同步完成，正在启动 Hono 应用服务器..."
echo "服务器端口: ${PORT:-9999}"

cd /app && node dist/index.js
