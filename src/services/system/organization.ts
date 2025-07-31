import type { InferSelectModel } from "drizzle-orm";

import { and, count, eq, ne } from "drizzle-orm";

import db from "@/db";
import { systemOrganization } from "@/db/schema";

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
export async function createOrganization(params: CreateOrganizationParams): Promise<OrganizationRecord> {
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

/** 获取组织列表 */
export async function getOrganizations(
  domain: string,
  searchCondition?: any,
  pagination?: { offset: number; limit: number },
): Promise<{ data: OrganizationRecord[]; total: number }> {
  const baseCondition = eq(systemOrganization.domain, domain);
  const whereCondition = searchCondition
    ? and(baseCondition, searchCondition)
    : baseCondition;

  // 获取总数
  const [{ total }] = await db
    .select({ total: count() })
    .from(systemOrganization)
    .where(whereCondition);

  // 获取数据
  let query = db
    .select()
    .from(systemOrganization)
    .where(whereCondition)
    .orderBy(systemOrganization.createdAt);

  if (pagination) {
    query = query.offset(pagination.offset).limit(pagination.limit) as any;
  }

  const data = await query;

  return { data, total };
}

/** 获取组织树形结构 */
export async function getOrganizationTree(
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
export async function getOrganizationById(
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
export async function updateOrganization(
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
export async function deleteOrganization(
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

/** 检查组织代码是否在域内唯一 */
export async function isOrganizationCodeUnique(
  code: string,
  domain: string,
  excludeId?: string,
): Promise<boolean> {
  let whereCondition = and(
    eq(systemOrganization.code, code),
    eq(systemOrganization.domain, domain),
  );

  if (excludeId) {
    whereCondition = and(whereCondition, ne(systemOrganization.id, excludeId));
  }

  const [existing] = await db
    .select({ id: systemOrganization.id })
    .from(systemOrganization)
    .where(whereCondition);

  return !existing;
}

/** 获取组织的所有子组织ID（递归） */
export async function getOrganizationDescendantIds(
  id: string,
  domain: string,
): Promise<string[]> {
  const descendants: string[] = [];
  const queue = [id];

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    const children = await db
      .select({ id: systemOrganization.id })
      .from(systemOrganization)
      .where(and(
        eq(systemOrganization.pid, currentId),
        eq(systemOrganization.domain, domain),
      ));

    for (const child of children) {
      descendants.push(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
}

/** 获取组织的所有祖先ID（递归） */
export async function getOrganizationAncestorIds(
  id: string,
  domain: string,
): Promise<string[]> {
  const ancestors: string[] = [];
  let currentId: string | null = id;

  while (currentId) {
    const [parent] = await db
      .select({ id: systemOrganization.id, pid: systemOrganization.pid })
      .from(systemOrganization)
      .where(and(
        eq(systemOrganization.id, currentId),
        eq(systemOrganization.domain, domain),
      ));

    if (!parent || !parent.pid) {
      break;
    }

    ancestors.push(parent.pid);
    currentId = parent.pid;
  }

  return ancestors;
}
