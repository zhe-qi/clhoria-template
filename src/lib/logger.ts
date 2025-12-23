import type { DestinationStream } from "pino";

import pino from "pino";

import env from "@/env";
import { createSingleton } from "@/lib/internal/singleton";

// Top-level await 处理异步初始化
let destination: DestinationStream | undefined;
if (env.NODE_ENV === "development") {
  try {
    const pretty = await import("pino-pretty");
    destination = pretty.default({
      colorize: true,
      sync: true, // 同步输出，确保日志立即显示
    });
  }
  catch {
    // pino-pretty 未安装，使用默认日志格式
  }
}

const logger = createSingleton("logger", () =>
  pino({ level: env.LOG_LEVEL || "info" }, destination ?? pino.destination({ sync: true })));

export default logger;
