import type { SystemUsersRouteHandlerType } from "./users.types";

import { RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { omit, Resp } from "@/utils";

import { checkUserBuiltIn, createUser, deleteUser, getUserById, getUserWithRoles, listUsers, saveUserRoles, updateUser, validateRolesExist } from "./users.services";

export const list: SystemUsersRouteHandlerType<"list"> = async (c) => {
  const query = c.req.query();

  const parseResult = RefineQueryParamsSchema.safeParse(query);
  if (!parseResult.success) {
    return c.json(Resp.fail(parseResult.error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [error, result] = await listUsers(parseResult.data);
  if (error) {
    return c.json(Resp.fail(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  const safeData = result.data.map(({ password, ...user }) => user);
  c.header("x-total-count", result.total.toString());

  return c.json(Resp.ok(safeData), HttpStatusCodes.OK);
};

export const create: SystemUsersRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const created = await createUser(body, sub);
  const userWithoutPassword = omit(created, ["password"]);

  return c.json(Resp.ok(userWithoutPassword), HttpStatusCodes.CREATED);
};

export const get: SystemUsersRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const user = await getUserById(id);

  if (!user) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const roles = user.systemUserRoles.map(({ role: { id, name } }) => ({ id, name }));
  const userWithoutPassword = omit(user, ["password", "systemUserRoles"]);

  return c.json(Resp.ok({ ...userWithoutPassword, roles }), HttpStatusCodes.OK);
};

export const update: SystemUsersRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  // 检查是否为内置用户
  const builtIn = await checkUserBuiltIn(id);

  if (builtIn === null) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  // 内置用户不允许修改状态
  if (builtIn && body.status !== undefined) {
    return c.json(Resp.fail("内置用户不允许修改状态"), HttpStatusCodes.FORBIDDEN);
  }

  // 不允许直接更新密码
  const updateData = omit(body, ["password"]);

  const updated = await updateUser(id, updateData, sub);

  if (!updated) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const userWithoutPassword = omit(updated, ["password"]);

  return c.json(Resp.ok(userWithoutPassword), HttpStatusCodes.OK);
};

export const remove: SystemUsersRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  // 检查是否为内置用户
  const builtIn = await checkUserBuiltIn(id);

  if (builtIn === null) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  if (builtIn) {
    return c.json(Resp.fail("内置用户不允许删除"), HttpStatusCodes.FORBIDDEN);
  }

  const deleted = await deleteUser(id);

  if (!deleted) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(deleted), HttpStatusCodes.OK);
};

export const saveRoles: SystemUsersRouteHandlerType<"saveRoles"> = async (c) => {
  const { userId } = c.req.valid("param");
  const { roleIds } = c.req.valid("json");

  // 获取用户及其当前角色
  const userWithRoles = await getUserWithRoles(userId);

  if (!userWithRoles) {
    return c.json(Resp.fail("用户不存在"), HttpStatusCodes.NOT_FOUND);
  }

  // 验证角色存在性
  const invalidRoleIds = await validateRolesExist(roleIds);
  if (invalidRoleIds) {
    return c.json(Resp.fail(`角色不存在: ${invalidRoleIds.join(", ")}`), HttpStatusCodes.NOT_FOUND);
  }

  // 保存用户角色
  const currentRoleIds = userWithRoles.systemUserRoles.map(ur => ur.roleId);
  const result = await saveUserRoles(userId, roleIds, currentRoleIds);

  return c.json(Resp.ok(result), HttpStatusCodes.OK);
};
