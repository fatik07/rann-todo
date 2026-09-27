import { config } from 'dotenv'

import { readFileSync } from 'node:fs'
import dns from 'node:dns/promises'
import { Pool } from 'pg'

config({ path: '.env.local' })

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const parsed = new URL(url)
const originalHost = parsed.hostname
const port = Number(parsed.port || 5432)
const user = decodeURIComponent(parsed.username)
const password = decodeURIComponent(parsed.password)
const database = parsed.pathname.slice(1) || 'postgres'

async function resolveHost(host: string): Promise<string> {
  try {
    const ips = await dns.resolve4(host)
    if (ips.length > 0) {
      console.log(`DNS resolved ${host} -> ${ips[0]}`)
      return ips[0]
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`DNS resolve failed for ${host}: ${msg}`)
  }
  console.warn(`Falling back to hardcoded IP 54.255.219.82`)
  return '54.255.219.82'
}

const resolvedHost = await resolveHost(originalHost)

const pool = new Pool({
  host: resolvedHost,
  port,
  user,
  password,
  database,
  ssl: {
    rejectUnauthorized: false,
    servername: originalHost,
  },
  connectionTimeoutMillis: 15000,
})

const sqlPath = new URL(
  '../src/db/migrations/0002_old_lord_hawal.sql',
  import.meta.url,
)
const sql = readFileSync(sqlPath, 'utf8')
const statements = sql
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter(Boolean)

const existsRows = await pool.query<{ table_name: string }>(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'subtasks'`,
)
if (existsRows.rows.length > 0) {
  console.log('\n✓ Table `subtasks` already exists in target DB.')
  console.log('  Skipping migration 0002 (idempotent guard).\n')
} else {
  try {
    await pool.query('SELECT 1')
    console.log('\n✓ Connection OK\n')

    for (const [i, stmt] of statements.entries()) {
      const preview = stmt.replace(/\s+/g, ' ').slice(0, 70)
      try {
        await pool.query(stmt)
        console.log(`[${i + 1}/${statements.length}] OK: ${preview}...`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[${i + 1}/${statements.length}] FAIL: ${msg}`)
        console.error(`  >> ${preview}`)
        process.exit(1)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`Migration aborted: ${msg}`)
    await pool.end()
    process.exit(1)
  }
}

const tables = await pool.query<{ table_name: string }>(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name`,
)
const enums = await pool.query<{ typname: string }>(
  `SELECT typname FROM pg_type
   WHERE typtype = 'e' AND typname NOT LIKE 'pg_%' ORDER BY typname`,
)
const indexes = await pool.query<{
  indexname: string
  tablename: string
}>(`SELECT indexname, tablename FROM pg_indexes
   WHERE schemaname = 'public' ORDER BY tablename, indexname`)
const fks = await pool.query<{
  conname: string
  conrelid: string
  confrelid: string
}>(`SELECT conname, conrelid::regclass, confrelid::regclass
   FROM pg_constraint
   WHERE contype = 'f' AND connamespace = 'public'::regnamespace
   ORDER BY conrelid::regclass::text, conname`)
const subtaskColumns = await pool.query<{ column_name: string }>(
  `SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'subtasks'
   ORDER BY ordinal_position`,
)

console.log('\n=== Tables ===')
for (const r of tables.rows) console.log(' -', r.table_name)

console.log('\n=== Subtasks columns ===')
for (const r of subtaskColumns.rows) console.log(' -', r.column_name)

console.log('\n=== Enums ===')
for (const r of enums.rows) console.log(' -', r.typname)

console.log('\n=== Indexes ===')
for (const r of indexes.rows) console.log(` - ${r.indexname} on ${r.tablename}`)

console.log('\n=== Foreign keys ===')
for (const r of fks.rows) console.log(' -', r.conname)

await pool.end()
