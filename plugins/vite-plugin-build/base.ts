/* eslint-disable e18e/prefer-static-regex */
/* eslint-disable style/max-statements-per-line */
/* eslint-disable no-console */
import type { Dirent } from "node:fs";
import type { ConfigEnv, Plugin, ResolvedConfig, UserConfig } from "vite";

import type { GetEntryContentOptions } from "./entry/index.ts";
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { builtinModules } from "node:module";

import { join, resolve } from "node:path";

import { getEntryContent } from "./entry/index.ts";

/**
 * Target platform for native dependency installation.
 * Used for cross-compilation (e.g. building on macOS for Linux deployment).
 * 目标平台。用于交叉编译（如 macOS 上构建 Linux 部署包）。
 * @default undefined (use build machine's platform)
 */
export type TargetPlatform = "linux-x64" | "linux-arm64" | "darwin-arm64" | "darwin-x64" | "win32-x64";

export type BuildOptions = {
  /**
   * @default ['src/index.ts', './src/index.tsx', './app/server.ts']
   */
  entry?: string | string[];
  /**
   * @default './dist'
   */
  output?: string;
  outputDir?: string;
  external?: string[];
  /**
   * Bundle node_modules dependencies into the output.
   * - true: All JS deps are bundled into a single file. Native binaries (.node/.wasm)
   *   from `nativeDeps` packages are copied to dist/native/.
   * - false: All node_modules are excluded (for Docker/container deployments).
   * 将 node_modules 依赖打包进产物。
   * - true: 所有 JS 依赖打包为单文件。`nativeDeps` 中的原生二进制复制到 dist/native/。
   * - false: 排除所有 node_modules（适用于 Docker 部署）。
   * @default false
   */
  bundleDeps?: boolean;
  /**
   * Packages that contain native binaries (.node / .wasm).
   * Their JS code is bundled normally; binary files are copied to dist/native/.
   * Only takes effect when bundleDeps is true.
   * 包含原生二进制（.node / .wasm）的包。
   * JS 代码正常打包；二进制文件复制到 dist/native/。仅 bundleDeps: true 时生效。
   * @example ["@node-rs/argon2", "excelize-wasm"]
   */
  nativeDeps?: string[];
  /**
   * Target platform for native dependency installation.
   * When set, `npm install` uses --os/--cpu flags to fetch the target platform's binaries.
   * Leave undefined to use the build machine's current platform.
   * 目标平台。设置后 npm install 使用 --os/--cpu 下载目标平台的二进制。
   * 不设置则使用当前构建机器的平台。
   * @example 'linux-x64'
   */
  targetPlatform?: TargetPlatform;
  /**
   * Extra files to copy into dist/native/.
   * Use for custom .wasm files, worker binaries, or any non-npm native assets.
   * Paths are relative to the project root.
   * 额外复制到 dist/native/ 的文件。
   * 用于自定义 .wasm 文件、Worker 二进制、或任何非 npm 的原生资产。
   * 路径相对于项目根目录。
   * @example ["src/workers/compute.wasm", "vendor/libfoo.node"]
   */
  nativeAssets?: string[];
  /**
   * @default true
   */
  minify?: boolean;
  emptyOutDir?: boolean;
  apply?: ((this: void, config: UserConfig, env: ConfigEnv) => boolean) | undefined;
} & Omit<GetEntryContentOptions, "entry">;

const PLATFORM_MAP: Record<TargetPlatform, { os: string; cpu: string }> = {
  "linux-x64": { os: "linux", cpu: "x64" },
  "linux-arm64": { os: "linux", cpu: "arm64" },
  "darwin-arm64": { os: "darwin", cpu: "arm64" },
  "darwin-x64": { os: "darwin", cpu: "x64" },
  "win32-x64": { os: "win32", cpu: "x64" },
};

export const defaultOptions: Required<
  Omit<
    BuildOptions,
    | "bundleDeps"
    | "entryContentAfterHooks"
    | "entryContentBeforeHooks"
    | "entryContentDefaultExportHook"
    | "nativeAssets"
    | "nativeDeps"
    | "targetPlatform"
  >
> = {
  entry: ["src/index.ts", "./src/index.tsx", "./app/server.ts"],
  output: "index.js",
  outputDir: "./dist",
  external: [],
  minify: true,
  emptyOutDir: false,
  apply: (_config, { command, mode }) => {
    if (command === "build" && mode !== "client") {
      return true;
    }
    return false;
  },
  staticPaths: [],
  preset: "hono",
  wrapWithMainApp: false,
};

/**
 * ncc-style native dependency extraction:
 * 1. Write a temp package.json with pinned versions of nativeDeps
 * 2. `npm install` to fetch platform-correct binaries
 * 3. Collect all .node/.wasm files and copy them to dist root
 * 4. Delete node_modules/, package.json, package-lock.json
 *
 * Result: dist/index.js + *.node + *.wasm (flat, zero node_modules)
 *
 * ncc 风格原生依赖提取：
 * 1. 写入临时 package.json（锁定 nativeDeps 版本）
 * 2. npm install 拉取当前平台的二进制
 * 3. 将所有 .node/.wasm 文件提取到 dist 根目录
 * 4. 删除 node_modules/、package.json、package-lock.json
 */
