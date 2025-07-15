import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { createMessageObjectSchema } from "stoker/openapi/schemas";

import { formatZodError } from "@/utils";

export const notFoundSchema = createMessageObjectSchema(HttpStatusPhrases.NOT_FOUND);

export const updatesZodError = formatZodError({
  issues: [
    {
      code: "invalid_updates",
      path: [],
      message: "没有更新内容",
    },
  ],
  name: "ZodError",
});

export function getQueryValidationError(error: { message: string }) {
  return formatZodError({
    issues: [
      {
        code: "invalid_query",
        path: [],
        message: error.message,
      },
    ],
    name: "ZodError",
  });
}

export function getDuplicateKeyError(field: string, message: string) {
  return {
    error: {
      issues: [{
        code: "duplicate_key",
        path: [field],
        message,
      }],
      name: "ValidationError",
    },
    success: false,
  };
}
