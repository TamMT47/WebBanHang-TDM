import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Singleton Pool instance for Next.js API routes & Server Components
let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      user: process.env.PGUSER || 'postgres.oowsibtlhvgtqzyenkaw',
      password: process.env.PGPASSWORD || 'Tam04072001@#$',
      host: process.env.PGHOST || 'aws-0-ap-southeast-1.pooler.supabase.com',
      port: parseInt(process.env.PGPORT || '6543', 10),
      database: process.env.PGDATABASE || 'postgres',
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const pool = getPool();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  // console.log('Executed query', { text: text.slice(0, 80), duration, rows: res.rowCount });
  return res;
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  const client = await pool.connect();
  return client;
}

export default { query, getClient };
