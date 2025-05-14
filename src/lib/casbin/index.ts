import { newEnforcer } from "casbin";

import { createDrizzleAdapter } from "./adapter";

const casbinEnforcer = newEnforcer("src/lib/casbin/model.conf", createDrizzleAdapter());

export default casbinEnforcer;
