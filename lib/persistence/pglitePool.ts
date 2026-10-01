import { EventEmitter } from "node:events";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const { Pool, types } = pg;

const RAW_OIDS = [
  16, 17, 18, 19, 20, 21, 23, 25, 26, 114, 700, 701, 1042, 1043, 1082, 1083, 1114,
  1184, 1186, 1266, 1560, 1562, 1700, 2950, 3802,
];
const rawParsers = Object.fromEntries(RAW_OIDS.map((oid) => [oid, (value: string) => value]));

type QueryConfig = {
  text?: string;
  values?: unknown[];
  types?: { getTypeParser?: (oid: number, format?: string) => (value: string) => unknown };
};

/**
 * pg.Pool that speaks to in-process PGlite.
 * PrismaPg requires a Pool instance. This keeps tests on real PostgreSQL SQL
 * without a remote server. Production uses a normal Pool against DATABASE_URL.
 */
export function createPglitePool(db: PGlite): pg.Pool {
  const acquire = createMutex();
  const pool = new Pool({
    host: "127.0.0.1",
    port: 1,
    database: "postgres",
    user: "postgres",
    max: 1,
    connectionTimeoutMillis: 1_000,
    idleTimeoutMillis: 0,
  });

  pool.query = (async (config: string | QueryConfig, values?: unknown[]) => {
    const release = await acquire();
    try {
      return await runQuery(db, config, values);
    } finally {
      release();
    }
  }) as pg.Pool["query"];
  pool.connect = (async () => {
    const release = await acquire();
    return new PgliteClient(db, release);
  }) as unknown as pg.Pool["connect"];
  pool.end = (async () => {
    await db.close();
  }) as pg.Pool["end"];
  return pool;
}

function createMutex() {
  let tail: Promise<void> = Promise.resolve();
  return function acquire(): Promise<() => void> {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = tail;
    tail = gate;
    return previous.then(() => release);
  };
}

class PgliteClient extends EventEmitter {
  private released = false;

  constructor(
    private readonly db: PGlite,
    private readonly unlock: () => void
  ) {
    super();
  }

  release(_error?: Error) {
    if (this.released) return;
    this.released = true;
    this.unlock();
  }

  async query(config: string | QueryConfig, values?: unknown[]) {
    return runQuery(this.db, config, values);
  }
}

async function runQuery(db: PGlite, config: string | QueryConfig, values?: unknown[]) {
  const text = typeof config === "string" ? config : config.text ?? "";
  const params = typeof config === "string" ? values : config.values;
  const getTypeParser = typeof config === "string" ? undefined : config.types?.getTypeParser;
  try {
    const result = await db.query<unknown[]>(text, params, {
      rowMode: "array",
      parsers: rawParsers,
    });
    const fields = result.fields.map((field) => ({
      name: field.name,
      dataTypeID: field.dataTypeID,
    }));
    const rows = result.rows.map((row) =>
      row.map((value, index) => parseCell(value, fields[index]?.dataTypeID ?? 25, getTypeParser))
    );
    return {
      rows,
      fields,
      rowCount: result.affectedRows ?? rows.length,
    };
  } catch (error) {
    throw asPgError(error);
  }
}

function parseCell(
  value: unknown,
  oid: number,
  getTypeParser?: (oid: number, format?: string) => (value: string) => unknown
) {
  if (value == null) return null;
  const parse = getTypeParser
    ? getTypeParser(oid, "text")
    : types.getTypeParser(oid, "text");
  return parse(typeof value === "string" ? value : String(value));
}

function asPgError(error: unknown): Error {
  if (!(error instanceof Error)) return new Error(String(error));
  const source = error as Error & {
    code?: string;
    severity?: string;
    detail?: string;
    column?: string;
    hint?: string;
  };
  if (typeof source.code === "string" && typeof source.severity === "string") return source;
  return Object.assign(error, {
    code: source.code ?? "N/A",
    severity: source.severity ?? "ERROR",
    detail: source.detail,
    column: source.column,
    hint: source.hint,
  });
}
