import { defineRelations } from "drizzle-orm";

import * as schema from "@/db/schema";

import { userRolesRelations } from "./admin/user-roles";

export const relations = defineRelations(schema, r => ({
  ...userRolesRelations(r),
}));
