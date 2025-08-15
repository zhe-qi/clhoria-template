import { sql } from "drizzle-orm";

import db from "@/db";
import logger from "@/lib/logger";

/**
 * 优化 PostgreSQL 和 TimescaleDB 配置以提升写入性能
 */
export async function optimizeForWrites() {
  try {
    logger.info("开始优化数据库配置...");

    // 内存相关配置
    await db.execute(sql`
      ALTER SYSTEM SET shared_buffers = '1GB'
    `);

    await db.execute(sql`
      ALTER SYSTEM SET effective_cache_size = '3GB'
    `);

    await db.execute(sql`
      ALTER SYSTEM SET work_mem = '32MB'
    `);

    await db.execute(sql`
      ALTER SYSTEM SET maintenance_work_mem = '512MB'
    `);

    // WAL 相关配置（提升写入性能）
    await db.execute(sql`
      ALTER SYSTEM SET wal_buffers = '32MB'
    `);

    await db.execute(sql`
      ALTER SYSTEM SET checkpoint_completion_target = 0.9
    `);

    await db.execute(sql`
      ALTER SYSTEM SET checkpoint_timeout = '15min'
    `);

    await db.execute(sql`
      ALTER SYSTEM SET max_wal_size = '4GB'
    `);

    await db.execute(sql`
      ALTER SYSTEM SET min_wal_size = '1GB'
    `);

    // 连接和并发配置
    await db.execute(sql`
      ALTER SYSTEM SET max_connections = 200
    `);

    await db.execute(sql`
      ALTER SYSTEM SET max_worker_processes = 8
    `);

    await db.execute(sql`
      ALTER SYSTEM SET max_parallel_workers = 8
    `);

    await db.execute(sql`
      ALTER SYSTEM SET max_parallel_workers_per_gather = 4
    `);

    // 日志配置
    await db.execute(sql`
      ALTER SYSTEM SET log_min_duration_statement = 1000
    `);

    await db.execute(sql`
      ALTER SYSTEM SET log_checkpoints = on
    `);

    await db.execute(sql`
      ALTER SYSTEM SET log_statement_stats = off
    `);

    // TimescaleDB 特定配置
    await db.execute(sql`
      ALTER SYSTEM SET timescaledb.max_background_workers = 8
    `);

    // 重载配置
    await db.execute(sql`SELECT pg_reload_conf()`);

    logger.info("数据库配置优化完成");
  }
  catch (error) {
    logger.error({ error }, "数据库配置优化失败");
    throw error;
  }
}

/**
 * 查看当前数据库配置
 */
export async function showCurrentConfig() {
  try {
    const configs = await db.execute(sql`
      SELECT name, setting, unit, context, short_desc
      FROM pg_settings
      WHERE name IN (
        'shared_buffers',
        'effective_cache_size',
        'work_mem',
        'maintenance_work_mem',
        'wal_buffers',
        'checkpoint_completion_target',
        'checkpoint_timeout',
        'max_wal_size',
        'min_wal_size',
        'max_connections',
        'max_worker_processes',
        'max_parallel_workers',
        'max_parallel_workers_per_gather',
        'log_min_duration_statement',
        'timescaledb.max_background_workers'
      )
      ORDER BY name
    `);

    return configs;
  }
  catch (error) {
    logger.error({ error }, "获取数据库配置失败");
    throw error;
  }
}

/**
 * 重置配置为默认值
 */
export async function resetToDefaults() {
  try {
    logger.info("重置数据库配置为默认值...");

    const configs = [
      "shared_buffers",
      "effective_cache_size",
      "work_mem",
      "maintenance_work_mem",
      "wal_buffers",
      "checkpoint_completion_target",
      "checkpoint_timeout",
      "max_wal_size",
      "min_wal_size",
      "max_connections",
      "max_worker_processes",
      "max_parallel_workers",
      "max_parallel_workers_per_gather",
      "log_min_duration_statement",
      "log_checkpoints",
      "log_statement_stats",
      "timescaledb.max_background_workers",
    ];

    for (const config of configs) {
      await db.execute(sql`ALTER SYSTEM RESET ${sql.raw(config)}`);
    }

    // 重载配置
    await db.execute(sql`SELECT pg_reload_conf()`);

    logger.info("数据库配置已重置为默认值");
  }
  catch (error) {
    logger.error({ error }, "重置数据库配置失败");
    throw error;
  }
}
