import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { createMessageObjectSchema } from "stoker/openapi/schemas";

import { formatZodError } from "@/utils";

export const ZOD_ERROR_MESSAGES = {
  REQUIRED: "Required",
  EXPECTED_NUMBER: "Expected number, received nan",
  NO_UPDATES: "No updates provided",
  USER_EXISTS: "User already exists",
  USER_NOT_FOUND: "User not found",
  PASSWORD_ERROR: "Password error",
} as const;

export const ZOD_ERROR_CODES = {
  INVALID_UPDATES: "invalid_updates",
} as const;

export const notFoundSchema = createMessageObjectSchema(HttpStatusPhrases.NOT_FOUND);

export const updatesZodError = formatZodError({
  issues: [
    {
      code: ZOD_ERROR_CODES.INVALID_UPDATES,
      path: [],
      message: ZOD_ERROR_MESSAGES.NO_UPDATES,
    },
  ],
  name: "ZodError",
});
