import type { Context, MiddlewareHandler } from "hono";
import type { JWTPayload } from "hono/utils/jwt/types";

import { Enforcer } from "casbin";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

async function jwtAuthorizer(c: Context, enforcer: Enforcer): Promise<boolean> {
  const payload: JWTPayload = c.get("jwtPayload");

  const roles = (payload.roles as string[]) ?? [];

  const { path, method } = c.req;
  const rolesPromise = roles.map(async (role) => {
    const isAllowed = await enforcer.enforce(role, path, method);
    return isAllowed;
  });
  const isAllowed = await Promise.all(rolesPromise);
  return isAllowed.some(Boolean);
}

export function casbin(opt: { newEnforcer: Promise<Enforcer> }): MiddlewareHandler {
  return async (c, next) => {
    const enforcer = await opt.newEnforcer;

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
