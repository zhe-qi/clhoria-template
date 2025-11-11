import { format } from "date-fns";

import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { Resp } from "@/utils";

import type { HealthRouteHandlerType } from ".";

export const get: HealthRouteHandlerType<"get"> = async (c) => {
  return c.json(Resp.ok({
    status: "ok",
    timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
  }), HttpStatusCodes.OK);
};
