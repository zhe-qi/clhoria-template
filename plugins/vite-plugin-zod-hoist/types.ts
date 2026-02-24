/**
 * vite-plugin-zod-hoist type definitions
 * vite-plugin-zod-hoist 类型定义
 */

export type ZodHoistOptions = {
  /**
   * File matching patterns to process
   * 需要处理的文件匹配模式
   * @default [/\.[jt]sx?$/]
   */
  include?: (string | RegExp)[];

  /**
   * File matching patterns to exclude
   * 排除的文件匹配模式
   * @default [/node_modules/, /\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/]
   */
  exclude?: (string | RegExp)[];

  /**
   * Zod import identifier names
   * Zod 导入的标识符名称
   * @default ['z']
   */
  zodIdentifiers?: string[];

  /**
   * Generated variable name prefix
   * 生成的变量名前缀
   * @default '_hoisted_'
   */
  variablePrefix?: string;

  /**
   * Whether to output debug information
   * 是否输出调试信息
   * @default false
   */
  debug?: boolean;
};

/**
 * Hoistable schema information
 * 可提升的 Schema 信息
 */
export type HoistableSchema = {
  /** Start position of the original code / 原始代码的起始位置 */
  start: number;
  /** End position of the original code / 原始代码的结束位置 */
  end: number;
  /** Original code content / 原始代码内容 */
  code: string;
  /** Generated variable name / 生成的变量名 */
  variableName: string;
  /** Depth of the enclosing function (for debugging) / 所在函数的深度（用于调试） */
  depth: number;
};

/**
 * Analyze result
 * 分析结果
 */
export type AnalyzeResult = {
  /** List of hoistable schemas / 可提升的 Schema 列表 */
  hoistableSchemas: HoistableSchema[];
  /** End position of the last import statement / 最后一个 import 语句的结束位置 */
  lastImportEnd: number;
  /** Zod import identifier / Zod 导入标识符 */
  zodIdentifier: string | null;
};
