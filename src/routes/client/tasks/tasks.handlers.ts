import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { tasks } from "@/db/schema";

import type { TasksRouteHandlerType as RouteHandlerType } from "./tasks.index";

export const list: RouteHandlerType<"list"> = async (c) => {
  const _query = c.req.valid("query");

  const taskList = await db.select().from(tasks);

  return c.json(taskList, HttpStatusCodes.OK);
};
