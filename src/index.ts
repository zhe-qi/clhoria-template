import { serve } from "@hono/node-server";
import * as z from "zod";

import app from "./app";
import env from "./env";
import logger from "./lib/logger";

// 配置 Zod 使用中文错误消息
z.config(z.locales.zhCN());

serve({ fetch: app.fetch, port: env.PORT });

logger.info(` 🚀 服务启动成功 → (http://localhost:${env.PORT}) `);
