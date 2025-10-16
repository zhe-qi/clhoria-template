import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { adminSystemUser } from "@/db/schema";

export const selectAdminSystemUser = createSelectSchema(adminSystemUser, {
  id: schema => schema.meta({ description: "用户ID" }),
  username: schema => schema.meta({ description: "用户名" }),
  password: schema => schema.meta({ description: "密码" }),
  builtIn: schema => schema.meta({ description: "是否内置用户" }),
  avatar: schema => schema.meta({ description: "头像" }),
  nickName: schema => schema.meta({ description: "昵称" }),
  status: schema => schema.meta({ description: "状态: 1=启用 0=禁用 -1=封禁" }),
});

export const insertAdminSystemUser = createInsertSchema(adminSystemUser, {
  username: schema => schema.min(4).max(15).regex(/^\w+$/).meta({ description: "用户名" }),
  password: schema => schema.min(6).max(20).meta({ description: "密码" }),
  nickName: schema => schema.min(1).meta({ description: "昵称" }),
}).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true,
  builtIn: true, // 系统字段，不允许用户设置
});

export const patchAdminSystemUser = insertAdminSystemUser.partial().refine(
  data => Object.keys(data).length > 0,
  { message: "至少需要提供一个字段进行更新" },
);

/** 用于响应的 schema（不包含密码） */
export const responseAdminSystemUserWithoutPassword = selectAdminSystemUser.omit({ password: true });

/** 用于响应的schema（包含密码） */
export const responseAdminSystemUserWithPassword = selectAdminSystemUser.extend({
  roles: z.array(z.object({
    id: z.string().min(1).max(64).meta({ description: "角色ID" }),
    name: z.string().min(1).max(64).meta({ description: "角色名称" }),
  })).meta({ description: "用户角色" }),
});

/** 用于响应的 列表（不包含密码） */
export const responseAdminSystemUserWithList = z.array(responseAdminSystemUserWithPassword.omit({ password: true }));

/** 用于登录的 schema（仅包含 username，password，domain ） */
export const loginAdminSystemUser = insertAdminSystemUser.pick({
  username: true,
  password: true,
}).extend({
  captchaToken: z.string().min(1).meta({ description: "验证码token" }),
});

/** 用于获取用户信息的 schema，支持拓展，如果后续新增或者联表可以继续拓展 */
export const getUserInfoSchema = responseAdminSystemUserWithoutPassword.pick({
  id: true,
  username: true,
  avatar: true,
  nickName: true,
}).extend({
  roles: z.array(z.string()).meta({ description: "用户角色" }),
});
