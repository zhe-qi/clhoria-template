/**
 * Code transformer
 * Uses magic-string to perform code transformations and generate source maps
 * 代码转换器
 * 使用 magic-string 执行代码转换并生成 source map
 */

import type { AnalyzeResult } from "./types.ts";

import MagicString from "magic-string";

export type TransformResult = {
  code: string;
  map: ReturnType<MagicString["generateMap"]>;
};

/**
 * Transform code, hoisting eligible schemas to the top of the file
 * 转换代码，将可提升的 schema 提升到文件顶部
 */
export function transform(
  code: string,
  id: string,
  analyzeResult: AnalyzeResult,
): TransformResult | null {
  const { hoistableSchemas, lastImportEnd } = analyzeResult;

  if (hoistableSchemas.length === 0) {
    return null;
  }

  const s = new MagicString(code);

  // Generate hoisted variable declarations / 生成提升的变量声明
  const declarations: string[] = [];
  for (const schema of hoistableSchemas) {
    declarations.push(`const ${schema.variableName} = ${schema.code};`);
  }

  // Insert variable declarations after the last import statement / 在最后一个 import 语句后插入变量声明
  const insertPosition = lastImportEnd > 0 ? lastImportEnd : 0;
  const insertContent = `\n${declarations.join("\n")}\n`;
  s.appendRight(insertPosition, insertContent);

  // Replace original schema positions with variable references / 替换原位置的 schema 为变量引用
  // Note: hoistableSchemas are already sorted from back to front by position / 注意：hoistableSchemas 已按位置从后向前排序
  for (const schema of hoistableSchemas) {
    s.overwrite(schema.start, schema.end, schema.variableName);
  }

  return {
    code: s.toString(),
    map: s.generateMap({
      source: id,
      hires: "boundary",
      includeContent: true,
    }),
  };
}
