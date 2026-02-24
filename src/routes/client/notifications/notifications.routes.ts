import { createRoute, z } from "@hono/zod-openapi";

import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";
import { jsonContent } from "@/lib/core/stoker/openapi/helpers";
import { respErrSchema } from "@/utils";

const routePrefix = "/notifications";
const tags = [`${routePrefix}（通知）`];

/**
 * Subscribe to real-time notifications (SSE)
 * Clients can receive server-pushed real-time notifications through this endpoint
 * 订阅实时通知（SSE）
 * 客户端可通过此端点接收服务端推送的实时通知
 */
export const subscribe = createRoute({
  tags,
  path: `${routePrefix}/subscribe`,
  method: "get",
  summary: "订阅实时通知（SSE）",
  description: `
通过 Server-Sent Events (SSE) 订阅实时通知流。

**事件类型：**
- \`connected\`: 连接成功
- \`notification\`: 通知消息
- \`heartbeat\`: 心跳保活

**前端使用示例：**
\`\`\`javascript
const eventSource = new EventSource('/api/client/notifications/subscribe', {
  headers: { 'Authorization': 'Bearer <token>' }
});

eventSource.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  console.log('收到通知:', data);
});
\`\`\`
  `.trim(),
  responses: {
    [HttpStatusCodes.OK]: {
      description: "SSE 事件流",
      content: {
        "text/event-stream": {
          schema: z.string(),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(respErrSchema, "未授权"),
  },
});
