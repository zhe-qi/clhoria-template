import type * as routes from "./auth.routes";

import type { AppRouteHandler } from "@/types/lib";

export type UserTokenInfo = {
  id: string | number;
  roles: string[];
};

export type ValidateLoginResult
  = | { success: true; user: UserTokenInfo }
    | { success: false; error: string; status: "unauthorized" | "forbidden" };

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type AuthRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
