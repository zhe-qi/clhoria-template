import type { IDatabase } from "pg-boss/dist/types";
import type { Sql } from "postgres";

import { PgBoss } from "pg-boss";

import { getQueryClient } from "@/db/postgres";

export const postgresAdapter: (sql: Sql) => IDatabase = (sql: Sql) => ({
  executeSql: async (query: string, values?: any[]) => {
    // Reserving a connection is required because pg-boss starts transactions
    const reserved = await sql.reserve();

    // pg-boss inserts jobs with a query containing `json_to_recordset($1::json)`
    // with value being a stringified JSON object, which causes an error with the `postgres` package.
    const parsedValues = values?.map((v) => {
      if (typeof v !== "string") {
        return v;
      }

      try {
        return JSON.parse(v);
      }
      catch {
        return v;
      }
    });

    // Calling unsafe() this way is safe when the query
    // contains placeholders ($1, $2, ...) for the values
    const rows = await reserved.unsafe(query, parsedValues);

    reserved.release();
    return { rows };
  },
});

const boss = new PgBoss({
  db: postgresAdapter(getQueryClient()),
});

export default boss;
