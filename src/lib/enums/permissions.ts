/** 权限资源枚举，定义系统中所有可管理的业务资源 */
export const PermissionResource = {
  /** 用户管理 */
  SYSTEM_USERS: "system-users",

  /** 角色管理 */
  SYSTEM_ROLES: "system-roles",

  /** 岗位管理 */
  SYSTEM_POSTS: "system-posts",

  /** 菜单管理 */
  SYSTEM_MENUS: "system-menus",

  /** 组织管理 */
  SYSTEM_ORGANIZATION: "system-organization",

  /** 域管理 */
  SYSTEM_DOMAINS: "system-domains",

  /** 端点管理 */
  SYSTEM_ENDPOINTS: "system-endpoints",

  /** 授权管理 */
  SYSTEM_AUTHORIZATION: "system-authorization",

  /** 登录日志 */
  SYSTEM_LOGIN_LOG: "system-login-log",

  /** 操作日志 */
  SYSTEM_OPERATION_LOG: "system-operation-log",

  /** 全局参数管理 */
  SYSTEM_GLOBAL_PARAMS: "system-global-params",

  /** 字典管理 */
  SYSTEM_DICTIONARIES: "system-dictionaries",

  /** 通知公告管理 */
  SYSTEM_NOTICES: "system-notices",

  /** 定时任务管理 */
  SYSTEM_SCHEDULED_JOBS: "system-scheduled-jobs",
} as const;

/** 权限资源类型 */
export type PermissionResourceType = (typeof PermissionResource)[keyof typeof PermissionResource];

/** 权限动作枚举，定义对资源可执行的操作 */
export const PermissionAction = {
  /** 创建 */
  CREATE: "create",

  /** 查看 */
  READ: "read",

  /** 更新 */
  UPDATE: "update",

  /** 删除 */
  DELETE: "delete",

  /** 分配权限 */
  ASSIGN_PERMISSIONS: "assign-permissions",

  /** 分配路由 */
  ASSIGN_ROUTES: "assign-routes",

  /** 分配用户 */
  ASSIGN_USERS: "assign-users",

  /** 获取用户路由 */
  GET_USER_ROUTES: "get-user-routes",

  /** 获取用户角色 */
  GET_USER_ROLES: "get-user-roles",

  /** 获取角色权限 */
  GET_ROLE_PERMISSIONS: "get-role-permissions",

  /** 获取角色菜单 */
  GET_ROLE_MENUS: "get-role-menus",

  /** 启用 */
  ENABLE: "enable",

  /** 禁用 */
  DISABLE: "disable",

  /** 重置密码 */
  RESET_PASSWORD: "reset-password",

  /** 更改状态 */
  CHANGE_STATUS: "change-status",
} as const;

/** 权限动作类型 */
export type PermissionActionType = (typeof PermissionAction)[keyof typeof PermissionAction];
