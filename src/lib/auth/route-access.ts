import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./middleware";

/** Returns true only when the current request has a verified Looters session. */
export const hasSignedInSession = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => true);
