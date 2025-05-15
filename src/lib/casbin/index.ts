import { newEnforcer, newModelFromString } from "casbin";

import { DrizzleCasbinAdapter } from "./adapter";

const model = newModelFromString(`
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && keyMatch(r.obj, p.obj) && (r.act == p.act || p.act == "*")
`);

const adapter = await DrizzleCasbinAdapter.newAdapter();

export const enforcerLaunchedPromise = newEnforcer(model, adapter);
