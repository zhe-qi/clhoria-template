import type { OpenAPIHono } from "@hono/zod-openapi";

import type { AppBindings } from "@/types/lib";

import env from "@/env";
import { initializeBullBoard } from "@/lib/bull-board";
import logger from "@/lib/logger";
import { jwtWithQuery } from "@/middlewares/special/jwt-auth-with-query";

/**
 * 设置 Bull Board UI 集成
 */
export function setupBullBoard(app: OpenAPIHono<AppBindings>): void {
  try {
    const bullBoardAdapter = initializeBullBoard();

    // 添加 JWT 认证中间件到队列管理界面
    app.use("/admin/ui/queues", jwtWithQuery(env.ADMIN_JWT_SECRET));
    app.route("/admin/ui/queues", bullBoardAdapter.registerPlugin());
  }
  catch (error) {
    logger.error({ error }, "Bull Board UI 集成失败");
    // 在开发环境中不抛出错误，避免影响服务启动
    if (env.NODE_ENV === "production") {
      throw error;
    }
  }
}
