import type { z } from "zod";

import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { selectRolesSchema } from "@/db/schema";

import db from "@/db";
import { roles } from "@/db/schema";
import { enforcerLaunchedPromise } from "@/lib/casbin";
import { getQueryValidationError, updatesZodError } from "@/lib/constants";
import paginatedQuery from "@/lib/pagination";

import type { RolesRouteHandlerType as RouteHandlerType } from "./roles.index";

type PaginatedResult = z.infer<typeof selectRolesSchema>;

export const list: RouteHandlerType<"list"> = async (c) => {
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

export const create: RouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");

  const [result] = await db.insert(roles).values(body).returning();

  return c.json(result, HttpStatusCodes.OK);
};

export const getOne: RouteHandlerType<"getOne"> = async (c) => {
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

export const patch: RouteHandlerType<"patch"> = async (c) => {
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

export const remove: RouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  const [result] = await db.delete(roles)
    .where(eq(roles.id, id))
    .returning();

  if (!result) {
    return c.json({ message: "角色不存在" }, HttpStatusCodes.NOT_FOUND);
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const getPermissions: RouteHandlerType<"getPermissions"> = async (c) => {
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

  const [direct, inherited, inheritable, combined] = [
    include.includes("direct"),
    include.includes("inherited"),
    include.includes("inheritable"),
    include.includes("combined"),
  ];

  // 创建并行任务数组
  const tasks: Promise<void>[] = [];

  // 获取继承的角色列表，避免重复获取
  let inheritedRoles: string[] = [];
  if (inherited || combined || inheritable) {
    try {
      const model = enforcer.getModel();
      if (model?.model?.get("g")) {
        const gModel = model.model.get("g");
        const policy = gModel?.get("g")?.policy ?? [];
        inheritedRoles = policy
          .filter(p => p[0] === id)
          .map(p => p[1]);
      }
    }
    catch (error) {
      console.error("获取继承角色失败", error);
    }
  }

  // 格式化策略的辅助函数
  const formatPolicy = (policy: string[]) => ({
    obj: policy[1],
    act: policy[2],
  });

  // 直接获取直接权限
  let directPolicyPromise: Promise<string[][]> | null = null;
  if (direct || combined) {
    directPolicyPromise = enforcer.getFilteredPolicy(0, id);

    if (direct) {
      tasks.push(
        directPolicyPromise.then((policies) => {
          result.direct = policies.map(formatPolicy);
        }),
      );
    }
  }

  // 继承权限获取和处理
  let inheritedPoliciesPromise: Promise<Array<{ obj: string; act: string }>> | null = null;
  if (inherited || combined) {
    // 并行获取所有继承角色的权限
    inheritedPoliciesPromise = Promise.all(
      inheritedRoles.map(role => enforcer.getFilteredPolicy(0, role)),
    ).then(policiesArray =>
      policiesArray.flat().map(formatPolicy),
    );

    if (inherited) {
      tasks.push(
        inheritedPoliciesPromise.then((policies) => {
          result.inherited = policies;
        }),
      );
    }
  }

  // 获取可继承的角色列表
  if (inheritable) {
    tasks.push(
      db.select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(eq(roles.status, 1))
        .then((allRoles) => {
          // 过滤出可继承的角色（排除自己和已继承的）
          result.inheritable = allRoles
            .filter(r => r.id !== id && !inheritedRoles.includes(r.id))
            .map(r => ({
              role: r.id,
              name: r.name,
            }));
        }),
    );
  }

  // 获取所有权限（直接+继承）
  if (combined) {
    tasks.push(
      Promise.all([
        directPolicyPromise?.then(policies => policies.map(formatPolicy)) || Promise.resolve([]),
        inheritedPoliciesPromise || Promise.resolve([]),
      ]).then(([directPolicies, inheritedPolicies]) => {
        // 使用Set来实现更高效的去重
        const uniquePolicies = new Map<string, { obj: string; act: string }>();

        // 添加直接权限
        directPolicies.forEach((policy) => {
          const key = `${policy.obj}:${policy.act}`;
          uniquePolicies.set(key, policy);
        });

        // 添加继承权限
        inheritedPolicies.forEach((policy) => {
          const key = `${policy.obj}:${policy.act}`;
          if (!uniquePolicies.has(key)) {
            uniquePolicies.set(key, policy);
          }
        });

        result.combined = Array.from(uniquePolicies.values());
      }),
    );
  }

  // 等待所有并行任务完成
  await Promise.all(tasks);

  return c.json(result, HttpStatusCodes.OK);
};

export const addPermissions: RouteHandlerType<"addPermissions"> = async (c) => {
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

  // 使用批量添加权限
  const policies = permissions.map(permission => [id, permission.obj, permission.act]);
  await enforcer.addPolicies(policies);

  return c.json({ success: true }, HttpStatusCodes.OK);
};

export const addInherits: RouteHandlerType<"addInherits"> = async (c) => {
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

export const removePermissions: RouteHandlerType<"removePermissions"> = async (c) => {
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

  // 使用批量删除权限
  const policies = permissions.map(permission => [id, permission.obj, permission.act]);
  await enforcer.removePolicies(policies);

  return c.json({ success: true }, HttpStatusCodes.OK);
};

export const removeInherits: RouteHandlerType<"removeInherits"> = async (c) => {
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
