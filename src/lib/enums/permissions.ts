/** 权限资源枚举，定义系统中所有可管理的业务资源 */
export const PermissionResource = {
  /** 用户管理 */
  SYS_USERS: "sys-users",

  /** 角色管理 */
  SYS_ROLES: "sys-roles",

  /** 菜单管理 */
  SYS_MENUS: "sys-menus",

  /** 域管理 */
  SYS_DOMAINS: "sys-domains",

  /** 端点管理 */
  SYS_ENDPOINTS: "sys-endpoints",

  /** 授权管理 */
  AUTHORIZATION: "authorization",

  /** 登录日志 */
  LOGIN_LOG: "login-log",

  /** 操作日志 */
  OPERATION_LOG: "operation-log",

  /** 全局参数管理 */
  GLOBAL_PARAMS: "global-params",

  /** 字典管理 */
  SYS_DICTIONARIES: "sys-dictionaries",
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
