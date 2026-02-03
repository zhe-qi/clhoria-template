import { z } from "zod";

import { insertSystemRolesSchema, selectSystemRolesSchema } from "@/db/schema";
import { roleIdField } from "@/lib/schemas";
import { permissionItemSchema } from "@/lib/schemas/common-fields";

/** Patch Schema */
export const systemRolesPatchSchema = insertSystemRolesSchema.extend({
  parentRoleIds: z.array(roleIdField).optional().describe("上级角色ID列表"),
}).partial();

/** 详情响应 Schema（包含上级角色） */
export const systemRolesDetailResponseSchema = selectSystemRolesSchema.extend({
  parentRoles: z.array(z.string()).optional().describe("上级角色列表"),
});

/** 创建 Schema（包含上级角色ID） */
export const systemRolesCreateSchema = insertSystemRolesSchema.extend({
  parentRoleIds: z.array(roleIdField).optional().describe("上级角色ID列表"),
});

/** ID 参数 Schema（角色使用字符串 ID，非 UUID） */
export const systemRolesIdParamsSchema = z.object({
  id: roleIdField,
});

export const savePermissionsSchema = z.object({
  permissions: z.array(permissionItemSchema).meta({ description: "权限列表" }),
  groupings: z.array(z.object({
    child: z.string().meta({ description: "子角色ID" }),
    parent: z.string().meta({ description: "父角色ID" }),
  })).meta({ description: "角色继承关系列表" }),
});

/** 列表响应 Schema */
export const systemRolesListResponseSchema = z.array(systemRolesDetailResponseSchema);

/** 保存角色权限 Schema */
export const savePermissionsParamsSchema = z.object({
  permissions: z.array(
    z.tuple([
      z.string().min(1).meta({ description: "资源" }),
      z.string().min(1).meta({ description: "操作" }),
    ]),
  ).meta({ description: "权限列表（全量）" }),
  parentRoleIds: z.array(z.string().min(1).regex(/^[a-z0-9_]+$/)).optional().meta({ description: "上级角色ID列表（可选）" }),
});

/** 保存角色权限响应 Schema */
export const savePermissionsResponseSchema = z.object({
  added: z.number().int().meta({ description: "新增权限数量" }),
  removed: z.number().int().meta({ description: "删除权限数量" }),
  total: z.number().int().meta({ description: "总权限数量" }),
});
