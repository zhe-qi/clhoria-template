import { z } from "zod";

export function parseTextToZodError(text: string): z.ZodError {
  const issues: z.core.$ZodIssue[] = [];

  issues.push({
    code: "custom",
    message: text,
    path: [],
  });

  return new z.ZodError(issues);
}