/**
 * Resolve platform-specific sub-packages from a package's optionalDependencies.
 * Matches sub-packages whose name contains both the target os and cpu.
 * e.g. targetPlatform "linux-x64" matches "@node-rs/argon2-linux-x64-gnu", "@node-rs/argon2-linux-x64-musl"
 * 从包的 optionalDependencies 中解析出目标平台的子包。
 */
function resolvePlatformSubPackages(
  rootDir: string,
  pkg: string,
  targetPlatform: TargetPlatform,
): Record<string, string> {
  const { os, cpu } = PLATFORM_MAP[targetPlatform];
  const result: Record<string, string> = {};

  try {
    const pkgJson = JSON.parse(readFileSync(resolve(rootDir, "node_modules", pkg, "package.json"), "utf-8")) as {
      optionalDependencies?: Record<string, string>;
    };
    const optDeps = pkgJson.optionalDependencies ?? {};
    for (const [depName, depVersion] of Object.entries(optDeps)) {
      // napi-rs convention: @scope/name-{os}-{cpu}[-variant]
      // Check that the sub-package name contains both os and cpu tokens
      if (depName.includes(os) && depName.includes(cpu)) {
        result[depName] = depVersion;
      }
    }
  }
  catch {}

  return result;
}

function installAndExtractNativeDeps(
  rootDir: string,
  outDir: string,
  nativeDeps: string[],
  targetPlatform?: TargetPlatform,
): void {
  // 1. Build dependency list / 构建依赖列表
  const deps: Record<string, string> = {};
  for (const pkg of nativeDeps) {
    let version = "latest";
    try {
      const raw = JSON.parse(readFileSync(resolve(rootDir, "node_modules", pkg, "package.json"), "utf-8")) as { version: string };
      version = raw.version;
    }
    catch {}

    if (targetPlatform) {
      // When cross-compiling, resolve platform sub-packages and skip the main package
      // (its JS is already bundled; we only need the binary sub-packages).
      // 交叉编译时：解析平台子包，跳过主包（JS 已打包，只需二进制子包）。
      const subPkgs = resolvePlatformSubPackages(rootDir, pkg, targetPlatform);
      if (Object.keys(subPkgs).length > 0) {
        // Has platform sub-packages (napi-rs style) → install only those
        Object.assign(deps, subPkgs);
      }
      else {
        // No platform sub-packages (e.g. excelize-wasm) → install normally
        deps[pkg] = version;
      }
    }
    else {
      deps[pkg] = version;
    }
  }

  // 2. Install into dist / 在 dist 目录安装
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "package.json"), JSON.stringify({ private: true, dependencies: deps }, null, 2));

  const depList = Object.entries(deps).map(([k, v]) => `${k}@${v}`).join(", ");
  if (targetPlatform) {
    console.log(`[vite-build] 安装原生依赖 (目标平台: ${targetPlatform}): ${depList}`);
  }
  else {
    console.log(`[vite-build] 安装原生依赖: ${depList}`);
  }
  // --force bypasses platform checks when cross-installing for a foreign os/cpu
  // --force 跳过平台检查，允许在 macOS 上安装 linux 的 native 包
  const forceFlag = targetPlatform ? " --force" : "";
  execSync(`npm install --omit=dev --ignore-scripts=false${forceFlag}`, { cwd: outDir, stdio: "inherit" });

  // 3. Walk dist/node_modules, copy .node/.wasm to dist/native/ / 遍历提取二进制到 dist/native/
  const nmDir = resolve(outDir, "node_modules");
  const nativeDir = resolve(outDir, "native");
  mkdirSync(nativeDir, { recursive: true });
  if (existsSync(nmDir)) {
    const files = readdirSync(nmDir, { recursive: true });
    for (const file of files) {
      const fileName = String(file);
      if (fileName.endsWith(".node") || fileName.endsWith(".wasm") || fileName.endsWith(".wasm.gz")) {
        const baseName = fileName.split("/").pop()!;
        copyFileSync(join(nmDir, fileName), resolve(nativeDir, baseName));
        console.log(`[vite-build] 已提取原生二进制: native/${baseName}`);
      }
    }
  }

  // 4. Clean up / 清理
  rmSync(resolve(outDir, "node_modules"), { recursive: true, force: true });
  try { unlinkSync(resolve(outDir, "package.json")); }
  catch {}
  try { unlinkSync(resolve(outDir, "package-lock.json")); }
  catch {}
}

/**
 * Copy arbitrary files to dist/native/.
 * 将任意文件复制到 dist/native/。
 */
function copyNativeAssets(rootDir: string, outDir: string, assets: string[]): void {
  const nativeDir = resolve(outDir, "native");
  mkdirSync(nativeDir, { recursive: true });
  for (const asset of assets) {
    const srcPath = resolve(rootDir, asset);
    if (!existsSync(srcPath)) {
      console.warn(`[vite-build] nativeAssets 文件不存在，跳过: ${asset}`);
      continue;
    }
    const baseName = asset.split("/").pop()!;
    copyFileSync(srcPath, resolve(nativeDir, baseName));
    console.log(`[vite-build] 已复制 nativeAsset: native/${baseName}`);
  }
}

