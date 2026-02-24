/**
 * vite-plugin-zod-hoist
 *
 * Automatically hoists Zod schema definitions inside functions to the top of the file
 * Avoids performance overhead of re-initializing schemas on every function call
 * 将函数内部的 Zod schema 定义自动提升到文件顶部
 * 避免每次函数调用时重复初始化 schema 带来的性能开销
 */

import type { Plugin } from "vite";
import type { ZodHoistOptions } from "./types.ts";

import { analyze } from "./analyzer.ts";
import { transform } from "./transformer.ts";

// Default configuration / 默认配置
const defaultOptions: Required<ZodHoistOptions> = {
  include: [/\.[jt]sx?$/],
  exclude: [/node_modules/, /\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/],
  zodIdentifiers: ["z"],
  variablePrefix: "_hoisted_",
  debug: false,
};

// Quick pre-check regex: check if file may contain Zod calls / 快速预检正则：检查文件是否可能包含 Zod 调用
const ZOD_QUICK_CHECK
  = /\bz\.(?:object|string|number|array|boolean|literal|enum|union|tuple|record|any|unknown|null|undefined|void|never|date|bigint|symbol|function|promise|lazy|discriminatedUnion|intersection|coerce|custom|instanceof|set|map|nativeEnum)/;

/**
 * Check if file path matches patterns
 * 检查文件路径是否匹配模式
 */
function matchPattern(id: string, patterns: (string | RegExp)[]): boolean {
  return patterns.some((pattern) => {
    if (typeof pattern === "string") {
      return id.includes(pattern);
    }
    return pattern.test(id);
  });
}

/**
 * Create vite-plugin-zod-hoist plugin
 * 创建 vite-plugin-zod-hoist 插件
 */
export default function zodHoistPlugin(options?: ZodHoistOptions): Plugin {
  const opts = { ...defaultOptions, ...options };

  return {
    name: "vite-plugin-zod-hoist",

    // Only enable during build / 仅在构建时启用
    apply: "build",

    transform(code, id) {
      // Check if file matches include patterns / 检查文件是否匹配 include 模式
      if (!matchPattern(id, opts.include)) {
        return null;
      }

      // Check if file matches exclude patterns / 检查文件是否匹配 exclude 模式
      if (matchPattern(id, opts.exclude)) {
        return null;
      }

      // Quick pre-check: skip if file does not contain Zod call patterns / 快速预检：如果文件不包含 Zod 调用模式，跳过
      if (!ZOD_QUICK_CHECK.test(code)) {
        return null;
      }

      // Analyze code / 分析代码
      const analyzeResult = analyze(
        code,
        id,
        opts.zodIdentifiers,
        opts.variablePrefix,
      );

      // If no hoistable schemas, skip / 如果没有可提升的 schema，跳过
      if (analyzeResult.hoistableSchemas.length === 0) {
        return null;
      }

      if (opts.debug) {
        console.warn(
          `[zod-hoist] ${id}: 提升 ${analyzeResult.hoistableSchemas.length} 个 schema`,
        );
        for (const schema of analyzeResult.hoistableSchemas) {
          console.warn(`  - ${schema.variableName}: ${schema.code.slice(0, 50)}...`);
        }
      }

      // Execute transformation / 执行转换
      const result = transform(code, id, analyzeResult);
      if (!result) {
        return null;
      }

      return {
        code: result.code,
        map: result.map,
      };
    },
  };
}

export type { ZodHoistOptions };
