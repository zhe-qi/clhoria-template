import { serve } from "@hono/node-server";
import * as z from "zod";

import app from "./app";
import env from "./env";
import { logServerStart, setupGracefulShutdown, setupJobSystem } from "./lib/server";

// 配置 Zod 使用中文错误消息
z.config(z.locales.zhCN());

// 初始化并启动任务系统
await setupJobSystem();

// 启动 HTTP 服务器
const server = serve({ fetch: app.fetch, port: env.PORT });

// 打印启动成功消息
await logServerStart();

// 设置优雅关闭
setupGracefulShutdown(server);
