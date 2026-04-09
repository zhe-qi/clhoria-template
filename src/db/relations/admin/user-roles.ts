import type { RelationsConfig, RelationsHelper } from "../types";
import { Status } from "@/lib/enums";

export const userRolesRelations = (r: RelationsHelper) => ({
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
    users: r.many.systemUsers({
      from: r.systemRoles.id.through(r.systemUserRoles.roleId),
      to: r.systemUsers.id.through(r.systemUserRoles.userId),
    }),
  },
}) satisfies RelationsConfig;
