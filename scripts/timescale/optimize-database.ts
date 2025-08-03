#!/usr/bin/env tsx

import { optimizeForWrites, showCurrentConfig } from "@/db/timescale";
import { logger } from "@/lib/logger";

/**
 * 数据库性能优化脚本
 */
async function optimizeDatabase() {
  try {
    logger.info("开始数据库性能优化...");

    // 显示当前配置
    logger.info("当前数据库配置:");
    const currentConfig = await showCurrentConfig();
    // eslint-disable-next-line no-console
    console.table(currentConfig);

    // 优化配置
    await optimizeForWrites();

    // 显示优化后的配置
    logger.info("优化后的数据库配置:");
    const newConfig = await showCurrentConfig();
    // eslint-disable-next-line no-console
    console.table(newConfig);

    logger.info("数据库性能优化完成");
    process.exit(0);
  }
  catch (error) {
    logger.error({ error }, "数据库性能优化失败");
    process.exit(1);
  }
}

// 执行优化
void optimizeDatabase();
