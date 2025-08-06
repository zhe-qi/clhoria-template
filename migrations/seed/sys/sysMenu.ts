/* eslint-disable unicorn/filename-case */
/* eslint-disable no-console */

import { v7 as uuidV7 } from "uuid";

import db from "@/db";
import { systemMenu } from "@/db/schema";
import {z} from "@hono/zod-openapi";

import { routeMetaSchema } from "@/db/schema/system/authorization";

type RouteMeta = z.infer<typeof routeMetaSchema>;

export async function initSysMenu() {
  // 预定义一些固定的UUID用于父级菜单
  const systemManageId = "01234567-1234-7890-abcd-000000000001";
  const logManageId = "01234567-1234-7890-abcd-000000000002";
  const dashboardId = "01234567-1234-7890-abcd-000000000003";

  const data = [
    // 仪表盘目录
    {
      id: dashboardId,
      // 菜单类型通过 component 字段判断：component 为 null 表示目录，非 null 表示菜单页面
      name: "Dashboard",
      path: "/dashboard",
      component: null, // null 表示目录类型
      redirect: "/dashboard/analytics",
      status: 1,
      pid: null,
      meta: {
        title: "page.dashboard.title",
        icon: "mdi:monitor-dashboard",
        order: -1,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      name: "Analytics",
      path: "/dashboard/analytics",
      component: "/dashboard/analytics/index",
      redirect: null,
      status: 1,
      pid: dashboardId,
      meta: {
        title: "page.dashboard.analytics",
        affixTab: true,
        order: 0,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      name: "Workspace",
      path: "/dashboard/workspace",
      component: "/dashboard/workspace/index",
      redirect: null,
      status: 1,
      pid: dashboardId,
      meta: {
        title: "page.dashboard.workspace",
        order: 1,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },

    // 系统管理目录
    {
      id: systemManageId,
      name: "SystemManage",
      path: "/system",
      component: null, // null 表示目录类型
      redirect: "/system/users",
      status: 1,
      pid: null,
      meta: {
        title: "系统管理",
        icon: "carbon:cloud-service-management",
        order: 1000,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      name: "UserManage",
      path: "/system/users",
      component: "/system/users/index",
      redirect: null,
      status: 1,
      pid: systemManageId,
      meta: {
        title: "用户管理",
        icon: "ic:round-manage-accounts",
        keepAlive: true,
        order: 0,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      name: "RoleManage",
      path: "/system/roles",
      component: "/system/roles/index",
      redirect: null,
      status: 1,
      pid: systemManageId,
      meta: {
        title: "角色管理",
        icon: "carbon:user-role",
        keepAlive: true,
        order: 1,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      name: "MenuManage",
      path: "/system/menus",
      component: "/system/menus/index",
      redirect: null,
      status: 1,
      pid: systemManageId,
      meta: {
        title: "菜单管理",
        icon: "material-symbols:route",
        keepAlive: true,
        order: 2,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },

    // 日志管理目录
    {
      id: logManageId,
      name: "LogManage",
      path: "/logs",
      component: null, // null 表示目录类型
      redirect: "/logs/login",
      status: 1,
      pid: null,
      meta: {
        title: "日志管理",
        icon: "carbon:document",
        order: 2000,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      name: "LoginLog",
      path: "/logs/login",
      component: "/logs/login/index",
      redirect: null,
      status: 1,
      pid: logManageId,
      meta: {
        title: "登录日志",
        icon: "carbon:login",
        keepAlive: true,
        order: 0,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      name: "OperationLog",
      path: "/logs/operation",
      component: "/logs/operation/index",
      redirect: null,
      status: 1,
      pid: logManageId,
      meta: {
        title: "操作日志",
        icon: "carbon:document-tasks",
        keepAlive: true,
        order: 1,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },

    // 常量路由（隐藏菜单）
    {
      name: "Login",
      path: "/login",
      component: "/login/index",
      redirect: null,
      status: 1,
      pid: null,
      meta: {
        title: "route.login",
        hideInMenu: true,
        constant: true,
        order: 0,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      name: "403",
      path: "/403",
      component: "/exception/403/index",
      redirect: null,
      status: 1,
      pid: null,
      meta: {
        title: "route.403",
        hideInMenu: true,
        constant: true,
        order: 0,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      name: "404",
      path: "/404",
      component: "/exception/404/index",
      redirect: null,
      status: 1,
      pid: null,
      meta: {
        title: "route.404",
        hideInMenu: true,
        constant: true,
        order: 0,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },
    {
      name: "500",
      path: "/500",
      component: "/exception/500/index",
      redirect: null,
      status: 1,
      pid: null,
      meta: {
        title: "route.500",
        hideInMenu: true,
        constant: true,
        order: 0,
      } as RouteMeta,
      createdBy: "-1",
      updatedBy: null,
    },
  ];

  // 为没有预定义ID的记录生成UUID
  const menuData = data.map(item => ({
    ...item,
    id: item.id || uuidV7(), // 如果没有预定义ID，则生成新的UUID
    domain: "default", // 添加默认域
  }));

  await db.insert(systemMenu).values(menuData).onConflictDoNothing();
  console.log("系统菜单初始化完成");
}
