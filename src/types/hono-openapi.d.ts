import type { PermissionConfigOptions } from "@/lib/permissions/permission-config";
import type {PermissionConfig } from '@/lib/permissions/permission-inference'
declare module "@hono/zod-openapi" {
  interface RouteConfig {
    /** 操作ID */
    operationId?: string;
    /** 权限配置 */
    permission?: PermissionConfig;
    /** 权限选项 */
    permissionOptions?: PermissionConfigOptions;
  }
}
