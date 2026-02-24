import type { TransportTargetOptions } from "pino";
import pino from "pino";

import env from "@/env";
import { createSingleton } from "@/lib/core/singleton";

function buildTransportTargets(): TransportTargetOptions[] {
  const targets: TransportTargetOptions[] = [];

  if (env.NODE_ENV === "development") {
    targets.push({ target: "pino-pretty", level: env.LOG_LEVEL || "info", options: {} });
  }
  else {
    targets.push({ target: "pino/file", level: env.LOG_LEVEL || "info", options: { destination: 1 } });
  }

  // Optional: Alibaba Cloud SLS transport (user implements transport file) / 可选：阿里云 SLS transport（用户自行实现 transport 文件）
  // See SLS Transport integration guide in README / 参考 README 文档中的 SLS Transport 接入指南
  // if (env.SLS_ENDPOINT && env.SLS_PROJECT && env.SLS_LOGSTORE) {
  //   targets.push({
  //     target: join(process.cwd(), "transports", "sls-transport.mjs"),
  //     level: "info",
  //     options: { ... },
  //   });
  // }

  return targets;
}

const logger = createSingleton("logger", () =>
  pino({ level: env.LOG_LEVEL || "info" }, pino.transport({ targets: buildTransportTargets() })));

export default logger;

/** Operation logger / 操作日志 logger */
export const operationLogger = logger.child({ type: "OPERATION" });

/** Login logger / 登录日志 logger */
export const loginLogger = logger.child({ type: "LOGIN" });
