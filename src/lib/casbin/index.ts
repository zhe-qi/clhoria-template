import { newEnforcer } from "casbin";

import { DrizzleCasbinAdapter } from "./adapter";

const adapter = await DrizzleCasbinAdapter.newAdapter();
export const enforcerLaunchedPromise = newEnforcer("src/lib/casbin/model.conf", adapter);
