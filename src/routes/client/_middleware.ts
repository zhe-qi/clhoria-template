import { jwt } from "hono/jwt";

import env from "@/env";
import { defineMiddleware } from "@/lib/internal/define-config";

export default defineMiddleware([
  jwt({ secret: env.CLIENT_JWT_SECRET, alg: "HS256" }),
]);
