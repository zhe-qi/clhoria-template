#!/usr/bin/env tsx
/* eslint-disable no-console */

import { and, eq } from "drizzle-orm";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { DictionaryItem } from "@/db/schema";

import db from "@/db";
import { sysDictionaries } from "@/db/schema";
import { clearDomainDictionaryCache, DEFAULT_DOMAIN } from "@/services/dictionary";

/**
 * 枚举定义接口
 */
interface EnumDefinition {
  name: string;
  description: string;
  items: DictionaryItem[];
  filePath: string;
}

/**
 * 同步结果
 */
interface SyncResult {
  scanned: number;
  created: number;
  updated: number;
  itemsAdded: number;
  itemsUpdated: number;
}

/**
 * 扫描项目中的枚举定义
 */
function scanEnumDefinitions(): EnumDefinition[] {
  const enumsPath = join(process.cwd(), "src/lib/enums");
  const enums: EnumDefinition[] = [];

  try {
    const files = readdirSync(enumsPath).filter(file => file.endsWith(".ts") && file !== "index.ts");

    for (const file of files) {
      const filePath = join(enumsPath, file);
      const content = readFileSync(filePath, "utf-8");

      const enumMatches = extractEnumsFromFile(content, filePath);
      enums.push(...enumMatches);
    }
  }
  catch (error) {
    console.warn("扫描枚举文件失败:", error);
  }

  return enums;
}

/**
 * 从文件内容中提取枚举定义
 */
function extractEnumsFromFile(content: string, filePath: string): EnumDefinition[] {
  const enums: EnumDefinition[] = [];

  // 匹配枚举定义的正则表达式
  const enumRegex = /\/\*\*([^*]|\*(?!\/))*\*\/\s*export\s+const\s+(\w+)\s*=\s*\{([^}]+)\}\s*as\s+const;/g;

  let match = enumRegex.exec(content);
  while (match !== null) {
    const [, description, name, body] = match;
    // 提取注释内容
    const cleanDescription = description.replace(/\/\*\*|\*\/|\*/g, "").trim();

    // 跳过非字典类型的枚举（如 Status, AuthType 等系统枚举）
    if (isSystemEnum(name)) {
      continue;
    }

    const items = parseEnumItems(body);

    if (items.length > 0) {
      enums.push({
        name,
        description: cleanDescription,
        items,
        filePath,
      });
    }
    match = enumRegex.exec(content);
  }

  return enums;
}

/**
 * 判断是否为系统枚举（不需要同步到字典）
 */
function isSystemEnum(name: string): boolean {
  const systemEnums = [
    "Status",
    "AuthType",
    "AppNameMenu",
    "CacheConstant",
    "PermissionResource",
    "PermissionAction",
    "TokenStatus",
  ];
  return systemEnums.includes(name);
}

/**
 * 解析枚举项
 */
function parseEnumItems(enumBody: string): DictionaryItem[] {
  const items: DictionaryItem[] = [];

  // 匹配枚举项的正则表达式
  const itemRegex = /\/\*\*([^*]|\*(?!\/))*\*\/\s*(\w+):\s*"([^"]+)"/g;

  let match = itemRegex.exec(enumBody);
  let sortOrder = 0;

  while (match !== null) {
    const [, description, code, value] = match;
    // 清理注释内容
    const cleanDescription = description.replace(/\/\*\*|\*\/|\*/g, "").trim();

    items.push({
      code,
      label: cleanDescription,
      value,
      description: cleanDescription,
      status: 1,
      sortOrder: sortOrder++,
    });
    match = itemRegex.exec(enumBody);
  }

  return items;
}

/**
 * 同步枚举到数据库
 */
