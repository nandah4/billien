import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { env } from "@/lib/env";

let sqlClient: NeonQueryFunction<false, false> | undefined;

export function sql(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    sqlClient = neon<false, false>(env.databaseUrl());
  }
  return sqlClient;
}
