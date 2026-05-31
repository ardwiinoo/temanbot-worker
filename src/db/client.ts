import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { config } from "../config";
import * as schema from "./schema";

const queryClient = postgres(config.databaseUrl, {
  prepare: false,
  max: 5,
});

export const db = drizzle(queryClient, { schema });