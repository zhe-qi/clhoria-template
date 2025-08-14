import type { z } from "zod";

import * as HttpStatusCodes from "stoker/http-status-codes";

import type { selectTsLoginLogSchema } from "@/db/schema";

import { tsLoginLog } from "@/db/schema";
import { getQueryValidationError } from "@/lib/enums/zod";
import paginatedQuery from "@/lib/pagination";

import type { SystemLoginLogRouteHandlerType } from "./login-log.index";

export const list: SystemLoginLogRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");
  const domain = c.get("userDomain");

  const [error, result] = await paginatedQuery<z.infer<typeof selectTsLoginLogSchema>>({
    table: tsLoginLog,
    params: query,
    domain,
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  return c.json(result, HttpStatusCodes.OK);
};
