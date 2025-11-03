import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";

import { systemRoles } from "@/db/schema";

export const selectSystemRoles = createSelectSchema(systemRoles, {
  id: schema => schema.meta({ description: "角色ID" }),
  name: schema => schema.meta({ description: "角色名称" }),
  description: schema => schema.meta({ description: "角色描述" }),
  status: schema => schema.meta({ description: "状态: 1=启用 0=禁用" }),
});

export const insertSystemRoles = createInsertSchema(systemRoles, {
  id: schema => schema.min(1).regex(/^[a-z_]+$/),
  name: schema => schema.min(1),
}).omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const patchSystemRoles = insertSystemRoles.partial();

// id 查询 schema
export const idSystemRoles = z.object({
  id: z.string().min(1).regex(/^[a-z_]+$/).meta({ description: "角色ID" }),
});
