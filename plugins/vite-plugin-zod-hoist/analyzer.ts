/**
 * AST analyzer
 * Identifies hoistable Zod schemas
 * AST 分析器
 * 识别可提升的 Zod schema
 */

import type {
  ArrowFunctionExpression,
  CallExpression,
  MethodDefinition,
  Function as OxcFunction,
  VariableDeclaration,
} from "@oxc-project/types";
import type { AnalyzeResult } from "./types.ts";

import { createHash } from "node:crypto";

import { parseSync, Visitor } from "oxc-parser";

// Zod chainable method name set / Zod 链式调用的方法名集合
const ZOD_METHODS = new Set([
  // Basic types / 基础类型
  "string",
  "number",
  "bigint",
  "boolean",
  "date",
  "symbol",
  "undefined",
  "null",
  "void",
  "any",
  "unknown",
  "never",
  // Compound types / 复合类型
  "object",
  "array",
  "tuple",
  "record",
  "map",
  "set",
  "function",
  "promise",
  // Special types / 特殊类型
  "literal",
  "enum",
  "nativeEnum",
  "union",
  "discriminatedUnion",
  "intersection",
  "lazy",
  "instanceof",
  "custom",
  "coerce",
  // Modifier methods / 修饰方法
  "optional",
  "nullable",
  "nullish",
  "default",
  "catch",
  "transform",
  "refine",
  "superRefine",
  "pipe",
  "brand",
  "readonly",
  // Others / 其他
  "preprocess",
  "effect",
  "describe",
  "meta",
  "openapi",
  // Schema composition / Schema 组合
  "extend",
  "merge",
  "pick",
  "omit",
  "partial",
  "deepPartial",
  "required",
  "passthrough",
  "strict",
  "strip",
  "catchall",
  // Validation methods / 验证方法
  "min",
  "max",
  "length",
  "email",
  "url",
  "uuid",
  "cuid",
  "regex",
  "includes",
  "startsWith",
  "endsWith",
  "trim",
  "toLowerCase",
  "toUpperCase",
  "positive",
  "negative",
  "nonpositive",
  "nonnegative",
  "int",
  "finite",
  "safe",
  "step",
  "multipleOf",
  "gt",
  "gte",
  "lt",
  "lte",
]);

/**
 * Generate unique variable name
 * 生成唯一变量名
 */
function generateVariableName(
  code: string,
  index: number,
  prefix: string,
): string {
  const hash = createHash("md5").update(code).digest("hex").slice(0, 6);
  return `${prefix}${hash}_${index}`;
}

/**
 * Check if node is a Zod call expression
 * Supports chained calls like z.object(), z.string().email()
 * Supports both ESTree and OXC AST formats
 * 检查是否是 Zod 调用表达式
 * 支持 z.object(), z.string().email() 等链式调用
 * 同时支持 ESTree 和 OXC AST 格式
 */
function isZodCall(
  node: CallExpression,
  zodIdentifier: string,
): boolean {
  type AstNode = Record<string, unknown>;
  let current: AstNode | null = node as unknown as AstNode;

  // ESTree uses Identifier and MemberExpression / ESTree 使用 Identifier 和 MemberExpression
  // OXC uses IdentifierReference/IdentifierName and StaticMemberExpression / OXC 使用 IdentifierReference/IdentifierName 和 StaticMemberExpression
  const isIdentifier = (n: AstNode | undefined) =>
    n && (n.type === "Identifier" || n.type === "IdentifierReference" || n.type === "IdentifierName");
  const isMemberExpr = (n: AstNode | undefined) =>
    n && (n.type === "MemberExpression" || n.type === "StaticMemberExpression");

  // Traverse call chain to find root call / 遍历调用链找到根调用
  while (current) {
    if (current.type === "CallExpression") {
      const callee = current.callee as AstNode | undefined;
      if (isMemberExpr(callee)) {
        const obj = callee!.object as AstNode | undefined;
        // Check if it's z.xxx() / 检查是否是 z.xxx()
        if (isIdentifier(obj) && obj!.name === zodIdentifier) {
          const prop = callee!.property as AstNode | undefined;
          if (isIdentifier(prop) && ZOD_METHODS.has(prop!.name as string)) {
            return true;
          }
        }
        // Continue searching up the chain / 继续向上查找链式调用
        if (obj && obj.type === "CallExpression") {
          current = obj;
          continue;
        }
        if (isMemberExpr(obj)) {
          current = obj!;
          continue;
        }
      }
    }
    break;
  }

  return false;
}

