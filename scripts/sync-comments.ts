import type { PgTable } from "drizzle-orm/pg-core";
/**
 * Sync JSDoc comments from Drizzle schema source files to PostgreSQL COMMENT ON statements.
 *
 * Usage:
 *   npx tsx scripts/sync-comments.ts              # Generate SQL & execute
 *   npx tsx scripts/sync-comments.ts --dry-run     # Generate SQL only, skip execution
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { dirname, resolve } from "node:path";
import { getColumns, isTable } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";
import { getTableConfig } from "drizzle-orm/pg-core";
import { globSync } from "glob";
import { parseSync } from "oxc-parser";

// ─── Types ──────────────────────────────────────────────────────────

type AstComment = {
  type: string;
  value: string;
  start: number;
  end: number;
};

type TableAstInfo = {
  variableName: string;
  tableComment: string | undefined;
  /** propertyKey → comment text (undefined = no JSDoc found) */
  columnComments: Map<string, string | undefined>;
};

type RuntimeColumnInfo = {
  propertyKey: string;
  dbColumnName: string;
};

type RuntimeTableInfo = {
  tableName: string;
  schemaName: string | undefined;
  columns: RuntimeColumnInfo[];
};

// ─── Configuration ──────────────────────────────────────────────────

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const SCHEMA_DIR = resolve(PROJECT_ROOT, "src/db/schema");
const OUTPUT_FILE = resolve(PROJECT_ROOT, "migrations/comments.sql");
const DRY_RUN = process.argv.includes("--dry-run");

// ─── JSDoc Helpers ──────────────────────────────────────────────────

const RE_LEADING_STARS = /^\*+/;
const RE_LINE_STAR_PREFIX = /^\s*\*\s?/;

