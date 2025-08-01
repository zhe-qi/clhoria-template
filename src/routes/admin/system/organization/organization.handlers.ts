import type { InferSelectModel } from "drizzle-orm";

import { and, count, eq, ilike, or } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import db from "@/db";
import { systemOrganization } from "@/db/schema";
import { getDuplicateKeyError, Status } from "@/lib/enums";
import { pagination } from "@/lib/pagination";
import { pickContext } from "@/utils/tools/hono-helpers";

import type { SystemOrganizationRouteHandlerType } from "./organization.index";

export type OrganizationRecord = InferSelectModel<typeof systemOrganization>;

interface OrganizationTreeNode extends OrganizationRecord {
  children?: OrganizationTreeNode[];
}

interface CreateOrganizationParams {
  domain: string;
  code: string;
  name: string;
  description?: string | null;
  pid?: string | null;
  status: number;
  createdBy: string;
}

interface UpdateOrganizationParams {
  name?: string;
  description?: string | null;
  pid?: string | null;
  status?: number;
  updatedBy: string;
}

/** 创建组织 */
async function createOrganization(params: CreateOrganizationParams): Promise<OrganizationRecord> {
  // 如果指定了父组织，验证父组织是否存在且在同一域中
  if (params.pid) {
    const [parentOrg] = await db
      .select()
      .from(systemOrganization)
      .where(and(
        eq(systemOrganization.id, params.pid),
        eq(systemOrganization.domain, params.domain),
      ));

    if (!parentOrg) {
      throw new Error("父组织不存在或不在同一域中");
    }
  }

  const [organization] = await db
    .insert(systemOrganization)
    .values(params)
    .returning();

  return organization;
}

/** 获取组织树形结构 */
async function getOrganizationTree(
  domain: string,
  status?: number,
): Promise<OrganizationTreeNode[]> {
  let whereCondition = eq(systemOrganization.domain, domain);

  if (status !== undefined) {
    whereCondition = and(whereCondition, eq(systemOrganization.status, status))!;
  }

  // 获取所有组织
  const organizations = await db
    .select()
    .from(systemOrganization)
    .where(whereCondition)
    .orderBy(systemOrganization.createdAt);

  // 构建树形结构
  return buildOrganizationTree(organizations);
}

/** 构建组织树形结构 */
function buildOrganizationTree(organizations: OrganizationRecord[]): OrganizationTreeNode[] {
  const orgMap = new Map<string, OrganizationTreeNode>();
  const roots: OrganizationTreeNode[] = [];

  // 创建节点映射
  organizations.forEach((org) => {
    orgMap.set(org.id, { ...org, children: [] });
  });

  // 构建树形结构
  organizations.forEach((org) => {
    const node = orgMap.get(org.id)!;

    if (org.pid) {
      const parent = orgMap.get(org.pid);
      if (parent) {
        parent.children!.push(node);
      }
      else {
        // 父节点不存在，作为根节点
        roots.push(node);
      }
    }
    else {
      // 根节点
      roots.push(node);
    }
  });

  return roots;
}

/** 根据ID获取组织 */
async function getOrganizationById(
  id: string,
  domain: string,
): Promise<OrganizationRecord | null> {
  const [organization] = await db
    .select()
    .from(systemOrganization)
    .where(and(
      eq(systemOrganization.id, id),
      eq(systemOrganization.domain, domain),
    ));

  return organization || null;
}

/** 更新组织 */
async function updateOrganization(
  id: string,
  domain: string,
  params: UpdateOrganizationParams,
): Promise<OrganizationRecord | null> {
  // 如果要更新父组织，需要验证
  if (params.pid !== undefined) {
    if (params.pid) {
      // 验证父组织存在且在同一域中
      const [parentOrg] = await db
        .select()
        .from(systemOrganization)
        .where(and(
          eq(systemOrganization.id, params.pid),
          eq(systemOrganization.domain, domain),
        ));

      if (!parentOrg) {
        throw new Error("父组织不存在或不在同一域中");
      }

      // 防止循环引用
      const isCircular = await checkCircularReference(id, params.pid, domain);
      if (isCircular) {
        throw new Error("不能将父组织设置为自己的子组织，这会造成循环引用");
      }
    }
  }

  const [updated] = await db
    .update(systemOrganization)
    .set({
      ...params,
      updatedAt: new Date().toISOString(),
    })
    .where(and(
      eq(systemOrganization.id, id),
      eq(systemOrganization.domain, domain),
    ))
    .returning();

  return updated || null;
}

/** 检查循环引用 */
async function checkCircularReference(
  orgId: string,
  targetPid: string,
  domain: string,
): Promise<boolean> {
  if (orgId === targetPid) {
    return true;
  }

  // 检查目标父组织的所有祖先
  let currentPid: string | undefined = targetPid;
  const visited = new Set<string>();

  while (currentPid && !visited.has(currentPid)) {
    visited.add(currentPid);

    const [parent] = await db
      .select({ pid: systemOrganization.pid })
      .from(systemOrganization)
      .where(and(
        eq(systemOrganization.id, currentPid),
        eq(systemOrganization.domain, domain),
      ));

    if (!parent) {
      break;
    }

    if (parent.pid === orgId) {
      return true;
    }

    currentPid = parent.pid || undefined;
  }

  return false;
}

/** 删除组织 */
async function deleteOrganization(
  id: string,
  domain: string,
): Promise<boolean> {
  // 检查是否有子组织
  const [childCount] = await db
    .select({ count: count() })
    .from(systemOrganization)
    .where(and(
      eq(systemOrganization.pid, id),
      eq(systemOrganization.domain, domain),
    ));

  if (childCount.count > 0) {
    throw new Error("存在子组织，无法删除");
  }

  const [deleted] = await db
    .delete(systemOrganization)
    .where(and(
      eq(systemOrganization.id, id),
      eq(systemOrganization.domain, domain),
    ))
    .returning({ id: systemOrganization.id });

  return !!deleted;
}

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
      status: body.status ?? Status.ENABLED,
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
