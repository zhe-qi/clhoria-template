import { newEnforcer, newModelFromString } from "casbin";

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
m = r.sub == p.sub && keyMatch(r.obj, p.obj) && (r.act == p.act || p.act == "*") && r.dom == p.dom
`);

const adapter = await DrizzleCasbinAdapter.newAdapter();

export const enforcerLaunchedPromise = newEnforcer(model, adapter);
