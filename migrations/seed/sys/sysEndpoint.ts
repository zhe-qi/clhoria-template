/* eslint-disable unicorn/filename-case */
/* eslint-disable no-console */

import db from "@/db";
import { sysEndpoint } from "@/db/schema";

export async function initSysEndpoint() {
  const data = [
    // 用户管理端点
    {
      path: "/admin/sys-users",
      method: "GET",
      resource: "sys-user",
      action: "read",
      controller: "SysUserController",
      summary: "获取用户列表",
    },
    {
      path: "/admin/sys-users/:id",
      method: "GET",
      resource: "sys-user",
      action: "read",
      controller: "SysUserController",
      summary: "获取用户详情",
    },
    {
      path: "/admin/sys-users",
      method: "POST",
      resource: "sys-user",
      action: "create",
      controller: "SysUserController",
      summary: "创建用户",
    },
    {
      path: "/admin/sys-users/:id",
      method: "PATCH",
      resource: "sys-user",
      action: "update",
      controller: "SysUserController",
      summary: "更新用户",
    },
    {
      path: "/admin/sys-users/:id",
      method: "DELETE",
      resource: "sys-user",
      action: "delete",
      controller: "SysUserController",
      summary: "删除用户",
    },
    // 角色管理端点
    {
      path: "/admin/sys-roles",
      method: "GET",
      resource: "sys-role",
      action: "read",
      controller: "SysRoleController",
      summary: "获取角色列表",
    },
    {
      path: "/admin/sys-roles/:id",
      method: "GET",
      resource: "sys-role",
      action: "read",
      controller: "SysRoleController",
      summary: "获取角色详情",
    },
    {
      path: "/admin/sys-roles",
      method: "POST",
      resource: "sys-role",
      action: "create",
      controller: "SysRoleController",
      summary: "创建角色",
    },
    {
      path: "/admin/sys-roles/:id",
      method: "PATCH",
      resource: "sys-role",
      action: "update",
      controller: "SysRoleController",
      summary: "更新角色",
    },
    {
      path: "/admin/sys-roles/:id",
      method: "DELETE",
      resource: "sys-role",
      action: "delete",
      controller: "SysRoleController",
      summary: "删除角色",
    },
    // 菜单管理端点
    {
      path: "/admin/sys-menus",
      method: "GET",
      resource: "sys-menu",
      action: "read",
      controller: "SysMenuController",
      summary: "获取菜单列表",
    },
    {
      path: "/admin/sys-menus/:id",
      method: "GET",
      resource: "sys-menu",
      action: "read",
      controller: "SysMenuController",
      summary: "获取菜单详情",
    },
    {
      path: "/admin/sys-menus",
      method: "POST",
      resource: "sys-menu",
      action: "create",
      controller: "SysMenuController",
      summary: "创建菜单",
    },
    {
      path: "/admin/sys-menus/:id",
      method: "PATCH",
      resource: "sys-menu",
      action: "update",
      controller: "SysMenuController",
      summary: "更新菜单",
    },
    {
      path: "/admin/sys-menus/:id",
      method: "DELETE",
      resource: "sys-menu",
      action: "delete",
      controller: "SysMenuController",
      summary: "删除菜单",
    },
    // 域管理端点
    {
      path: "/admin/sys-domains",
      method: "GET",
      resource: "sys-domain",
      action: "read",
      controller: "SysDomainController",
      summary: "获取域列表",
    },
    {
      path: "/admin/sys-domains/:id",
      method: "GET",
      resource: "sys-domain",
      action: "read",
      controller: "SysDomainController",
      summary: "获取域详情",
    },
    {
      path: "/admin/sys-domains",
      method: "POST",
      resource: "sys-domain",
      action: "create",
      controller: "SysDomainController",
      summary: "创建域",
    },
    {
      path: "/admin/sys-domains/:id",
      method: "PATCH",
      resource: "sys-domain",
      action: "update",
      controller: "SysDomainController",
      summary: "更新域",
    },
    {
      path: "/admin/sys-domains/:id",
      method: "DELETE",
      resource: "sys-domain",
      action: "delete",
      controller: "SysDomainController",
      summary: "删除域",
    },
    // 授权管理端点
    {
      path: "/admin/authorization/assign-permission",
      method: "POST",
      resource: "authorization",
      action: "assign-permission",
      controller: "AuthorizationController",
      summary: "分配权限",
    },
    {
      path: "/admin/authorization/assign-routes",
      method: "POST",
      resource: "authorization",
      action: "assign-routes",
      controller: "AuthorizationController",
      summary: "分配路由",
    },
    {
      path: "/admin/authorization/assign-users",
      method: "POST",
      resource: "authorization",
      action: "assign-users",
      controller: "AuthorizationController",
      summary: "分配用户",
    },
    // API 端点管理
    {
      path: "/admin/api-endpoints",
      method: "GET",
      resource: "api-endpoint",
      action: "read",
      controller: "ApiEndpointController",
      summary: "获取API端点列表",
    },
    // 日志管理端点
    {
      path: "/admin/login-logs",
      method: "GET",
      resource: "login-log",
      action: "read",
      controller: "LoginLogController",
      summary: "获取登录日志",
    },
    {
      path: "/admin/operation-logs",
      method: "GET",
      resource: "operation-log",
      action: "read",
      controller: "OperationLogController",
      summary: "获取操作日志",
    },
    // 客户端端点
    {
      path: "/client/dashboard",
      method: "GET",
      resource: "dashboard",
      action: "read",
      controller: "DashboardController",
      summary: "获取仪表板数据",
    },
    {
      path: "/client/profile",
      method: "GET",
      resource: "profile",
      action: "read",
      controller: "ProfileController",
      summary: "获取个人信息",
    },
    {
      path: "/client/profile",
      method: "PATCH",
      resource: "profile",
      action: "update",
      controller: "ProfileController",
      summary: "更新个人信息",
    },
  ];

  await db.insert(sysEndpoint).values(data).onConflictDoNothing();
  console.log("系统端点初始化完成");
}