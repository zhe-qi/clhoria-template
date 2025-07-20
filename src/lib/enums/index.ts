/** 应用名称枚举, 用于标识不同的应用程序路由 */
export const AppNameMenu = {
  /** 后台管理路由 */
  ADMIN_APP: "adminApp",

  /** 客户端路由 */
  CLIENT_APP: "clientApp",

  /** 公共路由 */
  PUBLIC_APP: "publicApp",
} as const;

/** 应用名称类型 */
export type AppNameType = (typeof AppNameMenu)[keyof typeof AppNameMenu];

// 缓存相关枚举和工具函数
export * from "./cache";

// 权限相关枚举
export * from "./permissions";

// Token 相关枚举
export * from "./token";
