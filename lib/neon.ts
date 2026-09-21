import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sqlClient: NeonQueryFunction<false, false> | undefined;

export function sql(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("Missing DATABASE_URL. Add the Neon connection string to .env.local.");
    sqlClient = neon<false, false>(databaseUrl);
  }
  return sqlClient;
}
