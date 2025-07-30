/* eslint-disable no-console */
import db from "@/db";
import { casbinRule } from "@/db/schema";

/**
 * 初始化 Casbin 权限规则
 * 注意：在实际应用中，Casbin 规则通常由权限同步脚本自动管理
 * 这里只是提供一个空的初始化函数，避免迁移脚本报错
 */
export async function initCasbinRule(): Promise<void> {
  try {
    // 检查是否已有规则数据
    const existingRules = await db.select().from(casbinRule).limit(1);
    
    if (existingRules.length === 0) {
      console.log("Casbin 权限规则表为空，将由权限同步脚本自动填充");
      // 不需要手动插入数据，权限规则由 sync-permissions.ts 脚本管理
    } else {
      console.log("Casbin 权限规则已存在，跳过初始化");
    }
    
    console.log("Casbin 权限规则初始化完成");
  } catch (error) {
    console.error("Casbin 权限规则初始化失败:", error);
    throw error;
  }
}