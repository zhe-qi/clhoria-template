import { sql } from "drizzle-orm";

import db from "@/db";
import logger from "@/lib/logger";

/**
 * 创建 TimescaleDB 扩展
 */
export async function createTimescaleExtension() {
  try {
    logger.info("创建 TimescaleDB 扩展...");

    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS timescaledb`);

    logger.info("TimescaleDB 扩展创建成功");
  }
  catch (error) {
    logger.error({ error }, "创建 TimescaleDB 扩展失败");
    throw error;
  }
}

/**
 * 创建 TimescaleDB hypertables
 */
export async function setupHypertables() {
  try {
    logger.info("开始创建 TimescaleDB hypertables...");

    // 创建登录日志 hypertable
    await db.execute(sql`
      SELECT create_hypertable(
        'ts_login_log',
        'login_time',
        chunk_time_interval => INTERVAL '1 day',
        if_not_exists => true
      )
    `);
    logger.info("创建登录日志 hypertable 成功");

    // 创建操作日志 hypertable
    await db.execute(sql`
      SELECT create_hypertable(
        'ts_operation_log',
        'start_time',
        chunk_time_interval => INTERVAL '1 day',
        if_not_exists => true
      )
    `);
    logger.info("创建操作日志 hypertable 成功");

    // 设置数据保留策略（6个月）
    await addRetentionPolicies();

    logger.info("TimescaleDB hypertables 创建完成");
  }
  catch (error) {
    logger.error({ error }, "创建 TimescaleDB hypertables 失败");
    throw error;
  }
}

/**
 * 添加数据保留策略
 */
export async function addRetentionPolicies() {
  try {
    logger.info("设置数据保留策略...");

    // 登录日志保留6个月
    await db.execute(sql`
      SELECT add_retention_policy(
        'ts_login_log',
        INTERVAL '6 months',
        if_not_exists => true
      )
    `);

    // 操作日志保留6个月
    await db.execute(sql`
      SELECT add_retention_policy(
        'ts_operation_log',
        INTERVAL '6 months',
        if_not_exists => true
      )
    `);

    logger.info("数据保留策略设置完成");
  }
  catch (error) {
    logger.error({ error }, "设置数据保留策略失败");
    throw error;
  }
}

/**
 * 获取 hypertable 信息
 */
export async function getHypertableInfo() {
  try {
    const info = await db.execute(sql`
      SELECT
        hypertable_name,
        hypertable_schema,
        num_dimensions,
        num_chunks,
        compression_enabled,
        table_bytes,
        index_bytes,
        toast_bytes,
        total_bytes
      FROM timescaledb_information.hypertables
      WHERE hypertable_schema = 'public'
      ORDER BY hypertable_name
    `);

    return info;
  }
  catch (error) {
    logger.error({ error }, "获取 hypertable 信息失败");
    throw error;
  }
}

/**
 * 获取 chunk 统计信息
 */
export async function getChunkStats() {
  try {
    const stats = await db.execute(sql`
      SELECT
        hypertable_name,
        COUNT(*) as chunk_count,
        pg_size_pretty(SUM(chunk_size)) as total_size,
        MIN(range_start) as oldest_chunk,
        MAX(range_end) as newest_chunk
      FROM timescaledb_information.chunks
      WHERE hypertable_schema = 'public'
      GROUP BY hypertable_name
      ORDER BY hypertable_name
    `);

    return stats;
  }
  catch (error) {
    logger.error({ error }, "获取 chunk 统计信息失败");
    throw error;
  }
}

/**
 * 压缩旧数据以节省存储空间
 */
export async function compressOldData() {
  try {
    logger.info("开始压缩旧数据...");

    // 压缩 7 天前的登录日志数据
    await db.execute(sql`
      SELECT add_compression_policy(
        'ts_login_log',
        INTERVAL '7 days',
        if_not_exists => true
      )
    `);

    // 压缩 7 天前的操作日志数据
    await db.execute(sql`
      SELECT add_compression_policy(
        'ts_operation_log',
        INTERVAL '7 days',
        if_not_exists => true
      )
    `);

    logger.info("数据压缩策略设置完成");
  }
  catch (error) {
    logger.error({ error }, "设置数据压缩策略失败");
    throw error;
  }
}

/**
 * 检查 TimescaleDB 扩展是否已安装
 */
export async function checkTimescaleExtension() {
  try {
    const result = await db.execute(sql`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname = 'timescaledb'
    `);

    if (result.length === 0) {
      throw new Error("TimescaleDB 扩展未安装");
    }

    logger.info(`TimescaleDB 扩展已安装，版本: ${result[0].extversion}`);
    return result[0];
  }
  catch (error) {
    logger.error({ error }, "检查 TimescaleDB 扩展失败");
    throw error;
  }
}
