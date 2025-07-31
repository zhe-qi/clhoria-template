import type { InferSelectModel } from "drizzle-orm";

import { and, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import { systemOrganization } from "@/db/schema";
import { getDuplicateKeyError } from "@/lib/enums";
import { pagination } from "@/lib/pagination";
import {
  createOrganization,
  deleteOrganization,
  getOrganizationById,
  getOrganizationTree,
  updateOrganization,
} from "@/services/system/organization";
import { pickContext } from "@/utils/tools/hono-helpers";

import type { SystemOrganizationRouteHandlerType } from "./organization.index";

export const list: SystemOrganizationRouteHandlerType<"list"> = async (c) => {
  const params = c.req.valid("query");
  const domain = c.get("userDomain");

  let searchCondition = eq(systemOrganization.domain, domain);

  // 搜索条件
  if (params.search) {
    const searchFields = or(
      ilike(systemOrganization.code, `%${params.search}%`),
      ilike(systemOrganization.name, `%${params.search}%`),
      systemOrganization.description ? ilike(systemOrganization.description, `%${params.search}%`) : undefined,
    );
    if (searchFields) {
      searchCondition = and(searchCondition, searchFields)!;
    }
  }

  const result = await pagination<InferSelectModel<typeof systemOrganization>>(
    systemOrganization,
    searchCondition,
    { page: params.page, limit: params.limit },
  );

  return c.json(result, HttpStatusCodes.OK);
};

export const tree: SystemOrganizationRouteHandlerType<"tree"> = async (c) => {
  const params = c.req.valid("query");
  const domain = c.get("userDomain");

  const treeData = await getOrganizationTree(domain, params.status);

  return c.json(treeData, HttpStatusCodes.OK);
};

export const create: SystemOrganizationRouteHandlerType<"create"> = async (c) => {
  const body = c.req.valid("json");
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

  try {
    const organization = await createOrganization({
      ...body,
      domain,
      createdBy: userId,
      // 确保 status 有默认值
      status: body.status ?? 1,
    });

    return c.json(organization, HttpStatusCodes.CREATED);
  }
  catch (error: any) {
    // PostgreSQL 唯一约束错误代码 23505 或包含相关错误文本
    if (error.code === "23505"
      || error.cause?.code === "23505"
      || error.original?.code === "23505"
      || error.message?.includes("duplicate key")
      || error.message?.includes("unique constraint")
      || error.message?.includes("violates unique constraint")) {
      return c.json(
        getDuplicateKeyError("code", "组织代码已存在"),
        HttpStatusCodes.CONFLICT,
      );
    }

    // 业务逻辑错误
    if (error.message?.includes("父组织不存在")) {
      return c.json(
        { message: error.message },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    throw error;
  }
};

export const get: SystemOrganizationRouteHandlerType<"get"> = async (c) => {
  const { id } = c.req.valid("param");
  const domain = c.get("userDomain");

  const organization = await getOrganizationById(id, domain);

  if (!organization) {
    return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(organization, HttpStatusCodes.OK);
};

export const update: SystemOrganizationRouteHandlerType<"update"> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const [domain, userId] = pickContext(c, ["userDomain", "userId"]);

  try {
    const updated = await updateOrganization(id, domain, {
      ...body,
      updatedBy: userId,
    });

    if (!updated) {
      return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json(updated, HttpStatusCodes.OK);
  }
  catch (error: any) {
    // 业务逻辑错误
    if (error.message?.includes("父组织不存在")
      || error.message?.includes("循环引用")) {
      return c.json(
        { message: error.message },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    throw error;
  }
};

export const remove: SystemOrganizationRouteHandlerType<"remove"> = async (c) => {
  const { id } = c.req.valid("param");
  const domain = c.get("userDomain");

  try {
    const deleted = await deleteOrganization(id, domain);

    if (!deleted) {
      return c.json({ message: HttpStatusPhrases.NOT_FOUND }, HttpStatusCodes.NOT_FOUND);
    }

    return c.body(null, HttpStatusCodes.NO_CONTENT);
  }
  catch (error: any) {
    // 业务逻辑错误
    if (error.message?.includes("存在子组织")) {
      return c.json(
        { message: error.message },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    throw error;
  }
};
