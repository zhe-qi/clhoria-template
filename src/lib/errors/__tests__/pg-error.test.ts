import { DrizzleQueryError } from "drizzle-orm/errors";
import postgres from "postgres";
import { describe, expect, it } from "vitest";

import * as HttpStatusCodes from "@/lib/core/stoker/http-status-codes";

import { extractPgError, mapPgErrorToResponse } from "../pg-error";

function makePgError(code: string, message = "test error"): postgres.PostgresError {
  const err = Object.create(postgres.PostgresError.prototype) as postgres.PostgresError;
  Object.assign(err, { code, message, name: "PostgresError" });
  return err;
}

describe("extractPgError", () => {
  it("returns the PostgresError directly when thrown raw", () => {
    const pgErr = makePgError("23505");
    const got = extractPgError(pgErr);

    expect(got?.pgError).toBe(pgErr);
    expect(got?.query).toBeUndefined();
  });

  it("unwraps a Drizzle v1 DrizzleQueryError and preserves query/params", () => {
    const pgErr = makePgError("23505");
    const drizzleErr = new DrizzleQueryError("INSERT INTO users ...", ["a", "b"], pgErr);
    const got = extractPgError(drizzleErr);

    expect(got?.pgError).toBe(pgErr);
    expect(got?.query).toBe("INSERT INTO users ...");
    expect(got?.params).toEqual(["a", "b"]);
  });

  it("recursively walks cause chains", () => {
    const pgErr = makePgError("23503");
    const drizzleErr = new DrizzleQueryError("SQL", [], pgErr);
    const outer = new Error("wrapped", { cause: drizzleErr });
    const got = extractPgError(outer);

    expect(got?.pgError).toBe(pgErr);
    expect(got?.query).toBe("SQL");
  });

  it("matches EffectDrizzleQueryError-shaped objects via duck typing", () => {
    const pgErr = makePgError("40001");
    const effectShaped = {
      _tag: "EffectDrizzleQueryError",
      query: "UPDATE accounts SET ...",
      params: [1, 2],
      cause: pgErr,
    };
    const got = extractPgError(effectShaped);

    expect(got?.pgError).toBe(pgErr);
    expect(got?.query).toBe("UPDATE accounts SET ...");
    expect(got?.params).toEqual([1, 2]);
  });

  it("returns null for non-pg errors", () => {
    expect(extractPgError(new Error("nope"))).toBeNull();
    expect(extractPgError(null)).toBeNull();
    expect(extractPgError(undefined)).toBeNull();
    expect(extractPgError("string")).toBeNull();
  });
});

describe("mapPgErrorToResponse", () => {
  it("returns the configured message + status for known codes", () => {
    const config = mapPgErrorToResponse(makePgError("23505"));

    expect(config.message).toBe("数据已存在");
    expect(config.statusCode).toBe(HttpStatusCodes.CONFLICT);
  });

  it("falls back to 500 for unmapped codes", () => {
    const config = mapPgErrorToResponse(makePgError("99999"));

    expect(config.message).toBe("数据库操作失败");
    expect(config.statusCode).toBe(HttpStatusCodes.INTERNAL_SERVER_ERROR);
  });
});
