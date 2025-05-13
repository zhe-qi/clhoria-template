import * as HttpStatusCodes from "stoker/http-status-codes";

import { tasks } from "@/db/schema";
import paginatedQuery from "@/lib/pagination";

import type { TaskRouteHandlerType } from "./tasks.index";

export const list: TaskRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");

  const result = await paginatedQuery<typeof tasks.$inferSelect>({
    table: tasks,
    params: query,
  });

  return c.json(result, HttpStatusCodes.OK);
};
