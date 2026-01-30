import type { z } from "zod";

import type { systemRolesDetailResponse } from "./roles.schema";

import type { SystemRolesRouteHandlerType } from "./roles.types";
import { eq } from "drizzle-orm";
import db from "@/db";
import { systemRoles } from "@/db/schema";
import { executeRefineQuery, RefineQueryParamsSchema } from "@/lib/refine-query";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";

import { Resp } from "@/utils";

import { cleanRoleInheritance, enrichRolesWithParents, enrichRoleWithParents, setRoleParents } from "./roles.helpers";
import { getRoleById, getRolePermissionsAndGroupings, roleExists, saveRolePermissions, updateRoleParents, validateParentRolesExist } from "./roles.services";

export const list: SystemRolesRouteHandlerType<"list"> = async (c) => {
  const rawParams = c.req.query();

  const parseResult = RefineQueryParamsSchema.safeParse(rawParams);
  if (!parseResult.success) {
    return c.json(Resp.fail(parseResult.error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  const [error, result] = await executeRefineQuery<z.infer<typeof systemRolesDetailResponse>>({
    table: systemRoles,
    queryParams: parseResult.data,
  });

  if (error) {
    return c.json(Resp.fail(error.message), HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }

  const rolesWithParents = await enrichRolesWithParents(result.data);

  c.header("x-total-count", result.total.toString());

  return c.json(Resp.ok(rolesWithParents), HttpStatusCodes.OK);
};

export const create: SystemRolesRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const { parentRoleIds, ...roleData } = body;

  if (parentRoleIds && parentRoleIds.length > 0) {
    const invalidIds = await validateParentRolesExist(parentRoleIds);
    if (invalidIds) {
      return c.json(Resp.fail(`上级角色不存在: ${invalidIds.join(", ")}`), HttpStatusCodes.BAD_REQUEST);
    }
  }

  const [role] = await db.insert(systemRoles).values({
    ...roleData,
    createdBy: sub,
  }).returning();

  if (parentRoleIds && parentRoleIds.length > 0) {
    await setRoleParents(role.id, parentRoleIds);
  }

  const roleWithParents = await enrichRoleWithParents(role);

  return c.json(Resp.ok(roleWithParents), HttpStatusCodes.CREATED);
};

export const get: SystemRolesRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");

  const role = await getRoleById(id);

  if (!role) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const roleWithParents = await enrichRoleWithParents(role);

  return c.json(Resp.ok(roleWithParents), HttpStatusCodes.OK);
};

export const update: SystemRolesRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const { sub } = c.get("jwtPayload");

  const { parentRoleIds, ...roleData } = body;

  if (parentRoleIds !== undefined) {
    const result = await updateRoleParents(id, parentRoleIds);
    if (!result.success) {
      return c.json(Resp.fail(result.error), HttpStatusCodes.BAD_REQUEST);
    }
  }

  let updated;
  if (Object.keys(roleData).length > 0) {
    [updated] = await db
      .update(systemRoles)
      .set({
        ...roleData,
        updatedBy: sub,
      })
      .where(eq(systemRoles.id, id))
      .returning();
  }
  else {
    updated = await getRoleById(id);
  }

  if (!updated) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  const roleWithParents = await enrichRoleWithParents(updated);

  return c.json(Resp.ok(roleWithParents), HttpStatusCodes.OK);
};

export const remove: SystemRolesRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");

  await cleanRoleInheritance(id);

  const [deleted] = await db
    .delete(systemRoles)
    .where(eq(systemRoles.id, id))
    .returning({ id: systemRoles.id });

  if (!deleted) {
    return c.json(Resp.fail(HttpStatusPhrases.NOT_FOUND), HttpStatusCodes.NOT_FOUND);
  }

  return c.json(Resp.ok(deleted), HttpStatusCodes.OK);
};

export const getPermissions: SystemRolesRouteHandlerType<"getPermissions"> = async (c) => {
  const { id } = c.req.valid("param");

  const { permissions, groupings } = await getRolePermissionsAndGroupings(id);

  return c.json(Resp.ok({ permissions, groupings }), HttpStatusCodes.OK);
};

export const savePermissions: SystemRolesRouteHandlerType<"savePermissions"> = async (c) => {
  const { id } = c.req.valid("param");
  const { permissions, parentRoleIds } = c.req.valid("json");

  const exists = await roleExists(id);
  if (!exists) {
    return c.json(Resp.fail("角色不存在"), HttpStatusCodes.NOT_FOUND);
  }

  if (parentRoleIds !== undefined) {
    const result = await updateRoleParents(id, parentRoleIds);
    if (!result.success) {
      return c.json(Resp.fail(result.error), HttpStatusCodes.BAD_REQUEST);
    }
  }

  const permResult = await saveRolePermissions(id, permissions);
  if (!permResult.success) {
    return c.json(Resp.fail(permResult.error), HttpStatusCodes.BAD_REQUEST);
  }

  return c.json(Resp.ok({ added: permResult.added, removed: permResult.removed, total: permResult.total }), HttpStatusCodes.OK);
};
