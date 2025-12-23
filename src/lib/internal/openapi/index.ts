import env from "@/env";

import { createApps, createMainDocConfigurator } from "./helper";

export default function configureOpenAPI() {
  const isNotProd = env.NODE_ENV !== "production";
  const apps = createApps();

  const configureMainDoc = isNotProd ? createMainDocConfigurator(apps) : null;
  return { ...apps, configureMainDoc };
}
