#!/usr/bin/env tsx

import { v7 as uuidV7 } from "uuid";

import logger from "@/lib/logger";
import { TimescaleLogService } from "@/services/logging";
import { formatDate } from "@/utils/tools/formatter";

/**
 * 测试 TimescaleDB 写入功能
 */
async function testTimescaleDB() {
  try {
    logger.info("开始测试 TimescaleDB 写入功能...");

    // 测试登录日志写入
    logger.info("测试登录日志写入...");
    for (let i = 0; i < 10; i++) {
      await TimescaleLogService.addLoginLog({
        id: uuidV7(),
        userId: uuidV7(),
        username: `test_user_${i}`,
        domain: "default",
        loginTime: formatDate(new Date()),
        ip: "192.168.1.100",
        port: 443,
        address: "北京市",
        userAgent: "Mozilla/5.0 (Test)",
        requestId: uuidV7(),
        type: "SUCCESS",
        createdBy: "system",
        createdAt: formatDate(new Date()),
      });
    }

    // 测试操作日志写入
    logger.info("测试操作日志写入...");
    for (let i = 0; i < 10; i++) {
      await TimescaleLogService.addOperationLog({
        id: uuidV7(),
        userId: uuidV7(),
        username: `test_user_${i}`,
        domain: "default",
        moduleName: "测试模块",
        description: `测试操作 ${i}`,
        requestId: uuidV7(),
        method: "GET",
        url: `/test/${i}`,
        ip: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Test)",
        params: { test: true, index: i },
        body: null,
        response: { success: true, data: `result_${i}` },
        startTime: formatDate(new Date()),
        endTime: formatDate(new Date(Date.now() + 100)),
        duration: 100,
        createdBy: "system",
        createdAt: formatDate(new Date()),
      });
    }

    // 等待一会儿再查询数据
    logger.info("等待 1 秒后查询数据...");
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 查询登录日志
    const loginLogs = await TimescaleLogService.getRecentLoginLogs("default", 1);
    logger.info(`查询到 ${loginLogs.length} 条登录日志`);

    // 查询操作日志
    const operationLogs = await TimescaleLogService.getRecentOperationLogs("default", 1);
    logger.info(`查询到 ${operationLogs.length} 条操作日志`);

    logger.info("TimescaleDB 测试完成！");
    process.exit(0);
  }
  catch (error) {
    logger.error({ error }, "TimescaleDB 测试失败");
    process.exit(1);
  }
}

// 执行测试
void testTimescaleDB();
