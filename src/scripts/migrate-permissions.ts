import { eq } from "drizzle-orm";

import db from "@/db";
import { casbinRule, sysEndpoint } from "@/db/schema";

/**
 * 权限数据迁移脚本
 * 将现有的URL路径+HTTP方法权限转换为业务资源+动作权限
 */
async function migratePermissions() {
  console.log("开始权限数据迁移...");

  try {
    // 获取所有现有的权限规则
    const existingRules = await db.select().from(casbinRule).where(eq(casbinRule.ptype, "p"));

    console.log(`找到 ${existingRules.length} 条权限规则`);

    const toUpdate: Array<{
      id: string;
      resource: string;
      action: string;
    }> = [];

    const toDelete: string[] = [];

    // 获取所有端点信息
    const endpoints = await db.select().from(sysEndpoint);
    const endpointMap = new Map<string, { resource: string; action: string }>();

    for (const endpoint of endpoints) {
      const key = `${endpoint.method}:${endpoint.path}`;
      endpointMap.set(key, {
        resource: endpoint.resource,
        action: endpoint.action,
      });
    }

    // 处理每个权限规则
    for (const rule of existingRules) {
      if (!rule.v1 || !rule.v2) {
        console.warn(`跳过无效规则: ${rule.id}`);
        continue;
      }

      // 尝试从端点数据中查找对应的权限
      const endpointKey = `${rule.v2}:${rule.v1}`;
      const endpoint = endpointMap.get(endpointKey);

      if (endpoint) {
        // 找到端点，准备更新
        toUpdate.push({
          id: rule.id,
          resource: endpoint.resource,
          action: endpoint.action,
        });
        console.log(`映射: ${rule.v2} ${rule.v1} -> ${endpoint.resource}:${endpoint.action}`);
      }
      else {
        // 没有找到端点，标记为删除
        toDelete.push(rule.id);
        console.warn(`无法映射，将删除: ${rule.v2} ${rule.v1}`);
      }
    }

    // 执行更新
    if (toUpdate.length > 0) {
      console.log(`更新 ${toUpdate.length} 条权限规则...`);

      await db.transaction(async (tx) => {
        for (const update of toUpdate) {
          await tx
            .update(casbinRule)
            .set({
              v1: update.resource,
              v2: update.action,
            })
            .where(eq(casbinRule.id, update.id));
        }
      });

      console.log("权限规则更新完成");
    }

    // 执行删除
    if (toDelete.length > 0) {
      console.log(`删除 ${toDelete.length} 条无效权限规则...`);

      await db.transaction(async (tx) => {
        for (const id of toDelete) {
          await tx.delete(casbinRule).where(eq(casbinRule.id, id));
        }
      });

      console.log("无效权限规则删除完成");
    }

    console.log("权限数据迁移完成！");
    console.log(`统计: 更新 ${toUpdate.length} 条，删除 ${toDelete.length} 条`);
  }
  catch (error) {
    console.error("权限数据迁移失败:", error);
    throw error;
  }
}

/**
 * 创建超级管理员权限
 */
async function createSuperAdminPermissions() {
  console.log("创建超级管理员权限...");

  try {
    // 查找超级管理员角色
    const superRole = await db.query.sysRole.findFirst({
      where: (table, { eq }) => eq(table.code, "SUPER_ADMIN"),
    });

    if (!superRole) {
      console.warn("未找到超级管理员角色，跳过权限创建");
      return;
    }

    // 获取所有端点信息
    const endpoints = await db.select().from(sysEndpoint);
    const permissionSet = new Set<string>();

    // 收集所有唯一的权限
    for (const endpoint of endpoints) {
      if (endpoint.resource && endpoint.action) {
        permissionSet.add(`${endpoint.resource}:${endpoint.action}`);
      }
    }

    console.log(`创建 ${permissionSet.size} 个权限...`);

    // 创建权限规则
    const permissionRules = Array.from(permissionSet).map((permission) => {
      const [resource, action] = permission.split(":");
      return {
        ptype: "p",
        v0: superRole.id,
        v1: resource,
        v2: action,
        v3: "built-in",
        v4: "allow",
        v5: null,
      };
    });

    // 清除现有权限并插入新权限
    await db.transaction(async (tx) => {
      // 删除现有的超级管理员权限
      await tx
        .delete(casbinRule)
        .where(eq(casbinRule.v0, superRole.id));

      // 插入新权限
      if (permissionRules.length > 0) {
        await tx.insert(casbinRule).values(permissionRules);
      }
    });

    console.log("超级管理员权限创建完成！");
  }
  catch (error) {
    console.error("创建超级管理员权限失败:", error);
    throw error;
  }
}

// 执行迁移
async function main() {
  try {
    await migratePermissions();
    await createSuperAdminPermissions();
    console.log("所有迁移任务完成！");
  }
  catch (error) {
    console.error("迁移失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createSuperAdminPermissions, migratePermissions };
