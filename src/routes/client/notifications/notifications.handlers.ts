import type { NotificationsRouteHandlerType } from "./notifications.types";

import { streamSSE } from "hono/streaming";

/**
 * Subscribe to real-time notifications (SSE)
 * Simulates pushing a notification every 5 seconds
 * 订阅实时通知（SSE）
 * 模拟每 5 秒推送一条通知消息
 */
export const subscribe: NotificationsRouteHandlerType<"subscribe"> = async (c) => {
  const { sub: userId } = c.get("jwtPayload");

  return streamSSE(c, async (stream) => {
    // Send connection success message / 发送连接成功消息
    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({
        message: "连接成功",
        userId,
        timestamp: new Date().toISOString(),
      }),
    });

    // Simulate scheduled notification push / 模拟定时推送通知
    // In production, integrate with Redis Pub/Sub or message queue / 实际生产环境可对接 Redis Pub/Sub 或消息队列
    let count = 0;
    while (true) {
      // Send heartbeat every 30 seconds / 每 30 秒发送心跳
      await stream.sleep(30000);

      // Simulate notification message / 模拟通知消息
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
