import type { z } from "zod";

import { eq } from "drizzle-orm";

import type { selectRolesSchema } from "@/db/schema";
import type { AppRouteHandler } from "@/types/lib";

import db from "@/db";
import { roles } from "@/db/schema";
import { enforcerLaunchedPromise } from "@/lib/casbin";
import { getQueryValidationError, updatesZodError } from "@/lib/constants";
import paginatedQuery from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";

import type {
  AddInheritsRoute,
  AddPermissionsRoute,
  CreateRoute,
  GetOneRoute,
  GetPermissionsRoute,
  ListRoute,
  PatchRoute,
  RemoveInheritsRoute,
  RemovePermissionsRoute,
  RemoveRoute,
} from "./roles.routes";

type PaginatedResult = z.infer<typeof selectRolesSchema>;

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const query = c.req.valid("query");

  const [error, result] = await paginatedQuery<PaginatedResult>({
    table: roles,
    params: query,
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = c.req.valid("json");

  const [result] = await db.insert(roles).values(body).returning();

  return c.json(result, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const result = await db.query.roles.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!result) {
    return c.json({ message: "角色不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  if (Reflect.ownKeys(updates).length < 1) {
    return c.json(updatesZodError, HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [result] = await db.update(roles)
    .set(updates)
    .where(eq(roles.id, id))
    .returning();

  if (!result) {
    return c.json({ message: "角色不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const [result] = await db.delete(roles)
    .where(eq(roles.id, id))
    .returning();

  if (!result) {
    return c.json({ message: "角色不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const getPermissions: AppRouteHandler<GetPermissionsRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { include = ["direct", "inherited", "inheritable", "combined"] } = c.req.valid("query");

  // 检查角色是否存在
  const role = await db.query.roles.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!role) {
    return c.json({ message: "角色不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  const enforcer = await enforcerLaunchedPromise;
  const result: Record<string, any> = {};

  // 获取直接权限
  if (include.includes("direct")) {
    const directPolicy = await enforcer.getFilteredPolicy(0, id);
    result.direct = directPolicy.map(policy => ({
      obj: policy[1],
      act: policy[2],
    }));
  }

  // 获取继承权限
  if (include.includes("inherited")) {
    // 先获取所有角色继承关系
    const inheritedRoles: string[] = [];
    try {
      const model = enforcer.getModel();
      if (model && model.model && model.model.get("g")) {
        const gModel = model.model.get("g");
        const policy = gModel?.get("g")?.policy ?? [];
        inheritedRoles.push(...policy
          .filter(p => p[0] === id)
          .map(p => p[1]));
      }
    }
    catch (error) {
      console.error("获取继承角色失败", error);
    }

    // 获取所有继承角色的权限
    const inheritedPolicies: string[][] = [];
    for (const inheritedRole of inheritedRoles) {
      const policies = await enforcer.getFilteredPolicy(0, inheritedRole);
      inheritedPolicies.push(...policies);
    }

    result.inherited = inheritedPolicies.map(policy => ({
      obj: policy[1],
      act: policy[2],
    }));
  }

  // 获取可继承的角色列表
  if (include.includes("inheritable")) {
    // 查询所有启用的角色
    const allRoles = await db.select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.status, 1));

    // 获取已经继承的角色
    const inheritedRoles: string[] = [];
    try {
      const model = enforcer.getModel();
      if (model && model.model && model.model.get("g")) {
        const gModel = model.model.get("g");
        const policy = gModel?.get("g")?.policy ?? [];
        inheritedRoles.push(...policy
          .filter(p => p[0] === id)
          .map(p => p[1]));
      }
    }
    catch (error) {
      console.error("获取继承角色失败", error);
    }

    // 过滤出可继承的角色（排除自己和已继承的）
    result.inheritable = allRoles
      .filter(r => r.id !== id && !inheritedRoles.includes(r.id))
      .map(r => ({
        role: r.id,
        name: r.name,
      }));
  }

  // 获取所有权限（直接+继承）
  if (include.includes("combined")) {
    const directPolicies = include.includes("direct")
      ? result.direct || []
      : await enforcer.getFilteredPolicy(0, id).then(policies =>
        policies.map(policy => ({ obj: policy[1], act: policy[2] })),
      );

    // 获取继承的角色ID
    const inheritedRolesIds: string[] = [];
    try {
      const model = enforcer.getModel();
      if (model && model.model && model.model.get("g")) {
        const gModel = model.model.get("g");
        const policy = gModel?.get("g")?.policy ?? [];
        inheritedRolesIds.push(...policy
          .filter(p => p[0] === id)
          .map(p => p[1]));
      }
    }
    catch (error) {
      console.error("获取继承角色失败", error);
    }

    const inheritedPoliciesPromises = inheritedRolesIds.map(async inheritedRole =>
      await enforcer.getFilteredPolicy(0, inheritedRole).then(policies =>
        policies.map(policy => ({ obj: policy[1], act: policy[2] })),
      ),
    );

    const inheritedPolicies = include.includes("inherited")
      ? result.inherited || []
      : (await Promise.all(inheritedPoliciesPromises)).flat();

    // 合并直接权限和继承权限，去重
    const combined = [...directPolicies];
    for (const policy of inheritedPolicies) {
      if (!combined.some(p => p.obj === policy.obj && p.act === policy.act)) {
        combined.push(policy);
      }
    }

    result.combined = combined;
  }

  return c.json(result, HttpStatusCodes.OK);
};

export const addPermissions: AppRouteHandler<AddPermissionsRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { permissions } = c.req.valid("json");

  // 检查角色是否存在
  const role = await db.query.roles.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!role) {
    return c.json({ message: "角色不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  const enforcer = await enforcerLaunchedPromise;

  // 添加权限
  for (const permission of permissions) {
    await enforcer.addPolicy(id, permission.obj, permission.act);
  }

  return c.json({ success: true }, HttpStatusCodes.OK);
};

export const addInherits: AppRouteHandler<AddInheritsRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { roles: inheritRoles } = c.req.valid("json");

  // 检查角色是否存在
  const role = await db.query.roles.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!role) {
    return c.json({ message: "角色不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  // 检查要继承的角色是否存在
  const existingRoles = await db.select({ id: roles.id })
    .from(roles)
    .where(eq(roles.status, 1));

  const existingRoleIds = existingRoles.map(r => r.id);

  // 过滤出存在的角色
  const validRoles = inheritRoles.filter(r => existingRoleIds.includes(r));

  const enforcer = await enforcerLaunchedPromise;

  // 添加继承关系
  for (const inheritRole of validRoles) {
    await enforcer.addGroupingPolicy(id, inheritRole);
  }

  return c.json({ success: true }, HttpStatusCodes.OK);
};

export const removePermissions: AppRouteHandler<RemovePermissionsRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { permissions } = c.req.valid("json");

  // 检查角色是否存在
  const role = await db.query.roles.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!role) {
    return c.json({ message: "角色不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  const enforcer = await enforcerLaunchedPromise;

  // 删除权限
  for (const permission of permissions) {
    await enforcer.removePolicy(id, permission.obj, permission.act);
  }

  return c.json({ success: true }, HttpStatusCodes.OK);
};

export const removeInherits: AppRouteHandler<RemoveInheritsRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { roles: inheritRoles } = c.req.valid("json");

  // 检查角色是否存在
  const role = await db.query.roles.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, id);
    },
  });

  if (!role) {
    return c.json({ message: "角色不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  const enforcer = await enforcerLaunchedPromise;

  // 删除继承关系
  for (const inheritRole of inheritRoles) {
    await enforcer.removeGroupingPolicy(id, inheritRole);
  }

  return c.json({ success: true }, HttpStatusCodes.OK);
};
