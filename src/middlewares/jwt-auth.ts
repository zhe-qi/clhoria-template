import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { Enforcer } from "casbin";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import { enforcerLaunchedPromise } from "@/lib/casbin";

async function jwtAuthorizer(c: Context, enforcer: Enforcer): Promise<boolean> {
  const payload: JWTPayload = c.get("jwtPayload");

  const roles = (payload.roles as string[]) ?? [];
  const domain = (payload.domain as string) ?? "default";

  const { path, method } = c.req;
  const rolesPromise = roles.map(async role => enforcer.enforce(role, path, method, domain));

  return (await Promise.all(rolesPromise)).some(Boolean);
}

export function casbin(): MiddlewareHandler {
  return async (c, next) => {
    const enforcer = await enforcerLaunchedPromise;

    if (!(enforcer instanceof Enforcer)) {
      return c.json({ message: HttpStatusPhrases.INTERNAL_SERVER_ERROR }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    const isAllowed = await jwtAuthorizer(c, enforcer);

    if (!isAllowed) {
      return c.json({ message: HttpStatusPhrases.FORBIDDEN }, HttpStatusCodes.FORBIDDEN);
    }

    await next();
  };
}
