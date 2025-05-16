import * as HttpStatusPhrases from "@/lib/stoker/http-status-phrases";
import { createMessageObjectSchema } from "@/lib/stoker/openapi/schemas";
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
