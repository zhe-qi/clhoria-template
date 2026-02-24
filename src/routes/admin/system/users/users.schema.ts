import { z } from "zod";

import { insertSystemUsersSchema, selectSystemUsersSchema } from "@/db/schema";
import { roleBriefSchema } from "@/lib/schemas";

/** Patch Schema / 更新 Schema */
export const systemUsersPatchSchema = insertSystemUsersSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: "至少需要提供一个字段进行更新" },
);

/** Login Schema / 登录 Schema */
export const systemUsersLoginSchema = insertSystemUsersSchema.pick({
  username: true,
  password: true,
}).extend({
  captchaToken: z.string().min(1).meta({ description: "验证码token" }),
});

/** Response Schema (excluding password) / 响应 Schema（不包含密码） */
export const systemUsersResponseSchema = selectSystemUsersSchema.omit({ password: true });

/** Detail response Schema (including roles) / 详情响应 Schema（包含角色） */
export const systemUsersDetailResponseSchema = selectSystemUsersSchema.omit({ password: true }).extend({
  roles: z.array(roleBriefSchema).meta({ description: "用户角色" }),
});

/** List response Schema / 列表响应 Schema */
export const systemUsersListResponseSchema = z.array(systemUsersDetailResponseSchema);

/** Internal query result type (includes password, removed after JOIN query) / 内部查询结果类型（包含密码，用于 JOIN 查询后再移除） */
export const systemUsersQueryResultSchema = selectSystemUsersSchema.extend({
  roles: z.array(roleBriefSchema).meta({ description: "用户角色" }),
});

/** User info response Schema / 用户信息响应 Schema */
export const systemUsersInfoResponseSchema = selectSystemUsersSchema.pick({
  id: true,
  username: true,
  avatar: true,
  nickName: true,
}).extend({
  roles: z.array(z.string()).meta({ description: "用户角色" }),
});

/** Save user roles Schema / 保存用户角色 Schema */
export const saveRolesSchema = z.object({
  roleIds: z.array(z.string().min(1).max(64).meta({ example: "admin", description: "角色编码" }))
    .meta({ description: "角色列表（全量）" }),
});

/** Save user roles params Schema / 保存用户角色参数 Schema */
export const saveRolesParamsSchema = z.object({
  userId: z.uuid().meta({ description: "用户ID" }),
});

/** Save user roles response Schema / 保存用户角色响应 Schema */
export const saveRolesResponseSchema = z.object({
  added: z.number().int().meta({ description: "新增角色数量" }),
  removed: z.number().int().meta({ description: "删除角色数量" }),
  total: z.number().int().meta({ description: "总角色数量" }),
});
