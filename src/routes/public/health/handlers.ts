import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { Resp } from "@/utils";
import { formatDate } from "@/utils/tools/formatter";

import type { HealthRouteHandlerType } from ".";

export const get: HealthRouteHandlerType<"get"> = async (c) => {
  return c.json(Resp.ok({
    status: "ok",
    timestamp: formatDate(new Date()),
  }), HttpStatusCodes.OK);
};
