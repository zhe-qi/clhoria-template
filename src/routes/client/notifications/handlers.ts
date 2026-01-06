import { streamSSE } from "hono/streaming";

import type { NotificationsRouteHandlerType } from ".";

/**
 * 订阅实时通知（SSE）
 * 模拟每 5 秒推送一条通知消息
 */
export const subscribe: NotificationsRouteHandlerType<"subscribe"> = async (c) => {
  const { sub: userId } = c.get("jwtPayload");

  return streamSSE(c, async (stream) => {
    // 发送连接成功消息
    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({
        message: "连接成功",
        userId,
        timestamp: new Date().toISOString(),
      }),
    });

    // 模拟定时推送通知
    // 实际生产环境可对接 Redis Pub/Sub 或消息队列
    let count = 0;
    while (true) {
      // 每 30 秒发送心跳
      await stream.sleep(30000);

      // 模拟通知消息
      count++;
      await stream.writeSSE({
        event: "notification",
        data: JSON.stringify({
          id: count,
          type: "system",
          title: `系统通知 #${count}`,
          content: "这是一条模拟通知消息",
          timestamp: new Date().toISOString(),
          read: false,
        }),
      });
    }
  });
};
