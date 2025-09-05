import type { MiddlewareHandler } from "hono";

import { Enforcer } from "casbin";

import type { AppBindings } from "@/types/lib";

import { enforcerPromise } from "@/lib/casbin";
import { API_ADMIN_PATH } from "@/lib/openapi/config";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { Resp } from "@/utils";

/**
 * 通用 Casbin 权限验证中间件
 */
export function authorize(): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const enforcer = await enforcerPromise;
    if (!(enforcer instanceof Enforcer)) {
      return c.json(Resp.fail(HttpStatusPhrases.INTERNAL_SERVER_ERROR), HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    const { roles } = c.get("jwtPayload");
    const path = c.req.path.slice(API_ADMIN_PATH.length);

    const hasPermission = await hasAnyPermission(enforcer, roles, path, c.req.method);
    if (!hasPermission) {
      return c.json(Resp.fail(HttpStatusPhrases.FORBIDDEN), HttpStatusCodes.FORBIDDEN);
    }

    await next();
  };
}

async function hasAnyPermission(enforcer: Enforcer, roles: string[], path: string, method: string) {
  // 存储所有未完成的Promise，用于在找到结果后忽略剩余请求
  const pendingPromises: Promise<void>[] = [];

  return new Promise((resolve) => {
    for (const role of roles) {
      const promise = enforcer.enforce(role, path, method)
        .then((hasPerm) => {
          if (hasPerm) {
            // 找到有权限的角色，立即返回结果
            resolve(true);
          }
          else {
            // 过滤已完成的Promise，检查是否全部完成
            const index = pendingPromises.indexOf(promise);
            if (index !== -1)
              pendingPromises.splice(index, 1);
            if (pendingPromises.length === 0) {
              // 所有角色都检查完且无权限
              resolve(false);
            }
          }
        })
        // 处理单个检查可能的异常（根据业务决定是否视为"无权限"）
        .catch(() => {
          const index = pendingPromises.indexOf(promise);
          if (index !== -1)
            pendingPromises.splice(index, 1);
          if (pendingPromises.length === 0) {
            resolve(false);
          }
        });

      pendingPromises.push(promise);
    }
  });
}
