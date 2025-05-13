export function formatZodError(error: {
  issues: {
    code: string;
    path: string[];
    message: string;
  }[];
  name: string;
}) {
  return {
    success: false,
    error: {
      issues: error.issues,
      name: "ZodError",
    },
  };
}
