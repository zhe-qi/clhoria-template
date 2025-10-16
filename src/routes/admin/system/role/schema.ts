import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";

import { adminSystemRole } from "@/db/schema";

export const selectAdminSystemRole = createSelectSchema(adminSystemRole, {
  id: schema => schema.meta({ description: "角色ID" }),
  name: schema => schema.meta({ description: "角色名称" }),
  description: schema => schema.meta({ description: "角色描述" }),
  status: schema => schema.meta({ description: "状态: 1=启用 0=禁用" }),
});

export const insertAdminSystemRole = createInsertSchema(adminSystemRole, {
  id: schema => schema.min(1).regex(/^[a-z_]+$/),
  name: schema => schema.min(1),
}).omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const patchAdminSystemRole = insertAdminSystemRole.partial();

// id 查询 schema
export const idAdminSystemRole = z.object({
  id: z.string().min(1).regex(/^[a-z_]+$/).meta({ description: "角色ID" }),
});
