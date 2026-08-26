import { pool } from './pool';

async function testConnection(): Promise<void> {
  try {
    const result = await pool.query<{ now: Date; database_name: string }>(
      'SELECT NOW() AS now, CURRENT_DATABASE() AS database_name;'
    );

    const row = result.rows[0];
    console.log(`PostgreSQL 연결 성공: ${row.database_name} (${row.now.toISOString()})`);
  } catch (error) {
    console.error('PostgreSQL 연결 실패:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void testConnection();
