import type { ZodSchema } from "./types.ts";

import oneOf from "./one-of.js";

function jsonContentOneOf<
  T extends ZodSchema,
>(schemas: T[], description: string) {
  return {
    content: {
      "application/json": {
        schema: {
          oneOf: oneOf(schemas),
        },
      },
    },
    description,
  };
}

export default jsonContentOneOf;
