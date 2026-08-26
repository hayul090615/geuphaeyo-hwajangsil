import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from './pool';

const migrationFiles = [
  '002_create_tables.sql',
  '003_seed_restrooms.sql',
  '004_migrate_to_toilets.sql',
  '005_create_service_requests.sql',
];

async function migrate() {
  try {
    for (const file of migrationFiles) {
      const sql = await readFile(resolve(process.cwd(), 'sql', file), 'utf8');
      await pool.query(sql);
      console.log(`Applied ${file}`);
    }
  } finally {
    await pool.end();
  }
}

void migrate().catch((error: unknown) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});
