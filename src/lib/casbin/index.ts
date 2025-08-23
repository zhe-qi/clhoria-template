import { newEnforcer, newModel } from "casbin";

import db from "@/db";
import { casbinRule } from "@/db/schema";

import { DrizzleCasbinAdapter } from "./adapter";

const model = newModel(`
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
`);

const adapter = await DrizzleCasbinAdapter.newAdapter(db, casbinRule);

export const enforcerPromise = newEnforcer(model, adapter);