async function syncEnumToDatabase(enumDef: EnumDefinition, domain: string): Promise<{
  created: boolean;
  itemsAdded: number;
  itemsUpdated: number;
}> {
  try {
    // 查找现有字典
    const [existing] = await db
      .select()
      .from(sysDictionaries)
      .where(and(
        eq(sysDictionaries.code, enumDef.name),
        eq(sysDictionaries.domain, domain),
      ));

    const syncUserId = "sync-script";
    let itemsAdded = 0;
    let itemsUpdated = 0;

    if (existing) {
      // 更新现有字典
      const existingItems = existing.items || [];
      const existingItemsMap = new Map(existingItems.map(item => [item.code, item]));

      // 合并字典项：以代码枚举为主，保留数据库中的自定义项
      const mergedItems: DictionaryItem[] = [];

      // 添加/更新来自代码的枚举项
      for (const newItem of enumDef.items) {
        const existingItem = existingItemsMap.get(newItem.code);

        if (existingItem) {
          // 更新现有项（保留手动修改的某些字段）
          mergedItems.push({
            ...existingItem,
            label: newItem.label, // 更新标签
            description: newItem.description, // 更新描述
            value: newItem.value, // 更新值
            sortOrder: newItem.sortOrder, // 更新排序
            // 保留 status, color, icon 等用户可能手动修改的字段
          });
          itemsUpdated++;
        }
        else {
          // 新增项
          mergedItems.push(newItem);
          itemsAdded++;
        }

        existingItemsMap.delete(newItem.code);
      }

      // 保留数据库中的自定义项（代码中不存在的项）
      for (const [, customItem] of existingItemsMap) {
        mergedItems.push(customItem);
      }

      // 按排序更新
      mergedItems.sort((a, b) => a.sortOrder - b.sortOrder);

      await db
        .update(sysDictionaries)
        .set({
          name: enumDef.name,
          description: enumDef.description,
          items: mergedItems,
          updatedBy: syncUserId,
          updatedAt: new Date(),
        })
        .where(and(
          eq(sysDictionaries.code, enumDef.name),
          eq(sysDictionaries.domain, domain),
        ));

      return { created: false, itemsAdded, itemsUpdated };
    }
    else {
      // 创建新字典
      await db
        .insert(sysDictionaries)
        .values({
          domain,
          code: enumDef.name,
          name: enumDef.name,
          description: enumDef.description,
          items: enumDef.items,
          status: 1,
          sortOrder: 0,
          createdBy: syncUserId,
        });

      return { created: true, itemsAdded: enumDef.items.length, itemsUpdated: 0 };
    }
  }
  catch (error) {
    console.error(`同步枚举 ${enumDef.name} 失败:`, error);
    throw error;
  }
}

/**
 * 主同步函数
 */
async function syncDictionaries(domain: string = DEFAULT_DOMAIN): Promise<SyncResult> {
  console.log("开始同步枚举到字典...");
  console.log(`目标域: ${domain}`);

  const startTime = Date.now();
  const result: SyncResult = {
    scanned: 0,
    created: 0,
    updated: 0,
    itemsAdded: 0,
    itemsUpdated: 0,
  };

  try {
    // 1. 扫描枚举定义
    console.log("\n1. 扫描项目枚举定义...");
    const enumDefinitions = scanEnumDefinitions();
    result.scanned = enumDefinitions.length;

    console.log(`发现 ${enumDefinitions.length} 个枚举定义:`);
    for (const def of enumDefinitions) {
      console.log(`  - ${def.name}: ${def.items.length} 项 (${def.filePath})`);
    }

    if (enumDefinitions.length === 0) {
      console.log("未发现可同步的枚举定义");
      return result;
    }

    // 2. 同步到数据库
    console.log("\n2. 同步枚举到数据库...");
    for (const enumDef of enumDefinitions) {
      console.log(`正在同步: ${enumDef.name}...`);

      const syncResult = await syncEnumToDatabase(enumDef, domain);

      if (syncResult.created) {
        result.created++;
        console.log(`  ✓ 创建字典: ${enumDef.name}`);
      }
      else {
        result.updated++;
        console.log(`  ✓ 更新字典: ${enumDef.name}`);
      }

      result.itemsAdded += syncResult.itemsAdded;
      result.itemsUpdated += syncResult.itemsUpdated;

      if (syncResult.itemsAdded > 0) {
        console.log(`    - 新增项: ${syncResult.itemsAdded}`);
      }
      if (syncResult.itemsUpdated > 0) {
        console.log(`    - 更新项: ${syncResult.itemsUpdated}`);
      }
    }

    // 3. 清除缓存
    console.log("\n3. 清除相关缓存...");
    await clearDomainDictionaryCache(domain);
    console.log("缓存清除完成");

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 输出总结
    console.log("\n同步完成！");
    console.log("=".repeat(50));
    console.log(`执行时间: ${duration}ms`);
    console.log(`扫描枚举: ${result.scanned} 个`);
    console.log(`创建字典: ${result.created} 个`);
    console.log(`更新字典: ${result.updated} 个`);
    console.log(`新增项目: ${result.itemsAdded} 个`);
    console.log(`更新项目: ${result.itemsUpdated} 个`);
    console.log("=".repeat(50));

    return result;
  }
  catch (error) {
    console.error("\n同步过程中出错:", error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const domain = process.argv[2] || DEFAULT_DOMAIN;
    await syncDictionaries(domain);
    process.exit(0);
  }
  catch (error) {
    console.error("同步失败:", error);
    process.exit(1);
  }
}

// 导出函数供其他模块使用
export { scanEnumDefinitions, syncDictionaries };

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
