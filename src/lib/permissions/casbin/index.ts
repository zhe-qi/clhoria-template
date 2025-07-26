import { newEnforcer, newModelFromString } from "casbin";

import db from "@/db";
import { casbinRule, sysRole } from "@/db/schema";

import { DrizzleCasbinAdapter } from "./adapter";

const model = newModelFromString(`
[request_definition]
r = sub, obj, act, dom

[policy_definition]
p = sub, obj, act, dom, eft

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.obj == p.obj && r.act == p.act && r.dom == p.dom
`);

const adapter = await DrizzleCasbinAdapter.newAdapter(db, casbinRule, sysRole);

export const enforcerLaunchedPromise = newEnforcer(model, adapter);
