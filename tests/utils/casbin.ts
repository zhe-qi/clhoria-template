import { enforcerPromise } from "@/lib/services/casbin";

/**
 * 重新加载 Casbin 策略（用于测试环境）
 */
export async function reloadCasbinPolicy(): Promise<void> {
  const enforcer = await enforcerPromise;
  await enforcer.loadPolicy();
}
