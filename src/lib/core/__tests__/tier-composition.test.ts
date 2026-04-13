import type { RouteConfig as HonoRouteConfig } from "@hono/zod-openapi";
import type {
  AdminBindings,
  AdminJwtPayload,
  BaseJwtPayload,
  ClientBindings,
  ClientJwtPayload,
  JwtBindings,
  RouteHandlerWithBindings,
} from "@/types/lib";
import { describe, expectTypeOf, it } from "vitest";

import { createRouter, createTierRouter } from "../create-app";
import { createTierFactory } from "../factory";

type PartnerJwtPayload = BaseJwtPayload & {
  partnerId: string;
};

type PartnerBindings = JwtBindings<PartnerJwtPayload>;
type PartnerRouteHandler<R extends HonoRouteConfig> = RouteHandlerWithBindings<R, PartnerBindings>;

describe("tier composition", () => {
  it("supports custom authenticated tiers without framework edits", () => {
    const partnerRouter = createTierRouter<PartnerBindings>();
    const fallbackRouter = createRouter<PartnerBindings>();
    const partnerFactory = createTierFactory<PartnerBindings>();
    const middleware = partnerFactory.createMiddleware(async (c, next) => {
      expectTypeOf(c.get("jwtPayload")).toEqualTypeOf<PartnerJwtPayload>();
      expectTypeOf(c.get("jwtPayload").sub).toBeString();
      expectTypeOf(c.get("jwtPayload").partnerId).toBeString();

      await next();
    });

    expectTypeOf(partnerRouter).toEqualTypeOf(fallbackRouter);
    expectTypeOf(middleware).toBeFunction();
  });

  it("keeps built-in tiers as aliases over generic primitives", () => {
    expectTypeOf<AdminBindings>().toEqualTypeOf<JwtBindings<AdminJwtPayload>>();
    expectTypeOf<ClientBindings>().toEqualTypeOf<JwtBindings<ClientJwtPayload>>();
  });

  it("allows custom route handler aliases from arbitrary bindings", () => {
    expectTypeOf<PartnerRouteHandler<HonoRouteConfig>>().toBeFunction();
  });
});
