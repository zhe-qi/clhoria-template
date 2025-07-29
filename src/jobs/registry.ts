import { eq } from "drizzle-orm";

import db from "@/db";
import { systemJobHandlers } from "@/db/schema";
import { logger } from "@/lib/logger";

import type { JobHandlerMeta } from "./types";

import * as handlers from "./handlers";

/** 获取所有注册的处理器 */
export function getRegisteredHandlers(): JobHandlerMeta[] {
  const handlerEntries = Object.entries(handlers);

  return handlerEntries.map(([name, handler]) => ({
    name,
    description: getHandlerDescription(name),
    handler,
    filePath: getHandlerFilePath(name),
  }));
}

/** 根据处理器名称获取描述 */
function getHandlerDescription(name: string): string {
  const descriptions: Record<string, string> = {
    helloWorldJob: "Hello World 示例任务，用于测试定时任务功能",
    systemCleanupJob: "系统清理任务，清理临时文件、过期日志和缓存数据",
    dataBackupJob: "数据备份任务，执行数据库和文件系统的备份操作",
    reportGenerationJob: "报表生成任务，生成各类业务报表",
    emailSendJob: "邮件发送任务，批量发送邮件通知",
  };

  return descriptions[name] || `${name} 任务处理器`;
}

/** 根据处理器名称获取文件路径 */
function getHandlerFilePath(name: string): string {
  // 这里可以通过更复杂的逻辑来确定文件路径
  // 目前简化处理，都指向 example-jobs.ts
  if (["helloWorldJob", "systemCleanupJob", "dataBackupJob", "reportGenerationJob", "emailSendJob"].includes(name)) {
    return "src/jobs/handlers/example-jobs.ts";
  }

  return "src/jobs/handlers/index.ts";
}

/** 同步处理器到数据库 */
export async function syncHandlersToDatabase(): Promise<void> {
  try {
    logger.debug("开始同步任务处理器到数据库");

    const registeredHandlers = getRegisteredHandlers();
    const systemUserId = "system"; // 系统用户ID

    // 获取数据库中现有的处理器
    const existingHandlers = await db.select().from(systemJobHandlers);
    const existingNames = new Set(existingHandlers.map(h => h.name));

    let addedCount = 0;
    let updatedCount = 0;
    let deactivatedCount = 0;

    // 添加或更新处理器
    for (const handler of registeredHandlers) {
      if (existingNames.has(handler.name)) {
        // 更新现有处理器
        await db
          .update(systemJobHandlers)
          .set({
            description: handler.description,
            filePath: handler.filePath,
            isActive: true,
            updatedAt: new Date().toISOString(),
            updatedBy: systemUserId,
          })
          .where(eq(systemJobHandlers.name, handler.name));

        updatedCount++;
      }
      else {
        // 添加新处理器
        await db.insert(systemJobHandlers).values({
          name: handler.name,
          description: handler.description,
          filePath: handler.filePath,
          isActive: true,
          createdBy: systemUserId,
          updatedBy: systemUserId,
        });

        addedCount++;
      }
    }

    // 标记不再存在的处理器为非活跃状态
    const registeredNames = new Set(registeredHandlers.map(h => h.name));
    for (const existingHandler of existingHandlers) {
      if (!registeredNames.has(existingHandler.name) && existingHandler.isActive) {
        await db
          .update(systemJobHandlers)
          .set({
            isActive: false,
            updatedAt: new Date().toISOString(),
            updatedBy: systemUserId,
          })
          .where(eq(systemJobHandlers.name, existingHandler.name));

        deactivatedCount++;
      }
    }

    logger.info("任务处理器同步完成", {
      totalRegistered: registeredHandlers.length,
      added: addedCount,
      updated: updatedCount,
      deactivated: deactivatedCount,
    });
  }
  catch (error) {
    logger.error("同步任务处理器到数据库失败", { error });
    throw error;
  }
}

/** 根据名称获取处理器 */
export function getHandlerByName(name: string) {
  return handlers[name as keyof typeof handlers];
}

/** 检查处理器是否存在 */
export function isHandlerExists(name: string): boolean {
  return getHandlerByName(name) !== undefined;
}

/** 获取所有可用的处理器名称 */
export function getAvailableHandlerNames(): string[] {
  return getRegisteredHandlers().map(h => h.name);
}

/** 验证处理器名称 */
export function validateHandlerName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== "string") {
    return { isValid: false, error: "处理器名称不能为空" };
  }

  if (!isHandlerExists(name)) {
    return { isValid: false, error: `处理器 '${name}' 不存在` };
  }

  return { isValid: true };
}