/**
 * Check if an identifier comes from function parameters or function-local variables
 * 检查标识符是否来自函数参数或函数内部变量
 */
function isLocalReference(
  name: string,
  functionParams: Set<string>,
  localVars: Set<string>,
): boolean {
  return functionParams.has(name) || localVars.has(name);
}

/**
 * Collect all identifier references in an expression
 * Supports both ESTree and OXC AST formats
 * 收集表达式中的所有标识符引用
 * 同时支持 ESTree 和 OXC AST 格式
 */
function collectIdentifiers(
  node: unknown,
  identifiers: Set<string>,
  zodIdentifier: string,
): void {
  if (!node || typeof node !== "object")
    return;

  const n = node as Record<string, unknown>;

  // Support both ESTree (Identifier) and OXC (IdentifierReference/IdentifierName) / 同时支持 ESTree (Identifier) 和 OXC (IdentifierReference/IdentifierName)
  if (n.type === "Identifier" || n.type === "IdentifierReference" || n.type === "IdentifierName") {
    const name = n.name as string;
    // Exclude the Zod identifier itself / 排除 Zod 标识符本身
    if (name !== zodIdentifier) {
      identifiers.add(name);
    }
    return;
  }

  // Recursively traverse child nodes / 递归遍历子节点
  for (const key of Object.keys(n)) {
    if (key === "type" || key === "start" || key === "end")
      continue;
    const value = n[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        collectIdentifiers(item, identifiers, zodIdentifier);
      }
    }
    else if (value && typeof value === "object") {
      collectIdentifiers(value, identifiers, zodIdentifier);
    }
  }
}

/**
 * Check if an expression contains dynamically computed property keys
 * Supports both ESTree and OXC AST formats
 * 检查表达式中是否包含动态计算的属性键
 * 同时支持 ESTree 和 OXC AST 格式
 */
function hasComputedProperty(node: unknown): boolean {
  if (!node || typeof node !== "object")
    return false;

  const n = node as Record<string, unknown>;

  // Check if object property is a computed property / 检查对象属性是否是计算属性
  // ESTree uses Property, OXC uses ObjectProperty / ESTree 使用 Property，OXC 使用 ObjectProperty
  if ((n.type === "Property" || n.type === "ObjectProperty") && n.computed === true) {
    return true;
  }

  // Recursively check child nodes / 递归检查子节点
  for (const key of Object.keys(n)) {
    if (key === "type" || key === "start" || key === "end")
      continue;
    const value = n[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (hasComputedProperty(item))
          return true;
      }
    }
    else if (value && typeof value === "object") {
      if (hasComputedProperty(value))
        return true;
    }
  }

  return false;
}

/**
 * Analyze code to find hoistable Zod schemas
 * 分析代码，找出可提升的 Zod schema
 */
