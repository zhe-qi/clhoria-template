import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";

import { systemRoles } from "@/db/schema";

export const selectSystemRoles = createSelectSchema(systemRoles, {
  id: schema => schema.meta({ description: "角色ID" }),
  name: schema => schema.meta({ description: "角色名称" }),
  description: schema => schema.meta({ description: "角色描述" }),
  status: schema => schema.meta({ description: "状态 (ENABLED=启用, DISABLED=禁用)" }),
}).extend({
  parentRoles: z.array(z.string()).optional().describe("上级角色列表"),
});

export const insertSystemRoles = createInsertSchema(systemRoles, {
  id: schema => schema.min(1).regex(/^[a-z0-9_]+$/),
  name: schema => schema.min(1),
}).omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
}).extend({
  parentRoleIds: z.array(z.string().min(1).regex(/^[a-z0-9_]+$/, "角色ID只能包含小写字母、数字和下划线")).optional().describe("上级角色ID列表"),
});

export const patchSystemRoles = insertSystemRoles.partial();

// id 查询 schema
export const idSystemRoles = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_]+$/).meta({ description: "角色ID" }),
});

// 权限项 schema
export const permissionItemSchema = z.object({
  resource: z.string().min(1).meta({ description: "资源路径" }),
  action: z.string().min(1).meta({ description: "操作" }),
  inherited: z.boolean().meta({ description: "是否为继承权限" }),
});
