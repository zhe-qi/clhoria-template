import { jwt } from "hono/jwt";

import env from "@/env";
import { defineMiddleware } from "@/lib/internal/define-config";
import { authorize } from "@/middlewares/authorize";
import { operationLog } from "@/middlewares/operation-log";

export default defineMiddleware([
  {
    handler: jwt({ secret: env.ADMIN_JWT_SECRET, alg: "HS256" }),
    except: c => ["/auth/login", "/auth/refresh", "/auth/challenge", "/auth/redeem"]
      .some(p => c.req.path.endsWith(p)),
  },
  {
    handler: authorize,
    except: c => c.req.path.includes("/auth"),
  },
  {
    handler: operationLog({ moduleName: "后台管理", description: "后台管理操作日志" }),
    except: c => c.req.path.includes("/auth"),
  },
]);
