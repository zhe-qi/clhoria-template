/* eslint-disable no-console */
import { eq, and } from "drizzle-orm";

import db from "@/db";
import { systemDictionaries } from "@/db/schema";
import type { DictionaryItem } from "@/db/schema";

/**
 * 初始化系统字典数据
 */
export async function initSysDictionaries() {
  const defaultDomain = "default";
  const seedUserId = "seed-init";

  // 系统状态字典
  const statusDictionary = {
    code: "SYSTEM_STATUS",
    name: "系统状态",
    description: "系统通用状态字典",
    items: [
      {
        code: "ENABLED",
        label: "启用",
        value: "1",
        description: "启用状态",
        color: "#52c41a",
        status: 1,
        sortOrder: 0,
      },
      {
        code: "DISABLED",
        label: "禁用",
        value: "0",
        description: "禁用状态",
        color: "#d9d9d9",
        status: 1,
        sortOrder: 1,
      },
      {
        code: "BANNED",
        label: "封禁",
        value: "-1",
        description: "封禁状态",
        color: "#ff4d4f",
        status: 1,
        sortOrder: 2,
      },
    ] as DictionaryItem[],
    status: 1,
    sortOrder: 0,
    createdBy: seedUserId,
  };

  // 用户性别字典
  const genderDictionary = {
    code: "USER_GENDER",
    name: "用户性别",
    description: "用户性别字典",
    items: [
      {
        code: "MALE",
        label: "男",
        value: "M",
        description: "男性",
        color: "#1890ff",
        icon: "male",
        status: 1,
        sortOrder: 0,
      },
      {
        code: "FEMALE",
        label: "女",
        value: "F",
        description: "女性",
        color: "#eb2f96",
        icon: "female",
        status: 1,
        sortOrder: 1,
      },
      {
        code: "UNKNOWN",
        label: "未知",
        value: "U",
        description: "未知性别",
        color: "#d9d9d9",
        icon: "question",
        status: 1,
        sortOrder: 2,
      },
    ] as DictionaryItem[],
    status: 1,
    sortOrder: 1,
    createdBy: seedUserId,
  };

  // 认证类型字典
  const authTypeDictionary = {
    code: "AUTH_TYPE",
    name: "认证类型",
    description: "系统认证方式字典",
    items: [
      {
        code: "PASSWORD",
        label: "密码认证",
        value: "PASSWORD",
        description: "用户名密码认证",
        color: "#1890ff",
        icon: "lock",
        status: 1,
        sortOrder: 0,
      },
      {
        code: "SMS",
        label: "短信验证码",
        value: "SMS",
        description: "手机短信验证码认证",
        color: "#52c41a",
        icon: "message",
        status: 1,
        sortOrder: 1,
      },
      {
        code: "EMAIL",
        label: "邮箱验证码",
        value: "EMAIL",
        description: "邮箱验证码认证",
        color: "#faad14",
        icon: "mail",
        status: 1,
        sortOrder: 2,
      },
      {
        code: "OAUTH",
        label: "第三方OAuth",
        value: "OAUTH",
        description: "第三方OAuth认证",
        color: "#722ed1",
        icon: "api",
        status: 1,
        sortOrder: 3,
      },
      {
        code: "BIOMETRIC",
        label: "生物识别",
        value: "BIOMETRIC",
        description: "生物识别认证",
        color: "#13c2c2",
        icon: "scan",
        status: 1,
        sortOrder: 4,
      },
    ] as DictionaryItem[],
    status: 1,
    sortOrder: 2,
    createdBy: seedUserId,
  };

  // 数据类型字典
  const dataTypeDictionary = {
    code: "DATA_TYPE",
    name: "数据类型",
    description: "系统数据类型字典",
    items: [
      {
        code: "STRING",
        label: "字符串",
        value: "string",
        description: "字符串类型",
        color: "#1890ff",
        status: 1,
        sortOrder: 0,
      },
      {
        code: "NUMBER",
        label: "数字",
        value: "number",
        description: "数字类型",
        color: "#52c41a",
        status: 1,
        sortOrder: 1,
      },
      {
        code: "BOOLEAN",
        label: "布尔值",
        value: "boolean",
        description: "布尔类型",
        color: "#faad14",
        status: 1,
        sortOrder: 2,
      },
      {
        code: "DATE",
        label: "日期",
        value: "date",
        description: "日期类型",
        color: "#722ed1",
        status: 1,
        sortOrder: 3,
      },
      {
        code: "JSON",
        label: "JSON对象",
        value: "json",
        description: "JSON对象类型",
        color: "#13c2c2",
        status: 1,
        sortOrder: 4,
      },
    ] as DictionaryItem[],
    status: 1,
    sortOrder: 3,
    createdBy: seedUserId,
  };

  const dictionaries = [
    statusDictionary,
    genderDictionary,
    authTypeDictionary,
    dataTypeDictionary,
  ];

  // 插入或更新字典数据
  for (const dict of dictionaries) {
    try {
      // 检查字典是否已存在
      const [existing] = await db
        .select()
        .from(systemDictionaries)
        .where(eq(systemDictionaries.code, dict.code));

      if (existing) {
        // 更新现有字典（保留用户可能的修改）
        console.log(`更新字典: ${dict.name}`);
        await db
          .update(systemDictionaries)
          .set({
            name: dict.name,
            description: dict.description,
            // 不更新 items，避免覆盖用户修改
            updatedBy: seedUserId,
            updatedAt: new Date(),
          })
          .where(eq(systemDictionaries.code, dict.code));
      }
      else {
        // 创建新字典
        console.log(`创建字典: ${dict.name}`);
        await db.insert(systemDictionaries).values(dict);
      }
    }
    catch (error) {
      console.error(`处理字典 ${dict.name} 时出错:`, error);
      throw error;
    }
  }

  console.log(`字典初始化完成，处理了 ${dictionaries.length} 个字典`);
}
