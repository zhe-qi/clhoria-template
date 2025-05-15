import * as HttpStatusCodes from "stoker/http-status-codes";

import { tasks } from "@/db/schema";
import { getQueryValidationError } from "@/lib/constants";
import paginatedQuery from "@/lib/pagination";

import type { TaskRouteHandlerType as RouteHandlerType } from "./tasks.index";

export const list: RouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");

  const [error, result] = await paginatedQuery<typeof tasks.$inferSelect>({
    table: tasks,
    params: query,
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  return c.json(result, HttpStatusCodes.OK);
};
