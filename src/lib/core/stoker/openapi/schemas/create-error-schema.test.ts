// Tests for the createErrorSchema function
import { z } from "@hono/zod-openapi";
import { describe, expect, it } from "vitest";

import createErrorSchema from "./create-error-schema.js";

describe("create-error-schema", () => {
  it("creates error schema for string schema", () => {
    const stringSchema = z.string();
    const errorSchema = createErrorSchema(stringSchema);

    const result = errorSchema.safeParse({
      success: false,
      error: {
        name: "ZodError",
        issues: [
          {
            code: "invalid_type",
            path: ["fieldName"],
            message: "Expected string, received undefined",
          },
        ],
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.success).toBe(false);
    expect(result.data?.error.name).toBe("ZodError");
    expect(result.data?.error.issues).toHaveLength(1);
    expect(result.data?.error.issues[0].code).toBe("invalid_type");
  });

  it("creates error schema for object schema", () => {
    const objectSchema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const errorSchema = createErrorSchema(objectSchema);

    const result = errorSchema.safeParse({
      success: false,
      error: {
        name: "ZodError",
        issues: [
          {
            code: "invalid_type",
            path: ["name"],
            message: "Expected string, received undefined",
          },
          {
            code: "invalid_type",
            path: ["age"],
            message: "Expected number, received undefined",
          },
        ],
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.success).toBe(false);
    expect(result.data?.error.issues).toHaveLength(2);
  });

  it("creates error schema for array schema", () => {
    const arraySchema = z.array(z.string());
    const errorSchema = createErrorSchema(arraySchema);

    const result = errorSchema.safeParse({
      success: false,
      error: {
        name: "ZodError",
        issues: [
          {
            code: "invalid_type",
            path: [0],
            message: "Expected string, received number",
          },
        ],
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.success).toBe(false);
    expect(result.data?.error.issues[0].path).toEqual([0]);
  });

  it("validates error schema structure", () => {
    const schema = z.string();
    const errorSchema = createErrorSchema(schema);

    const validResult1 = errorSchema.safeParse({
      success: false,
      error: {
        name: "ZodError",
        issues: [
          {
            code: "invalid_type",
            path: ["field"],
            message: "Expected string, received undefined",
          },
        ],
      },
    });

    expect(validResult1.success).toBe(true);

    const validResult2 = errorSchema.safeParse({
      success: true,
      error: {
        name: "ZodError",
        issues: [],
      },
    });

    expect(validResult2.success).toBe(true);

    const invalidResult1 = errorSchema.safeParse({
      error: {
        name: "ZodError",
        issues: [],
      },
    });

    expect(invalidResult1.success).toBe(false);

    const invalidResult2 = errorSchema.safeParse({
      success: false,
    });

    expect(invalidResult2.success).toBe(false);

    const invalidResult3 = errorSchema.safeParse({
      success: "not-a-boolean",
      error: {
        name: "ZodError",
        issues: [],
      },
    });

    expect(invalidResult3.success).toBe(false);
  });

  it("handles issues with optional message field", () => {
    const schema = z.string();
    const errorSchema = createErrorSchema(schema);

    const result = errorSchema.safeParse({
      success: false,
      error: {
        name: "ZodError",
        issues: [
          {
            code: "invalid_type",
            path: ["field"],
          },
        ],
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.error.issues[0].message).toBeUndefined();
  });

  it("handles mixed path types (string and number)", () => {
    const schema = z.object({
      items: z.array(z.string()),
    });
    const errorSchema = createErrorSchema(schema);

    const result = errorSchema.safeParse({
      success: false,
      error: {
        name: "ZodError",
        issues: [
          {
            code: "invalid_type",
            path: ["items", 0],
            message: "Expected string, received number",
          },
        ],
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.error.issues[0].path).toEqual(["items", 0]);
  });

  it("validates that success field accepts both true and false", () => {
    const schema = z.string();
    const errorSchema = createErrorSchema(schema);

    const result1 = errorSchema.safeParse({
      success: true,
      error: {
        name: "ZodError",
        issues: [],
      },
    });

    expect(result1.success).toBe(true);

    const result2 = errorSchema.safeParse({
      success: false,
      error: {
        name: "ZodError",
        issues: [],
      },
    });

    expect(result2.success).toBe(true);
  });

  it("validates error schema structure for object schemas", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const errorSchema = createErrorSchema(schema);

    // Test with a typical validation error
    const testData = {
      success: false,
      error: {
        name: "ZodError",
        issues: [
          {
            code: "invalid_type",
            path: ["name"],
            message: "Expected string, received undefined",
          },
          {
            code: "invalid_type",
            path: ["age"],
            message: "Expected number, received string",
          },
        ],
      },
    };

    const result = errorSchema.safeParse(testData);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error.name).toBe("ZodError");
      expect(result.data.error.issues).toHaveLength(2);

      result.data.error.issues.forEach((issue) => {
        expect(issue).toHaveProperty("code");
        expect(issue).toHaveProperty("path");
        expect(Array.isArray(issue.path)).toBe(true);

        // message is optional
        if (issue.message !== undefined) {
          expect(typeof issue.message).toBe("string");
        }
      });
    }
  });

  it("validates error schema structure for array schemas", () => {
    const schema = z.array(z.string());
    const errorSchema = createErrorSchema(schema);

    // Test with a typical validation error for arrays
    const testData = {
      success: false,
      error: {
        name: "ZodError",
        issues: [
          {
            code: "invalid_type",
            path: [0],
            message: "Expected string, received number",
          },
          {
            code: "invalid_type",
            path: [1],
            message: "Expected string, received boolean",
          },
        ],
      },
    };

    const result = errorSchema.safeParse(testData);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.success).toBe(false);
      expect(result.data.error.name).toBe("ZodError");
      expect(result.data.error.issues).toHaveLength(2);

      result.data.error.issues.forEach((issue) => {
        expect(issue).toHaveProperty("code");
        expect(issue).toHaveProperty("path");
        expect(Array.isArray(issue.path)).toBe(true);

        // Validate that path can contain numbers (array indices)
        issue.path.forEach((pathSegment) => {
          expect(typeof pathSegment === "string" || typeof pathSegment === "number").toBe(true);
        });
        // message is optional
        if (issue.message !== undefined) {
          expect(typeof issue.message).toBe("string");
        }
      });
    }
  });
});
