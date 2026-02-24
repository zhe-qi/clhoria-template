import { newEnforcer, newModel } from "casbin";

import db from "@/db";
import { casbinRule } from "@/db/schema";
import env from "@/env";
import logger from "@/lib/services/logger";

import { createAsyncSingleton } from "../../core/singleton";
import { DrizzleCasbinAdapter } from "./adapter";
import { watcherPromise } from "./watcher";

// Casbin model configuration / Casbin 模型配置
export const casbinModelText = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && keyMatch3(r.obj, p.obj) && regexMatch(r.act, p.act)
`;

export const enforcerPromise = createAsyncSingleton("casbin", async () => {
  const model = newModel(casbinModelText);
  const adapter = await DrizzleCasbinAdapter.newAdapter(db, casbinRule);
  const enforcer = await newEnforcer(model, adapter);

  // Do not enable watcher in test env to avoid race conditions from async pub/sub reload / 测试环境不启用 watcher，避免 pub/sub 异步 reload 导致竞态条件
  if (env.NODE_ENV !== "test") {
    const watcher = await watcherPromise;
    enforcer.setWatcher(watcher);
    watcher.setUpdateCallback(() => {
      enforcer.loadPolicy()
        .then(() => logger.info("[Casbin]: 策略已重新加载"))
        .catch(err => logger.error({ err }, "[Casbin]: 策略重新加载失败"));
    });
  }

  return enforcer;
});
