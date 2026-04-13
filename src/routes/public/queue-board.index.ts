import { createPublicRouter } from "@/lib/core/create-app";

const queueBoard = createPublicRouter();

// Bull Board UI only in non-production (devDependency)
// Bull Board UI 仅在非生产环境加载（devDependency）
if (process.env.NODE_ENV !== "production") {
  const { createBullBoard } = await import("@bull-board/api");
  const { BullMQAdapter } = await import("@bull-board/api/bullMQAdapter");
  const { HonoAdapter } = await import("@bull-board/hono");
  const { serveStatic } = await import("@hono/node-server/serve-static");
  const { queueManager } = await import("@/lib/infrastructure/bullmq-adapter");

  const serverAdapter = new HonoAdapter(serveStatic);
  serverAdapter.setBasePath("/api/queue-board");

  const getQueues = () => {
    const queueNames = queueManager.getQueueNames();
    return queueNames.map(name => new BullMQAdapter(queueManager.getQueue(name)));
  };

  createBullBoard({
    queues: getQueues(),
    serverAdapter,
  });

  queueBoard.route("/queue-board", serverAdapter.registerPlugin());
}

export default queueBoard;
