import type { ExtractTablesFromSchema, RelationsBuilder } from "drizzle-orm";

import type * as schema from "@/db/schema";

type Schema = ExtractTablesFromSchema<typeof schema>;

export const userRolesRelations = (r: RelationsBuilder<Schema>) => ({
  systemUsers: {
    roles: r.many.systemRoles({
      from: r.systemUsers.id.through(r.systemUserRoles.userId),
      to: r.systemRoles.id.through(r.systemUserRoles.roleId),
    }),
  },
  systemRoles: {
    users: r.many.systemUsers(),
  },
});
