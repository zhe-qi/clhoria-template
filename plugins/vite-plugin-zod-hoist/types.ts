/**
 * vite-plugin-zod-hoist 类型定义
 */

export type ZodHoistOptions = {
  /**
   * 需要处理的文件匹配模式
   * @default [/\.[jt]sx?$/]
   */
  include?: (string | RegExp)[];

  /**
   * 排除的文件匹配模式
   * @default [/node_modules/, /\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/]
   */
  exclude?: (string | RegExp)[];

  /**
   * Zod 导入的标识符名称
   * @default ['z']
   */
  zodIdentifiers?: string[];

  /**
   * 生成的变量名前缀
   * @default '_hoisted_'
   */
  variablePrefix?: string;

  /**
   * 是否输出调试信息
   * @default false
   */
  debug?: boolean;
};

/**
 * 可提升的 Schema 信息
 */
export type HoistableSchema = {
  /** 原始代码的起始位置 */
  start: number;
  /** 原始代码的结束位置 */
  end: number;
  /** 原始代码内容 */
  code: string;
  /** 生成的变量名 */
  variableName: string;
  /** 所在函数的深度（用于调试） */
  depth: number;
};

/**
 * 分析结果
 */
export type AnalyzeResult = {
  /** 可提升的 Schema 列表 */
  hoistableSchemas: HoistableSchema[];
  /** 最后一个 import 语句的结束位置 */
  lastImportEnd: number;
  /** Zod 导入标识符 */
  zodIdentifier: string | null;
};
