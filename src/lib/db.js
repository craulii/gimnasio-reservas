import pg from 'pg';

const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Convert MySQL-style ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

// Wrap pg result to return [rows, fields] like mysql2
function wrapResult(pgResult) {
  const rows = pgResult.rows;
  // Synthesize affectedRows for INSERT/UPDATE/DELETE
  rows.affectedRows = pgResult.rowCount;
  return [rows, pgResult.fields];
}

// Pool-level query/execute (no dedicated connection)
const pool = {
  async query(sql, params = []) {
    const converted = convertPlaceholders(sql);
    const result = await pgPool.query(converted, params);
    return wrapResult(result);
  },

  async execute(sql, params = []) {
    return this.query(sql, params);
  },

  async getConnection() {
    const client = await pgPool.connect();

    return {
      async query(sql, params = []) {
        const converted = convertPlaceholders(sql);
        const result = await client.query(converted, params);
        return wrapResult(result);
      },

      async execute(sql, params = []) {
        return this.query(sql, params);
      },

      async beginTransaction() {
        await client.query('BEGIN');
      },

      async commit() {
        await client.query('COMMIT');
      },

      async rollback() {
        await client.query('ROLLBACK');
      },

      release() {
        client.release();
      },
    };
  },
};

export default pool;
