#!/usr/bin/env tsx

import { checkTimescaleExtension, createTimescaleExtension, setupHypertables } from "@/db/timescale";
import logger from "@/lib/logger";

/**
 * TimescaleDB 初始化脚本
 * 用于创建扩展、hypertables 和设置相关策略
 */
async function initTimescaleDB() {
  try {
    logger.info("开始初始化 TimescaleDB...");

    // 首先尝试检查扩展，如果不存在则创建
    try {
      await checkTimescaleExtension();
    }
    catch {
      logger.info("TimescaleDB 扩展未安装，正在创建...");
      await createTimescaleExtension();
      await checkTimescaleExtension();
    }

    // 创建 hypertables
    await setupHypertables();

    logger.info("TimescaleDB 初始化完成");
    process.exit(0);
  }
  catch (error) {
    logger.error({ error }, "TimescaleDB 初始化失败");
    process.exit(1);
  }
}

// 执行初始化
void initTimescaleDB();
