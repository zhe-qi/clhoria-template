import devServer from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      port: Number.parseInt(env.PORT, 10),
    },
    build: {
      ssr: "src/index.ts",
      outDir: "dist",
      minify: false,
      sourcemap: true,
      target: "esnext",
      rolldownOptions: {
        output: {
          entryFileNames: "index.js",
          format: "esm",
          inlineDynamicImports: true,
        },
        treeshake: true,
      },
      oxc: {
        transform: {
          target: "esnext",
        },
      },
    },
    resolve: {
      alias: {
        "@": path.join(process.cwd(), "./src"),
        "~": path.join(process.cwd(), "."),
      },
    },
    plugins: [
      devServer({
        entry: "src/index.ts",
        adapter: nodeAdapter(),
      }),
    ],
  };
});
