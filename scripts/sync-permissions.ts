#!/usr/bin/env tsx

import { differenceInMilliseconds } from "date-fns";
import { eq } from "drizzle-orm";

import { adminApp, clientApp, publicApp } from "@/app";
import db from "@/db";
import { casbinRule } from "@/db/schema";
import logger from "@/lib/logger";
import { collectAndSyncEndpointPermissions, PermissionConfigManager } from "@/lib/permissions";

/**
 * 第一步：收集和同步端点权限
 */
async function syncEndpointsWithNewSystem() {
  logger.info("第一步：收集端点...");

  const apps = [
    { name: "public", app: publicApp, prefix: "" },
    { name: "client", app: clientApp, prefix: "" },
    { name: "admin", app: adminApp, prefix: "/admin" },
  ];

  const result = await collectAndSyncEndpointPermissions(apps);
  logger.info(`端点同步完成: 新增 ${result.inserted}, 更新 ${result.updated}`);

  return result;
}

/**
 * 第二步：为超级管理员分配所有权限
 */
async function assignPermissionsToSuperAdmin() {
  logger.info("第二步：为超级管理员分配权限...");

  try {
    // 查找超级管理员角色
    const superRole = await db.query.systemRole.findFirst({
      where: (table, { eq }) => eq(table.code, "ROLE_SUPER"),
    });

    if (!superRole) {
      logger.error("未找到超级管理员角色 (ROLE_SUPER)");
      return { added: 0 };
    }

    logger.info(`找到超级管理员角色: ${superRole.name} (ID: ${superRole.id})`);

    // 从权限管理器获取所有端点权限
    const permissionManager = PermissionConfigManager.getInstance();
    const allEndpointPermissions = permissionManager.getAllEndpointPermissions();

    logger.info(`从权限管理器获取到 ${allEndpointPermissions.length} 个端点权限`);

    if (allEndpointPermissions.length === 0) {
      logger.warn("权限管理器中没有端点权限，请先运行端点收集");
      return { added: 0 };
    }

    // 获取现有的超级管理员权限
    const existingRules = await db
      .select()
      .from(casbinRule)
      .where(eq(casbinRule.v0, superRole.id));

    // 创建权限映射
    const existingPermissions = new Set(
      existingRules.map(rule => `${rule.v1}:${rule.v2}`),
    );

    // 收集需要添加的权限
    const newPermissions: Array<{
      resource: string;
      action: string;
    }> = [];

    for (const endpoint of allEndpointPermissions) {
      const permissionKey = `${endpoint.resource}:${endpoint.action}`;

      if (!existingPermissions.has(permissionKey)) {
        newPermissions.push({
          resource: endpoint.resource,
          action: endpoint.action,
        });
        logger.debug(`需要添加权限: ${permissionKey}`);
      }
    }

    // 添加缺失的权限
    if (newPermissions.length > 0) {
      const rulesToInsert = newPermissions.map(perm => ({
        ptype: "p" as const,
        v0: superRole.id,
        v1: perm.resource,
        v2: perm.action,
        v3: "default",
        v4: null,
        v5: null,
      }));

      await db.insert(casbinRule).values(rulesToInsert);
      logger.info(`添加了 ${newPermissions.length} 条新权限`);
    }
    else {
      logger.info("所有权限已存在，无需添加");
    }

    return { added: newPermissions.length };
  }
  catch (error) {
    logger.error({ error }, "权限分配失败");
    throw error;
  }
}

/**
 * 第三步：验证权限完整性
 */
