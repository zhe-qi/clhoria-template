import { z } from "zod";

interface FieldConfig {
  name: string;
  type: string;
  title?: string;
  validations?: {
    type: string;
    value?: any;
    message?: string;
  }[];
  defaultValue?: any;
  optional?: boolean;
  children?: FieldConfig[];
  dict?: string;
}

export function extractSchemaFields(schema: z.ZodTypeAny, path: string[] = []): FieldConfig[] {
  // 处理函数式 Schema（如 meta 字段）
  // @ts-expect-error 类型错误
  const resolvedSchema = typeof schema === "function" ? schema() : schema;

  // 获取基础类型名称映射
  const getPrimitiveType = (schema: z.ZodTypeAny): string => {
    const typeMap: Record<string, string> = {
      ZodString: "string",
      ZodNumber: "number",
      ZodBoolean: "boolean",
      ZodObject: "object",
      ZodArray: "array",
      ZodEnum: "enum",
      ZodLiteral: "literal",
    };
    return typeMap[schema.constructor.name] || schema.constructor.name;
  };

  // 提取校验规则（支持字符串/数字类型）
  const extractValidations = (schema: z.ZodTypeAny) => {
    const validations: FieldConfig["validations"] = [];

    if (schema instanceof z.ZodString || schema instanceof z.ZodNumber) {
      for (const check of schema._def.checks) {
        switch (check.kind) {
          case "min":
            validations.push({
              type: "min",
              value: check.value,
              message: check.message,
            });
            break;
          case "max":
            validations.push({
              type: "max",
              value: check.value,
              message: check.message,
            });
            break;
          case "email":
            validations.push({ type: "email", message: check.message });
            break;
        }
      }
    }
    return validations;
  };

  // 解析描述信息中的JSON数据
  const parseDescription = (schema: z.ZodTypeAny): { title?: string; dict?: string } => {
    const description = schema._def.description;
    if (!description)
      return {};

    try {
      // 尝试解析JSON格式的描述
      const parsed = JSON.parse(description);
      return {
        title: parsed.title,
        dict: parsed.dict,
      };
    }
    catch {
      // 如果不是JSON格式，则直接返回描述作为title
      return { title: description };
    }
  };

  // 递归处理不同 Schema 类型
  if (resolvedSchema instanceof z.ZodObject) {
    return Object.entries(resolvedSchema.shape).flatMap(([key, value]) => {
      return extractSchemaFields(value as z.ZodTypeAny, [...path, key]);
    });
  }

  if (resolvedSchema instanceof z.ZodOptional || resolvedSchema instanceof z.ZodNullable) {
    const innerType = resolvedSchema.unwrap();
    return extractSchemaFields(innerType, path).map(field => ({
      ...field,
      optional: true,
    }));
  }

  if (resolvedSchema instanceof z.ZodDefault) {
    const innerType = resolvedSchema._def.innerType;
    const defaultValue = resolvedSchema._def.defaultValue();
    return extractSchemaFields(innerType, path).map(field => ({
      ...field,
      defaultValue,
    }));
  }

  if (resolvedSchema instanceof z.ZodArray) {
    const elementType = resolvedSchema.element;
    const { title, dict } = parseDescription(resolvedSchema);
    return [{
      name: path.join("."),
      type: "array",
      title,
      dict,
      children: extractSchemaFields(elementType, []),
    }];
  }

  // 基础类型处理
  const { title, dict } = parseDescription(resolvedSchema);
  return [{
    name: path.join("."),
    type: getPrimitiveType(resolvedSchema),
    title,
    dict,
    validations: extractValidations(resolvedSchema),
    ...(resolvedSchema instanceof z.ZodLiteral && {
      literalValue: resolvedSchema._def.value,
    }),
    ...(resolvedSchema instanceof z.ZodEnum && {
      enumValues: resolvedSchema._def.values,
    }),
  }];
}
