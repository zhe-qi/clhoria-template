import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";
import { Resp } from "@/utils/zod";

import type { ClientUsersRouteHandlerType } from ".";

export const getUsersInfo: ClientUsersRouteHandlerType<"getUsersInfo"> = (c) => {
  // Handler logic to get user information
  // This is a placeholder; actual implementation will depend on your application's logic
  return c.json(Resp.ok({ message: "User information retrieved successfully" }), HttpStatusCodes.OK);
};
