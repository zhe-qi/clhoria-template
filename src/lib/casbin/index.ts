import { newEnforcer } from "casbin";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DrizzleCasbinAdapter } from "./adapter";

const adapter = await DrizzleCasbinAdapter.newAdapter();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const enforcerLaunchedPromise = newEnforcer(
  path.resolve(__dirname, "model.conf"),
  adapter,
);
