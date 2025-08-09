import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

import db from "@/db";
import { systemJobHandlers } from "@/db/schema";
import { logger } from "@/lib/logger";
import { formatDate } from "@/utils/tools/formatter";

import type { JobHandlerMeta } from "./types";

import * as handlers from "./handlers";

/** 缓存文件路径和描述映射 */
let handlerCache: Record<string, { filePath: string; description: string }> | null = null;

/** 扫描处理器文件并建立映射 */
function scanHandlerFiles(): Record<string, { filePath: string; description: string }> {
  if (handlerCache) {
    return handlerCache;
  }

  const handlerMap: Record<string, { filePath: string; description: string }> = {};
  const handlersDir = path.join(process.cwd(), "src/jobs/handlers");

  try {
    // 递归扫描处理器目录
    const scanDirectory = (dir: string, relativePath: string = "") => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const fullPath = path.join(dir, file);
        const relativeFilePath = path.join(relativePath, file);

        if (fs.statSync(fullPath).isDirectory()) {
          scanDirectory(fullPath, relativeFilePath);
        }
        else if (file.endsWith(".ts") || file.endsWith(".js")) {
          // 读取文件内容
          const content = fs.readFileSync(fullPath, "utf-8");

          // 匹配导出的处理器函数和它们的注释
          const functionPattern = /(?:\/\*\*([\s\S]*?)\*\/\s*)?export\s+(?:async\s+)?(?:const|function)\s+(\w+Job)/g;
          let match;

          // eslint-disable-next-line no-cond-assign
          while ((match = functionPattern.exec(content)) !== null) {
            const [, comment, handlerName] = match;
            let description = `${handlerName} 任务处理器`;

            if (comment) {
              // 提取 JSDoc 注释中的描述
              const descMatch = comment.match(/@description\s+(.+)/i)
                || comment.match(/^\s*(?:\*\s*)?(.+)/m);
              if (descMatch) {
                description = descMatch[1].trim().replace(/^\*\s*/, "");
              }
            }

            handlerMap[handlerName] = {
              filePath: `src/jobs/handlers/${relativeFilePath}`,
              description,
            };
          }
        }
      }
    };

    if (fs.existsSync(handlersDir)) {
      scanDirectory(handlersDir);
    }
  }
  catch (error) {
    logger.error({ error }, "扫描处理器文件失败");
  }

  handlerCache = handlerMap;
  return handlerMap;
}

/** 根据处理器名称获取文件路径 */
function getHandlerFilePath(name: string): string {
  const handlerMap = scanHandlerFiles();
  return handlerMap[name]?.filePath || "src/jobs/handlers/index.ts";
}

/** 根据处理器名称获取描述 */
function getHandlerDescription(name: string): string {
  const handlerMap = scanHandlerFiles();
  return handlerMap[name]?.description || `${name} 任务处理器`;
}

/** 清除处理器缓存（开发时使用） */
export function clearHandlerCache(): void {
  handlerCache = null;
}

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

/** 同步处理器到数据库 */
export async function syncHandlersToDatabase(): Promise<void> {
  try {
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
            updatedAt: formatDate(new Date()),
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
            updatedAt: formatDate(new Date()),
            updatedBy: systemUserId,
          })
          .where(eq(systemJobHandlers.name, existingHandler.name));

        deactivatedCount++;
      }
    }

    logger.info({
      info: `添加: ${addedCount}, 更新: ${updatedCount}, 停用: ${deactivatedCount}`,
    }, "任务处理器同步完成");
  }
  catch (error) {
    logger.error({ error }, "同步任务处理器到数据库失败");
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