async function validatePermissionIntegrity() {
  logger.info("第三步：验证权限完整性...");

  try {
    // 获取所有权限规则
    const rules = await db
      .select()
      .from(casbinRule)
      .where(eq(casbinRule.ptype, "p"));

    // 从权限管理器获取所有端点权限
    const permissionManager = PermissionConfigManager.getInstance();
    const allEndpointPermissions = permissionManager.getAllEndpointPermissions();

    // 创建端点映射
    const endpointMap = new Map<string, boolean>();
    for (const endpoint of allEndpointPermissions) {
      endpointMap.set(`${endpoint.resource}:${endpoint.action}`, true);
    }

    // 验证每个权限规则
    let validCount = 0;
    let invalidCount = 0;
    const invalidRules: string[] = [];

    for (const rule of rules) {
      const permissionKey = `${rule.v1}:${rule.v2}`;

      if (endpointMap.has(permissionKey)) {
        validCount++;
      }
      else {
        invalidCount++;
        invalidRules.push(`${permissionKey} (角色: ${rule.v0})`);
      }
    }

    logger.info(`
验证结果:`);
    logger.info(`- 有效权限: ${validCount}`);
    logger.info(`- 无效权限: ${invalidCount}`);
    logger.info(`- 端点总数: ${allEndpointPermissions.length}`);

    if (invalidCount > 0) {
      logger.warn(`
发现 ${invalidCount} 个无效权限规则:`);
      invalidRules.forEach(rule => logger.warn(`  - ${rule}`));
      logger.warn("建议：这些权限可能对应已删除的端点，考虑清理");
    }
    else {
      logger.info("所有权限规则都有对应的端点");
    }

    return { valid: validCount, invalid: invalidCount };
  }
  catch (error) {
    logger.error({ error }, "权限验证失败");
    throw error;
  }
}

/**
 * 第四步：生成权限报告
 */
async function generatePermissionReport() {
  logger.info("第四步：生成权限报告...");

  const permissionManager = PermissionConfigManager.getInstance();
  const allEndpointPermissions = permissionManager.getAllEndpointPermissions();

  // 按资源分组
  const groupedByResource = allEndpointPermissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, typeof allEndpointPermissions>);

  logger.info("权限覆盖情况报告:");
  Object.entries(groupedByResource).forEach(([resource, permissions]) => {
    const actions = [...new Set(permissions.map(p => p.action))];
    logger.info(`
${resource}:`);
    logger.info(`   - 端点数量: ${permissions.length}`);
    logger.info(`   - 支持动作: ${actions.join(", ")}`);
    logger.info(`   - 控制器: ${[...new Set(permissions.map(p => p.controller))].join(", ")}`);
  });

  return groupedByResource;
}

/**
 * 主函数：执行完整的权限同步流程
 */
async function main() {
  logger.info("开始现代化权限同步...");

  try {
    const startTime = new Date();

    // 执行四个步骤
    const syncResult = await syncEndpointsWithNewSystem();
    const assignResult = await assignPermissionsToSuperAdmin();
    const validateResult = await validatePermissionIntegrity();
    const reportResult = await generatePermissionReport();

    const endTime = new Date();
    const duration = differenceInMilliseconds(endTime, startTime);

    // 最终总结
    logger.info("权限同步完成!");
    logger.info("=".repeat(50));
    logger.info(`执行时间: ${duration}ms`);
    logger.info(`端点同步: 新增 ${syncResult.inserted}, 更新 ${syncResult.updated}`);
    logger.info(`权限分配: 新增 ${assignResult.added} 条超管权限`);
    logger.info(`权限验证: ${validateResult.valid} 有效, ${validateResult.invalid} 无效`);
    logger.info(`资源模块: ${Object.keys(reportResult).length} 个`);
    logger.info("=".repeat(50));

    if (validateResult.invalid > 0) {
      logger.warn("建议运行权限清理来移除无效规则");
      process.exit(1);
    }
    else {
      logger.info("权限系统完全健康!");
      process.exit(0);
    }
  }
  catch (error) {
    logger.error({ error }, "权限同步失败");
    process.exit(1);
  }
}

// 导出函数供其他模块使用
export {
  assignPermissionsToSuperAdmin,
  generatePermissionReport,
  syncEndpointsWithNewSystem,
  validatePermissionIntegrity,
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
