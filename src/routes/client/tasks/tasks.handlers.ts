import * as HttpStatusCodes from "stoker/http-status-codes";

import db from "@/db";
import { tasks } from "@/db/schema";

import type { TasksRouteHandlerType } from "./tasks.index";

export const list: TasksRouteHandlerType<"list"> = async (c) => {
  const _query = c.req.valid("query");

  const taskList = await db.select().from(tasks);

  return c.json(taskList, HttpStatusCodes.OK);
};
