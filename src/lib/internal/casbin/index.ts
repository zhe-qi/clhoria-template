import { newEnforcer, newModel } from "casbin";

import db from "@/db";
import { casbinRule } from "@/db/schema";

import { createAsyncSingleton } from "../singleton";
import { DrizzleCasbinAdapter } from "./adapter";

// Casbin 模型配置
export const casbinModelText = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act, eft

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub) && keyMatch3(r.obj, p.obj) && regexMatch(r.act, p.act)
`;

export const enforcerPromise = createAsyncSingleton("casbin", async () => {
  const model = newModel(casbinModelText);
  const adapter = await DrizzleCasbinAdapter.newAdapter(db, casbinRule);
  return newEnforcer(model, adapter);
});

/**
 * 重新加载 Casbin 策略（用于测试环境）
 */
export async function reloadCasbinPolicy(): Promise<void> {
  const enforcer = await enforcerPromise;
  await enforcer.loadPolicy();
}
