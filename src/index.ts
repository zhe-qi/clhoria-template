import { serve } from "@hono/node-server";
import * as z from "zod";

import app from "./app";
import env from "./env";
import { initializeJobSystem } from "./jobs";
import { logServerStart, setupGracefulShutdown } from "./lib/server";

// 配置 Zod 使用中文错误消息
z.config(z.locales.zhCN());

// 启动 HTTP 服务器
serve({ fetch: app.fetch, port: env.PORT });

// 打印启动成功消息
await logServerStart();

// 初始化任务系统 (分布式安全)
await initializeJobSystem();

// 设置优雅关闭
setupGracefulShutdown();
