#!/usr/bin/env tsx
/* eslint-disable no-console */

import { adminApp, clientApp, publicApp } from "@/app";
import { collectAndSyncEndpointPermissions } from "@/lib/collect-endpoints";
import { PermissionConfigManager } from "@/lib/permission-config";

async function testPermissionSystem() {
  console.log("🚀 开始测试新的权限系统...\n");

  try {
    // 1. 测试端点权限收集
    console.log("📋 步骤 1: 测试端点权限收集");
    const apps = [
      { name: "public", app: publicApp, prefix: "" },
      { name: "client", app: clientApp, prefix: "" },
      { name: "admin", app: adminApp, prefix: "/admin" },
    ];

    const result = await collectAndSyncEndpointPermissions(apps);
    console.log(`✅ 端点权限收集完成: 新增 ${result.inserted}, 更新 ${result.updated}\n`);

    // 2. 测试权限管理器缓存
    console.log("🗂️  步骤 2: 测试权限管理器缓存");
    const permissionManager = PermissionConfigManager.getInstance();
    const stats = permissionManager.getStats();
    console.log(`📊 缓存统计: 端点数=${stats.endpointCount}, 路由数=${stats.routeCount}`);

    // 3. 测试具体权限查找
    console.log("\n🔍 步骤 3: 测试权限查找");
    const testCases = [
      { method: "GET", path: "/admin/sys-roles" },
      { method: "POST", path: "/admin/sys-roles" },
      { method: "GET", path: "/admin/sys-users" },
      { method: "POST", path: "/admin/sys-users" },
      { method: "DELETE", path: "/admin/sys-roles/{id}" },
    ];

    for (const testCase of testCases) {
      const endpointPermission = permissionManager.findEndpointPermission(testCase.method, testCase.path);
      const routePermission = permissionManager.findRoutePermission(testCase.method, testCase.path);

      console.log(`\n🔗 ${testCase.method} ${testCase.path}:`);
      if (endpointPermission) {
        console.log(`   ✅ 端点权限: ${endpointPermission.resource}:${endpointPermission.action}`);
        console.log(`   📝 操作ID: ${endpointPermission.operationId}`);
        console.log(`   🏷️  控制器: ${endpointPermission.controller}`);
      }
      else {
        console.log(`   ❌ 未找到端点权限`);
      }

      if (routePermission) {
        console.log(`   ✅ 路由权限: ${routePermission.resource}:${routePermission.action}`);
      }
      else {
        console.log(`   ❌ 未找到路由权限`);
      }
    }

    // 4. 显示所有收集到的端点权限
    console.log("\n📋 步骤 4: 所有收集到的端点权限");
    const allPermissions = permissionManager.getAllEndpointPermissions();
    const groupedByResource = allPermissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, typeof allPermissions>);

    Object.entries(groupedByResource).forEach(([resource, permissions]) => {
      console.log(`\n🏷️  资源: ${resource}`);
      permissions.forEach((perm) => {
        console.log(`   - ${perm.method} ${perm.path} → ${perm.action} (${perm.operationId})`);
      });
    });

    console.log(`\n🎉 权限系统测试完成! 共收集到 ${allPermissions.length} 个端点权限`);
  }
  catch (error) {
    console.error("❌ 权限系统测试失败:", error);
    process.exit(1);
  }
}

// 运行测试
async function main() {
  try {
    await testPermissionSystem();
    console.log("\n✨ 测试脚本执行完成");
    process.exit(0);
  }
  catch (error) {
    console.error("💥 测试脚本执行失败:", error);
    process.exit(1);
  }
}

// 执行主函数
main();

export { testPermissionSystem };