/** Strip JSDoc delimiters and leading asterisks, collapse into a single line. */
function cleanJSDoc(raw: string): string {
  return raw
    .replace(RE_LEADING_STARS, "")
    .split("\n")
    .map(line => line.replace(RE_LINE_STAR_PREFIX, "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

function isJSDoc(comment: AstComment): boolean {
  return comment.type === "Block" && comment.value.startsWith("*");
}

/**
 * Find the closest preceding JSDoc comment for a node.
 * Only matches if the gap between comment end and node start is pure whitespace.
 */
function findJSDocBefore(
  comments: AstComment[],
  nodeStart: number,
  source: string,
): string | undefined {
  const candidates = comments.filter(c => isJSDoc(c) && c.end <= nodeStart);
  if (candidates.length === 0) return undefined;

  const closest = candidates[candidates.length - 1];
  const between = source.slice(closest.end, nodeStart);
  if (between.trim() !== "") return undefined;

  const text = cleanJSDoc(closest.value);
  return text || undefined;
}

// ─── Import Path Resolution ─────────────────────────────────────────

function resolveImportPath(importPath: string, fromFile: string): string {
  if (importPath.startsWith("@/"))
    return resolve(PROJECT_ROOT, "src", `${importPath.slice(2)}.ts`);
  return resolve(dirname(fromFile), `${importPath}.ts`);
}

// ─── Spread Resolution ──────────────────────────────────────────────

/** Cache parsed spread sources to avoid re-parsing the same file. */
const spreadCache = new Map<string, Map<string, string | undefined>>();

/**
 * Resolve JSDoc comments from a spread source (e.g., `...baseColumns`).
 * Only supports static Identifier spreads with direct ObjectExpression definitions.
 */
function resolveSpreadComments(
  currentFilePath: string,
  spreadArgument: any,
  program: any,
): Map<string, string | undefined> {
  if (spreadArgument.type !== "Identifier") {
    console.warn(`[sync-comments] ⚠ Unsupported spread expression in ${currentFilePath}, skipping`);
    return new Map();
  }

  const identName: string = spreadArgument.name;

  // Find the import declaration
  let importPath: string | undefined;
  for (const node of program.body) {
    if (node.type !== "ImportDeclaration") continue;
    for (const spec of node.specifiers) {
      if (spec.type === "ImportSpecifier" && spec.local?.name === identName) {
        importPath = node.source?.value;
        break;
      }
    }
    if (importPath) break;
  }
  if (!importPath) return new Map();

  const resolvedPath = resolveImportPath(importPath, currentFilePath);
  const cacheKey = `${resolvedPath}#${identName}`;
  if (spreadCache.has(cacheKey)) return spreadCache.get(cacheKey)!;

  const result = new Map<string, string | undefined>();
  spreadCache.set(cacheKey, result);

  if (!existsSync(resolvedPath)) {
    console.warn(`[sync-comments] ⚠ Cannot resolve spread "${importPath}" → ${resolvedPath}`);
    return result;
  }

  const targetSource = readFileSync(resolvedPath, "utf-8");
  let targetProgram: any;
  let targetComments: AstComment[];
  try {
    const parsed = parseSync(resolvedPath, targetSource, { sourceType: "module", lang: "ts" });
    targetProgram = parsed.program;
    targetComments = parsed.comments as AstComment[];
  }
  catch {
    console.warn(`[sync-comments] ⚠ Failed to parse spread source: ${resolvedPath}`);
    return result;
  }

  const sorted = [...targetComments].sort((a, b) => a.start - b.start);

  for (const node of targetProgram.body) {
    const declaration = node.type === "ExportNamedDeclaration" ? node.declaration : node;
    if (!declaration || declaration.type !== "VariableDeclaration") continue;

    for (const declarator of declaration.declarations) {
      if (declarator.id?.name !== identName) continue;
      if (!declarator.init || declarator.init.type !== "ObjectExpression") continue;

      for (const prop of declarator.init.properties) {
        if (prop.type !== "Property") continue;
        const key = prop.key?.name ?? prop.key?.value;
        if (!key) continue;
        result.set(key, findJSDocBefore(sorted, prop.start, targetSource));
      }
    }
  }

  return result;
}

// ─── File-Level AST Extraction ──────────────────────────────────────

function extractFileComments(filePath: string): TableAstInfo[] {
  const source = readFileSync(filePath, "utf-8");
  let program: any;
  let comments: AstComment[];
  try {
    const parsed = parseSync(filePath, source, { sourceType: "module", lang: "ts" });
    program = parsed.program;
    comments = parsed.comments as AstComment[];
  }
  catch {
    console.warn(`[sync-comments] ⚠ Failed to parse: ${filePath}`);
    return [];
  }

  // Don't return early for empty comments — spreads may reference files that DO have comments
  const sorted = [...(comments ?? [])].sort((a, b) => a.start - b.start);
  const results: TableAstInfo[] = [];

  for (const node of program.body) {
    const topNodeStart: number = node.start;
    const declaration = node.type === "ExportNamedDeclaration" ? node.declaration : node;
    if (!declaration || declaration.type !== "VariableDeclaration") continue;

    for (const declarator of declaration.declarations) {
      if (!declarator.init || declarator.init.type !== "CallExpression") continue;

      const callee = declarator.init.callee;
      if (callee.type !== "Identifier" || callee.name !== "pgTable") continue;

      const variableName: string | undefined = declarator.id?.name;
      if (!variableName) continue;

      // Table-level JSDoc: before the top-level statement (export or variable declaration)
      const tableComment = findJSDocBefore(sorted, topNodeStart, source);

      // Column-level JSDoc: from the 2nd argument (ObjectExpression)
      const columnComments = new Map<string, string | undefined>();
      const args = declarator.init.arguments;

      if (args.length >= 2 && args[1].type === "ObjectExpression") {
        for (const prop of args[1].properties) {
          if (prop.type === "SpreadElement") {
            const spreadComments = resolveSpreadComments(filePath, prop.argument, program);
            for (const [k, v] of spreadComments) {
              columnComments.set(k, v);
            }
          }
          else if (prop.type === "Property") {
            const key: string | undefined = prop.key?.name ?? prop.key?.value;
            if (!key) continue;
            // Override any spread comment for the same key
            columnComments.set(key, findJSDocBefore(sorted, prop.start, source));
          }
        }
      }

      results.push({ variableName, tableComment, columnComments });
    }
  }

  return results;
}

// ─── Source Layer Orchestration ──────────────────────────────────────

function extractAllSourceComments(): Map<string, TableAstInfo> {
  const files = globSync("**/*.ts", { cwd: SCHEMA_DIR, absolute: true });
  const result = new Map<string, TableAstInfo>();
  let tableFileCount = 0;

  for (const filePath of files) {
    const tables = extractFileComments(filePath);
    if (tables.length > 0) tableFileCount++;
    for (const table of tables) {
      result.set(table.variableName, table);
    }
  }

  console.log(`[sync-comments] Scanned ${files.length} schema files, found ${result.size} tables in ${tableFileCount} files`);
  return result;
}

// ─── Runtime Metadata Layer ─────────────────────────────────────────

async function getRuntimeMetadata(): Promise<Map<string, RuntimeTableInfo>> {
  const schema = await import("@/db/schema");
  const result = new Map<string, RuntimeTableInfo>();

  for (const [name, value] of Object.entries(schema)) {
    if (!isTable(value)) continue;

    const table = value as PgTable;
    const config = getTableConfig(table);
    const columns = getColumns(table);

    const columnInfos: RuntimeColumnInfo[] = [];
    for (const [propKey, column] of Object.entries(columns)) {
      const col = column as any;
      const dbName: string = col.keyAsName ? toSnakeCase(col.name) : col.name;
      columnInfos.push({ propertyKey: propKey, dbColumnName: dbName });
    }

    result.set(name, {
      tableName: config.name,
      schemaName: config.schema,
      columns: columnInfos,
    });
  }

  console.log(`[sync-comments] Runtime: ${result.size} tables detected`);
  return result;
}

// ─── SQL Generation ─────────────────────────────────────────────────

function escapeSQLString(text: string): string {
  return text.replace(/'/g, "''");
}

function qualifiedTable(schemaName: string | undefined, tableName: string): string {
  return schemaName ? `"${schemaName}"."${tableName}"` : `"${tableName}"`;
}

function generateSQL(
  astComments: Map<string, TableAstInfo>,
  runtimeMeta: Map<string, RuntimeTableInfo>,
): string {
  const lines: string[] = [];
  let tableComments = 0;
  let columnComments = 0;
  let nullClears = 0;

  // Collect all entries sorted by table name for stable output
  const entries = [...runtimeMeta.entries()].sort(
    (a, b) => a[1].tableName.localeCompare(b[1].tableName),
  );

  for (const [varName, runtime] of entries) {
    const ast = astComments.get(varName);
    const fqTable = qualifiedTable(runtime.schemaName, runtime.tableName);

    // Table comment
    if (ast?.tableComment) {
      lines.push(`COMMENT ON TABLE ${fqTable} IS '${escapeSQLString(ast.tableComment)}';`);
      tableComments++;
    }
    else {
      lines.push(`COMMENT ON TABLE ${fqTable} IS NULL;`);
      nullClears++;
    }

    // Column comments – sorted by DB column name for stability
    const sortedCols = [...runtime.columns].sort(
      (a, b) => a.dbColumnName.localeCompare(b.dbColumnName),
    );

    for (const col of sortedCols) {
      const comment = ast?.columnComments.get(col.propertyKey);
      if (comment) {
        lines.push(`COMMENT ON COLUMN ${fqTable}."${col.dbColumnName}" IS '${escapeSQLString(comment)}';`);
        columnComments++;
      }
      else {
        lines.push(`COMMENT ON COLUMN ${fqTable}."${col.dbColumnName}" IS NULL;`);
        nullClears++;
      }
    }

    lines.push(""); // blank line between tables
  }

  console.log(
    `[sync-comments] Generated: ${tableComments} table comments, ${columnComments} column comments, ${nullClears} NULL clears`,
  );

  return [
    "-- Auto-generated by scripts/sync-comments.ts",
    "-- DO NOT EDIT MANUALLY",
    "",
    "BEGIN;",
    "",
    ...lines,
    "COMMIT;",
    "",
  ].join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("[sync-comments] Starting schema comment sync...");

  // Step 1: Extract JSDoc from source
  const astComments = extractAllSourceComments();

  // Step 2: Get runtime metadata from Drizzle
  const runtimeMeta = await getRuntimeMetadata();

  // Step 3: Generate SQL
  const sql = generateSQL(astComments, runtimeMeta);

  // Step 4: Write to file
  const outputDir = dirname(OUTPUT_FILE);
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  writeFileSync(OUTPUT_FILE, sql, "utf-8");
  console.log(`[sync-comments] Written to ${OUTPUT_FILE}`);

  // Step 5: Execute against database (unless --dry-run)
  if (DRY_RUN) {
    console.log("[sync-comments] --dry-run: skipping database execution");
    return;
  }

  const { getQueryClient } = await import("@/db");
  const client = getQueryClient();
  try {
    await client.unsafe(sql);
    console.log("[sync-comments] ✓ Comments synced to database");
  }
  finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[sync-comments] ✗ Failed:", err);
  process.exit(1);
});
