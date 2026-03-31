import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { serveStatic } from "@hono/node-server/serve-static";

import { createRouter } from "@/lib/core/create-app";
import { queueManager } from "@/lib/infrastructure/bullmq-adapter";

const serverAdapter = new HonoAdapter(serveStatic);
serverAdapter.setBasePath("/api/admin/queue-board");

// 动态获取所有已注册的队列
const getQueues = () => {
  const queueNames = queueManager.getQueueNames();
  return queueNames.map(name => new BullMQAdapter(queueManager.getQueue(name)));
};

createBullBoard({
  queues: getQueues(),
  serverAdapter,
});

const queueBoard = createRouter();

// 挂载 Bull Board UI
queueBoard.route("/", serverAdapter.registerPlugin());

export default queueBoard;
