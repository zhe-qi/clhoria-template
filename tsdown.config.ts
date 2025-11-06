import { defineConfig } from "tsdown/config";

export default defineConfig({
  entry: ["./src/index.ts"],
  platform: "node",
  sourcemap: true,
  clean: true,
  dts: false,
  format: ["esm"],
  target: "esnext",
  minify: false,
  alias: {
    "@": "./src",
  },
  skipNodeModulesBundle: true,
  shims: true,
  external: ["papaparse"],
});
