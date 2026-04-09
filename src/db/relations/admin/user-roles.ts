import type { ExtractTablesFromSchema, RelationsBuilder } from "drizzle-orm";

import type * as schema from "@/db/schema";

import { Status } from "@/lib/enums";

type Schema = ExtractTablesFromSchema<typeof schema>;

export const userRolesRelations = (r: RelationsBuilder<Schema>) => ({
  systemUsers: {
    roles: r.many.systemRoles({
      from: r.systemUsers.id.through(r.systemUserRoles.userId),
      to: r.systemRoles.id.through(r.systemUserRoles.roleId),
    }),
    enabledRoles: r.many.systemRoles({
      from: r.systemUsers.id.through(r.systemUserRoles.userId),
      to: r.systemRoles.id.through(r.systemUserRoles.roleId),
      where: { status: Status.ENABLED },
    }),
  },
  systemRoles: {
    users: r.many.systemUsers(),
  },
});
