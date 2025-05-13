import { serve } from "@hono/node-server";

import app from "./app";
import env from "./env";

const port = env.PORT;

// eslint-disable-next-line no-console
console.log(`服务启动成功 http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