const buildPlugin = (options: BuildOptions): Plugin => {
  const virtualEntryId = "virtual:build-entry-module";
  const resolvedVirtualEntryId = `\0${virtualEntryId}`;
  let config: ResolvedConfig;
  const output = options.output ?? defaultOptions.output;
  const preset = options.preset ?? defaultOptions.preset;
  const bundleDeps = options.bundleDeps ?? false;
  const nativeDeps = options.nativeDeps ?? [];
  const nativeAssets = options.nativeAssets ?? [];
  const targetPlatform = options.targetPlatform;

  return {
    name: "@hono/vite-build",
    configResolved: async (resolvedConfig) => {
      config = resolvedConfig;
    },
    resolveId(id) {
      if (id === virtualEntryId) {
        return resolvedVirtualEntryId;
      }
    },
    async load(id) {
      if (id === resolvedVirtualEntryId) {
        const staticPaths: string[] = options.staticPaths ?? [];
        const direntPaths: Dirent[] = [];
        try {
          const publicDirPaths = readdirSync(resolve(config.root, config.publicDir), {
            withFileTypes: true,
          });
          direntPaths.push(...publicDirPaths);
          const buildOutDirPaths = readdirSync(resolve(config.root, config.build.outDir), {
            withFileTypes: true,
          });
          direntPaths.push(...buildOutDirPaths);
        }
        catch {}

        const uniqueStaticPaths = new Set<string>();

        direntPaths.forEach((p) => {
          if (p.isDirectory()) {
            uniqueStaticPaths.add(`/${p.name}/*`);
          }
          else {
            if (p.name === output) {
              return;
            }
            uniqueStaticPaths.add(`/${p.name}`);
          }
        });

        staticPaths.push(...[...uniqueStaticPaths]);

        const entry = options.entry ?? defaultOptions.entry;
        return await getEntryContent({
          entry: Array.isArray(entry) ? entry : [entry],
          entryContentBeforeHooks: options.entryContentBeforeHooks,
          entryContentAfterHooks: options.entryContentAfterHooks,
          entryContentDefaultExportHook: options.entryContentDefaultExportHook,
          staticPaths,
          preset,
          wrapWithMainApp: options.wrapWithMainApp ?? defaultOptions.wrapWithMainApp,
        });
      }
    },
    apply: options?.apply ?? defaultOptions.apply,
    renderChunk(code) {
      if (!bundleDeps || nativeDeps.length === 0) return;

      // Rewrite __require("./xxx.node") → __require("./native/xxx.node")
      // napi-rs packages use this pattern for local .node file loading
      // napi-rs 包使用此模式加载本地 .node 文件
      return code.replace(
        /(__require|require)\(["']\.\/([^"']*\.node)["']\)/g,
        (_, fn, file) => {
          const baseName = file.split("/").pop();
          return `${fn}("./native/${baseName}")`;
        },
      );
    },
    config: async (): Promise<UserConfig> => {
      let externalList: (string | RegExp)[];

      if (bundleDeps) {
        // Build regexes to mark platform-specific binary packages as external.
        // e.g. "@node-rs/argon2" → matches "@node-rs/argon2-darwin-arm64", "@node-rs/argon2-linux-x64-musl" etc.
        // The main package JS is still bundled; only the platform binary sub-packages are external.
        // 构建正则将平台特定的二进制包标记为 external。主包 JS 仍然打包，仅排除平台二进制子包。
        const nativeBinaryPatterns = nativeDeps.map((pkg) => {
          const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          return new RegExp(`^${escaped}-`);
        });

        externalList = [
          ...builtinModules,
          /^node:/,
          ...nativeBinaryPatterns,
          ...(options?.external ?? []),
        ];
      }
      else {
        externalList = [...builtinModules, /^node:/, /node_modules/];
      }

      return {
        ssr: {
          target: "node",
          // When bundleDeps is true, inline all node_modules except nativeDeps
          // bundleDeps 为 true 时，将所有 node_modules 打包进 bundle（nativeDeps 除外）
          noExternal: bundleDeps ? true : undefined,
        },
        build: {
          outDir: options?.outputDir ?? defaultOptions.outputDir,
          emptyOutDir: options?.emptyOutDir ?? defaultOptions.emptyOutDir,
          minify: options?.minify ?? defaultOptions.minify,
          ssr: true,
          rolldownOptions: {
            external: externalList,
            input: virtualEntryId,
            output: {
              entryFileNames: output,
              codeSplitting: false,
            },
          },
        },
      };
    },
    closeBundle() {
      const outDir = resolve(config.root, config.build.outDir);
      if (bundleDeps && nativeDeps.length > 0) {
        installAndExtractNativeDeps(config.root, outDir, nativeDeps, targetPlatform);
      }
      if (nativeAssets.length > 0) {
        copyNativeAssets(config.root, outDir, nativeAssets);
      }
    },
  };
};

export default buildPlugin;
