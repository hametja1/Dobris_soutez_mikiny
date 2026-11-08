import { Pool, type QueryResultRow } from "pg";
import { SCHEMA_SQL } from "./schema";

/**
 * Připojení k Postgres. Na Vercelu ho dodá integrace Neon (proměnná DATABASE_URL),
 * lokálně stačí libovolná Postgres databáze.
 */

const globalForDb = globalThis as unknown as { pgPool?: Pool; schemaReady?: Promise<void> };

function getPool(): Pool {
  if (!globalForDb.pgPool) {
    const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("Chybí proměnná DATABASE_URL s připojením k databázi.");
    }
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
    globalForDb.pgPool = new Pool({
      connectionString,
      max: 3,
      ssl: isLocal ? undefined : { rejectUnauthorized: true },
    });
  }
  return globalForDb.pgPool;
}

function ensureSchema(): Promise<void> {
  if (!globalForDb.schemaReady) {
    globalForDb.schemaReady = getPool()
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((err) => {
        globalForDb.schemaReady = undefined;
        throw err;
      });
  }
  return globalForDb.schemaReady;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const res = await getPool().query<T>(text, params);
  return res.rows;
}
