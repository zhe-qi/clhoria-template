import type { z } from "zod";
import type * as routes from "./roles.routes";
import type { systemRolesDetailResponse } from "./roles.schema";

import type { AppRouteHandler } from "@/types/lib";

export type Role = z.infer<typeof systemRolesDetailResponse>;
export type RoleWithParents = Role & { parentRoles?: string[] };

type RouteTypes = {
  [K in keyof typeof routes]: typeof routes[K];
};

export type SystemRolesRouteHandlerType<T extends keyof RouteTypes> = AppRouteHandler<RouteTypes[T]>;
