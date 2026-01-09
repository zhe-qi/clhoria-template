import { z } from "zod";

import { insertSystemRolesSchema, selectSystemRolesSchema } from "@/db/schema";
import { roleIdField } from "@/lib/schemas";

/** Patch Schema */
export const systemRolesPatchSchema = insertSystemRolesSchema.extend({
  parentRoleIds: z.array(roleIdField).optional().describe("上级角色ID列表"),
}).partial();

/** 详情响应 Schema（包含上级角色） */
export const systemRolesDetailResponse = selectSystemRolesSchema.extend({
  parentRoles: z.array(z.string()).optional().describe("上级角色列表"),
});

/** 创建 Schema（包含上级角色ID） */
export const systemRolesCreateSchema = insertSystemRolesSchema.extend({
  parentRoleIds: z.array(roleIdField).optional().describe("上级角色ID列表"),
});

/** ID 参数 Schema */
export const systemRolesIdParams = z.object({
  id: roleIdField,
});

// permissionItemSchema 已迁移到 @/lib/schemas/common-fields.ts
export { permissionItemSchema } from "@/lib/schemas";
