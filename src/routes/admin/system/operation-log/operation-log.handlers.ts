import type { z } from "zod";

import type { selectTsOperationLogSchema } from "@/db/schema";

import { tsOperationLog } from "@/db/schema";
import { getQueryValidationError } from "@/lib/enums/zod";
import paginatedQuery from "@/lib/pagination";
import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";

import type { SystemOperationLogRouteHandlerType } from "./operation-log.index";

export const list: SystemOperationLogRouteHandlerType<"list"> = async (c) => {
  const query = c.req.valid("query");
  const domain = c.get("userDomain");

  const [error, result] = await paginatedQuery<z.infer<typeof selectTsOperationLogSchema>>({
    table: tsOperationLog,
    params: query,
    domain,
  });

  if (error) {
    return c.json(getQueryValidationError(error), HttpStatusCodes.UNPROCESSABLE_ENTITY);
  }

  return c.json(result, HttpStatusCodes.OK);
};