export function analyze(
  code: string,
  filename: string,
  zodIdentifiers: string[],
  variablePrefix: string,
): AnalyzeResult {
  const result: AnalyzeResult = {
    hoistableSchemas: [],
    lastImportEnd: 0,
    zodIdentifier: null,
  };

  // Parse AST / 解析 AST
  const parseResult = parseSync(filename, code, {
    sourceType: "module",
  });

  if (parseResult.errors.length > 0) {
    return result;
  }

  const program = parseResult.program;

  // Collect all imported identifiers (these can be safely referenced anywhere) / 收集所有导入的标识符（这些可以安全地在任何位置引用）
  const importedIdentifiers = new Set<string>();

  // Find Zod identifiers and other imports from static imports / 从静态导入中查找 Zod 标识符和其他导入
  for (const imp of parseResult.module.staticImports) {
    const source = imp.moduleRequest.value;
    for (const entry of imp.entries) {
      const localName = entry.localName.value;
      importedIdentifiers.add(localName);

      if (source === "zod" || source === "@hono/zod-openapi") {
        if (zodIdentifiers.includes(localName)) {
          result.zodIdentifier = localName;
        }
        // Handle namespace import: import * as z from 'zod' / 处理 namespace 导入: import * as z from 'zod'
        if (entry.importName.kind === "NamespaceObject") {
          result.zodIdentifier = localName;
        }
      }
    }
    result.lastImportEnd = Math.max(result.lastImportEnd, imp.end);
  }

  // Collect module top-level declared variables (these may cause ordering issues) / 收集模块顶层声明的变量（这些可能导致顺序问题）
  const topLevelVariables = new Set<string>();
  const isIdent = (n: Record<string, unknown>) =>
    n.type === "Identifier" || n.type === "BindingIdentifier";

  function collectVarsFromDecl(decl: unknown) {
    if (!decl || typeof decl !== "object")
      return;
    const d = decl as Record<string, unknown>;

    if (d.type === "VariableDeclaration") {
      const declarations = d.declarations as Array<Record<string, unknown>>;
      for (const dec of declarations) {
        const id = dec.id as Record<string, unknown>;
        if (isIdent(id)) {
          topLevelVariables.add(id.name as string);
        }
      }
    }
    if (d.type === "FunctionDeclaration") {
      const id = d.id as Record<string, unknown> | null;
      if (id && isIdent(id)) {
        topLevelVariables.add(id.name as string);
      }
    }
  }

  for (const stmt of program.body) {
    // Handle export declarations / 处理导出声明
    if (stmt.type === "ExportNamedDeclaration") {
      const exp = stmt as unknown as Record<string, unknown>;
      collectVarsFromDecl(exp.declaration);
    }
    // Directly handle variable and function declarations / 直接处理变量和函数声明
    collectVarsFromDecl(stmt);
  }

  if (!result.zodIdentifier) {
    return result;
  }

  // Store processed expression ranges to avoid duplicate processing / 用于存储已处理的表达式范围，避免重复处理
  const processedRanges = new Set<string>();

  // Function scope stack / 函数作用域栈
  const functionStack: {
    params: Set<string>;
    localVars: Set<string>;
    depth: number;
  }[] = [];

  // Collect function parameters / 收集函数参数
  // Support both ESTree and OXC AST formats / 同时支持 ESTree 和 OXC AST 格式
  function collectParams(params: unknown[]): Set<string> {
    const names = new Set<string>();
    const isIdent = (n: Record<string, unknown>) =>
      n.type === "Identifier" || n.type === "BindingIdentifier";

    for (const param of params) {
      if (!param || typeof param !== "object")
        continue;
      const p = param as Record<string, unknown>;
      // OXC: FormalParameter wrapper / OXC: FormalParameter 包装
      if (p.type === "FormalParameter" && p.pattern) {
        const pattern = p.pattern as Record<string, unknown>;
        if (isIdent(pattern)) {
          names.add(pattern.name as string);
        }
      }
      // ESTree/OXC: direct identifier / ESTree/OXC: 直接标识符
      else if (isIdent(p)) {
        names.add(p.name as string);
      }
      // ESTree/OXC: parameter with default value / ESTree/OXC: 带默认值的参数
      else if (p.type === "AssignmentPattern" && p.left) {
        const left = p.left as Record<string, unknown>;
        if (isIdent(left)) {
          names.add(left.name as string);
        }
      }
      // ESTree/OXC: rest parameter / ESTree/OXC: 剩余参数
      else if ((p.type === "RestElement" || p.type === "BindingRestElement") && p.argument) {
        const arg = p.argument as Record<string, unknown>;
        if (isIdent(arg)) {
          names.add(arg.name as string);
        }
      }
    }
    return names;
  }

  // Store found candidate schemas / 存储找到的候选 schema
  const candidates: Array<{
    node: CallExpression;
    depth: number;
    params: Set<string>;
    localVars: Set<string>;
  }> = [];

  const visitor = new Visitor({
    FunctionDeclaration(node: OxcFunction) {
      const params = collectParams(node.params || []);
      functionStack.push({ params, localVars: new Set(), depth: functionStack.length + 1 });
    },
    "FunctionDeclaration:exit": function () {
      functionStack.pop();
    },
    FunctionExpression(node: OxcFunction) {
      const params = collectParams(node.params || []);
      functionStack.push({ params, localVars: new Set(), depth: functionStack.length + 1 });
    },
    "FunctionExpression:exit": function () {
      functionStack.pop();
    },
    ArrowFunctionExpression(node: ArrowFunctionExpression) {
      const params = collectParams(node.params || []);
      functionStack.push({ params, localVars: new Set(), depth: functionStack.length + 1 });
    },
    "ArrowFunctionExpression:exit": function () {
      functionStack.pop();
    },
    MethodDefinition(_node: MethodDefinition) {
      functionStack.push({ params: new Set(), localVars: new Set(), depth: functionStack.length + 1 });
    },
    "MethodDefinition:exit": function () {
      functionStack.pop();
    },
    VariableDeclaration(node: VariableDeclaration) {
      // Collect variable declarations inside functions / 收集函数内部的变量声明
      if (functionStack.length > 0) {
        const scope = functionStack[functionStack.length - 1];
        for (const decl of node.declarations) {
          // ESTree uses Identifier, OXC uses BindingIdentifier / ESTree 使用 Identifier，OXC 使用 BindingIdentifier
          const id = decl.id as unknown as Record<string, unknown>;
          if (id.type === "Identifier" || id.type === "BindingIdentifier") {
            scope.localVars.add(id.name as string);
          }
        }
      }
    },
    CallExpression(node: CallExpression) {
      // Only process calls inside functions / 只处理函数内部的调用
      if (functionStack.length === 0)
        return;

      const isZod = isZodCall(node, result.zodIdentifier!);
      if (!isZod)
        return;

      const scope = functionStack[functionStack.length - 1];
      candidates.push({
        node,
        depth: scope.depth,
        params: new Set(scope.params),
        localVars: new Set(scope.localVars),
      });
    },
  });

  visitor.visit(program);

  // Sort by range size (largest first) so we can prioritize outermost expressions / 按范围大小排序（从大到小），这样我们可以优先处理最外层的表达式
  candidates.sort((a, b) => (b.node.end - b.node.start) - (a.node.end - a.node.start));

  // Store processed ranges for filtering contained sub-expressions / 存储已处理的范围，用于过滤被包含的子表达式
  const coveredRanges: Array<{ start: number; end: number }> = [];

  // Check if a range is contained within another range / 检查一个范围是否被另一个范围包含
  function isContainedInCovered(start: number, end: number): boolean {
    return coveredRanges.some(r => r.start <= start && r.end >= end);
  }

  // Analyze each candidate schema / 分析每个候选 schema
  let index = 0;
  for (const { node, depth, params, localVars } of candidates) {
    const rangeKey = `${node.start}-${node.end}`;

    // Skip already processed ranges / 跳过已处理的范围
    if (processedRanges.has(rangeKey))
      continue;

    // Skip expressions contained within other processed ranges / 跳过被其他已处理范围包含的表达式
    if (isContainedInCovered(node.start, node.end))
      continue;

    // Check if contains dynamically computed property keys / 检查是否包含动态计算的属性键
    if (hasComputedProperty(node))
      continue;

    // Collect all identifier references in the expression / 收集表达式中的所有标识符引用
    const identifiers = new Set<string>();
    collectIdentifiers(node, identifiers, result.zodIdentifier!);

    // Check if references function parameters or local variables / 检查是否引用了函数参数或局部变量
    let canHoist = true;
    for (const id of identifiers) {
      if (isLocalReference(id, params, localVars)) {
        canHoist = false;
        break;
      }
      // Check if references non-imported top-level variables (may cause ordering issues) / 检查是否引用了非导入的顶层变量（可能导致顺序问题）
      if (topLevelVariables.has(id) && !importedIdentifiers.has(id)) {
        canHoist = false;
        break;
      }
    }

    if (!canHoist)
      continue;

    const schemaCode = code.slice(node.start, node.end);
    const variableName = generateVariableName(schemaCode, index, variablePrefix);

    result.hoistableSchemas.push({
      start: node.start,
      end: node.end,
      code: schemaCode,
      variableName,
      depth,
    });

    // Mark this range as processed / 标记这个范围已被处理
    processedRanges.add(rangeKey);
    coveredRanges.push({ start: node.start, end: node.end });
    index++;
  }

  // Sort by position from back to front for easier replacement / 按位置从后向前排序，便于替换
  result.hoistableSchemas.sort((a, b) => b.start - a.start);

  return result;
}
