#!/usr/bin/env tsx

import { sql } from "drizzle-orm";

import db from "@/db";
import { checkTimescaleExtension, setupHypertables } from "@/db/timescale";
import { logger } from "@/lib/logger";

/**
 * 从现有的日志表迁移数据到 TimescaleDB hypertables
 */
async function migrateToTimescale() {
  try {
    logger.info("开始迁移到 TimescaleDB...");

    // 1. 检查 TimescaleDB 扩展
    await checkTimescaleExtension();

    // 2. 创建新的 hypertables
    logger.info("创建 TimescaleDB hypertables...");
    await setupHypertables();

    // 3. 检查原始数据
    const loginLogCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM system_login_log
    `);

    const operationLogCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM system_operation_log
    `);

    logger.info(`原始登录日志数量: ${loginLogCount[0].count}`);
    logger.info(`原始操作日志数量: ${operationLogCount[0].count}`);

    // 4. 迁移登录日志数据
    if (Number(loginLogCount[0].count) > 0) {
      logger.info("开始迁移登录日志数据...");
      await db.execute(sql`
        INSERT INTO ts_login_log (
          id, user_id, username, domain, login_time, 
          ip, port, address, user_agent, request_id, 
          type, created_by, created_at
        )
        SELECT 
          id, user_id, username, domain, login_time,
          ip, port, address, user_agent, request_id,
          type, created_by, created_at
        FROM system_login_log 
        ORDER BY login_time
      `);
      logger.info("登录日志数据迁移完成");
    }

    // 5. 迁移操作日志数据
    if (Number(operationLogCount[0].count) > 0) {
      logger.info("开始迁移操作日志数据...");
      await db.execute(sql`
        INSERT INTO ts_operation_log (
          id, user_id, username, domain, module_name,
          description, request_id, method, url, ip,
          user_agent, params, body, response,
          start_time, end_time, duration, created_by, created_at
        )
        SELECT 
          id, user_id, username, domain, module_name,
          description, request_id, method, url, ip,
          user_agent, params, body, response,
          start_time, end_time, duration, created_by, created_at
        FROM system_operation_log 
        ORDER BY start_time
      `);
      logger.info("操作日志数据迁移完成");
    }

    // 6. 验证迁移结果
    const newLoginLogCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM ts_login_log
    `);

    const newOperationLogCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM ts_operation_log
    `);

    logger.info(`新登录日志数量: ${newLoginLogCount[0].count}`);
    logger.info(`新操作日志数量: ${newOperationLogCount[0].count}`);

    // 验证数据完整性
    if (loginLogCount[0].count !== newLoginLogCount[0].count) {
      throw new Error(`登录日志数据迁移不完整: 原始 ${loginLogCount[0].count}, 新 ${newLoginLogCount[0].count}`);
    }

    if (operationLogCount[0].count !== newOperationLogCount[0].count) {
      throw new Error(`操作日志数据迁移不完整: 原始 ${operationLogCount[0].count}, 新 ${newOperationLogCount[0].count}`);
    }

    logger.info("数据迁移验证通过");
    logger.info("TimescaleDB 迁移完成！");
  }
  catch (error) {
    logger.error({ error }, "TimescaleDB 迁移失败");
    throw error;
  }
}

/**
 * 创建原始表备份
 */
async function backupOriginalTables() {
  try {
    logger.info("创建原始表备份...");

    // 备份登录日志表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_login_log_backup AS 
      SELECT * FROM system_login_log
    `);

    // 备份操作日志表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_operation_log_backup AS 
      SELECT * FROM system_operation_log
    `);

    logger.info("原始表备份完成");
  }
  catch (error) {
    logger.error({ error }, "创建备份失败");
    throw error;
  }
}

/**
 * 清理原始表（谨慎使用）
 */
async function cleanupOriginalTables() {
  try {
    logger.info("清理原始表...");

    // 重命名原始表为旧表
    await db.execute(sql`
      ALTER TABLE system_login_log RENAME TO system_login_log_old
    `);

    await db.execute(sql`
      ALTER TABLE system_operation_log RENAME TO system_operation_log_old
    `);

    logger.info("原始表已重命名为 _old 后缀");
  }
  catch (error) {
    logger.error({ error }, "清理原始表失败");
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case "migrate":
        await migrateToTimescale();
        break;
      case "backup":
        await backupOriginalTables();
        break;
      case "cleanup":
        await cleanupOriginalTables();
        break;
      case "full":
        // 完整迁移流程
        await backupOriginalTables();
        await migrateToTimescale();
        logger.info("完整迁移流程完成，如需清理原始表请运行: tsx scripts/migrate-to-timescale.ts cleanup");
        break;
      default:
        logger.info("使用方法:");
        logger.info("tsx scripts/migrate-to-timescale.ts migrate  # 仅迁移数据");
        logger.info("tsx scripts/migrate-to-timescale.ts backup   # 仅创建备份");
        logger.info("tsx scripts/migrate-to-timescale.ts cleanup  # 清理原始表（重命名）");
        logger.info("tsx scripts/migrate-to-timescale.ts full     # 完整流程（备份+迁移）");
        process.exit(1);
    }

    process.exit(0);
  }
  catch (error) {
    logger.error({ error }, `命令 ${command} 执行失败`);
    process.exit(1);
  }
}

// 执行主函数
void main();
