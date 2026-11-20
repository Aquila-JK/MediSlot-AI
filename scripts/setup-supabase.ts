/**
 * MediSlot AI — Automated Supabase Setup & Verification Script
 *
 * Usage:
 *   npx tsx scripts/setup-supabase.ts
 *   npm run setup:supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import {
  INITIAL_DOCTORS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PATIENTS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_SCHEDULES,
  ASSETS,
} from '../src/data/seedData.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';

function isPlaceholder(val: string): boolean {
  if (!val) return true;
  return (
    val.includes('your-project-id') ||
    val.includes('your-supabase') ||
    val.includes('your-anon-key') ||
    val.includes('your-service-role-key') ||
    val.includes('YOUR-PASSWORD')
  );
}

async function runDirectPostgresSetup(dbUrl: string): Promise<boolean> {
  console.log('\n[1/3] Connecting directly to Supabase PostgreSQL database...');
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('✓ Successfully connected to PostgreSQL server.\n');

    console.log('[2/3] Applying schema (supabase/schema.sql)...');
    const schemaSqlPath = path.join(rootDir, 'supabase', 'schema.sql');
    if (fs.existsSync(schemaSqlPath)) {
      const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
      await client.query(schemaSql);
      console.log('✓ Tables, indexes, triggers, and RLS policies created successfully.\n');
    } else {
      console.warn('! schema.sql not found at', schemaSqlPath);
    }

    console.log('[3/3] Populating initial seed data (supabase/seed.sql)...');
    const seedSqlPath = path.join(rootDir, 'supabase', 'seed.sql');
    if (fs.existsSync(seedSqlPath)) {
      const seedSql = fs.readFileSync(seedSqlPath, 'utf8');
      await client.query(seedSql);
      console.log('✓ Specialists, clinical schedule slots, EHR patients, and alerts seeded.\n');
    }

    // Verify tables
    const tableRes = await client.query(`
      select table_name 
      from information_schema.tables 
      where table_schema = 'public' 
      order by table_name;
    `);
    const tables = tableRes.rows.map((r: { table_name: string }) => r.table_name);
    console.log('====================================================');
    console.log('🎉 Supabase Setup Complete!');
    console.log(`Verified ${tables.length} tables in schema public:`);
    tables.forEach((t: string) => console.log(`  - ${t}`));
    console.log('====================================================\n');

    await client.end();
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL Execution failed:', err instanceof Error ? err.message : String(err));
    try {
      await client.end();
    } catch {
      // ignore
    }
    return false;
  }
}

async function runRestSdkVerification(): Promise<boolean> {
  console.log('\n[Checking Supabase REST Client API]');
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || isPlaceholder(SUPABASE_URL) || !key || isPlaceholder(key)) {
    printHelpGuide();
    return false;
  }

  const supabase = createClient(SUPABASE_URL, key);

  try {
    const { data, error } = await supabase.from('doctors').select('id, name, specialty').limit(5);

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.log('\n⚠️  Supabase endpoint reached, but database tables do not exist yet!');
        console.log('To create the tables:');
        console.log('  Option A (Recommended): Add DATABASE_URL to your .env file and re-run:');
        console.log('     DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"');
        console.log('     npm run setup:supabase\n');
        console.log('  Option B: In Supabase Dashboard -> SQL Editor, copy and run:');
        console.log('     supabase/schema.sql');
        console.log('     supabase/seed.sql\n');
        return false;
      }
      throw error;
    }

    console.log('✓ Successfully connected to Supabase via REST API!');
    console.log(`✓ Found ${data?.length ?? 0} active specialists in database:`);
    data?.forEach((d) => console.log(`   • ${d.name} (${d.specialty})`));

    // Check other key tables
    const [pats, appts, scheds, notifs] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact', head: true }),
      supabase.from('appointments').select('id', { count: 'exact', head: true }),
      supabase.from('schedules').select('id', { count: 'exact', head: true }),
      supabase.from('notifications').select('id', { count: 'exact', head: true }),
    ]);

    console.log('\nDatabase Row Counts:');
    console.log(`  • Patients EHR:       ${pats.count ?? 0} records`);
    console.log(`  • Appointments:       ${appts.count ?? 0} records`);
    console.log(`  • Schedule Slots:     ${scheds.count ?? 0} records`);
    console.log(`  • Notifications:      ${notifs.count ?? 0} alerts`);

    console.log('\n✓ MediSlot AI Backend is fully integrated with Supabase!\n');
    return true;
  } catch (err) {
    console.error('❌ Supabase REST API check failed:', err instanceof Error ? err.message : String(err));
    return false;
  }
}

function printHelpGuide() {
  console.log('\n======================================================================');
  console.log('  MediSlot AI — Supabase Credentials Setup Guide');
  console.log('======================================================================');
  console.log('Your .env file currently has placeholder or missing Supabase keys.\n');
  console.log('To set up Supabase:');
  console.log('1. Go to https://database.new (or https://supabase.com) and create a project.');
  console.log('2. In your Supabase Dashboard:');
  console.log('   - Navigate to: Project Settings -> API');
  console.log('   - Copy the "Project URL"');
  console.log('   - Copy the "anon" public key');
  console.log('   - Copy the "service_role" secret key');
  console.log('   - Navigate to: Project Settings -> Database -> Connection String (URI)');
  console.log('     Copy the PostgreSQL URI\n');
  console.log('3. Open your .env file and paste:');
  console.log('   SUPABASE_URL="https://xyzcompany.supabase.co"');
  console.log('   SUPABASE_ANON_KEY="eyJhbGciOi..."');
  console.log('   SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."');
  console.log('   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xyzcompany.supabase.co:5432/postgres"\n');
  console.log('4. Run the automated setup:');
  console.log('   npm run setup:supabase\n');
  console.log('Note: Until credentials are configured, MediSlot AI automatically');
  console.log('operates in resilient Local Fallback Mode for seamless offline development.');
  console.log('======================================================================\n');
}

async function main() {
  console.log('====================================================');
  console.log('  MediSlot AI — Supabase Configuration & Setup');
  console.log('====================================================');

  if (DATABASE_URL && !isPlaceholder(DATABASE_URL)) {
    const success = await runDirectPostgresSetup(DATABASE_URL);
    if (success) {
      await runRestSdkVerification();
      return;
    }
  }

  if (SUPABASE_URL && !isPlaceholder(SUPABASE_URL)) {
    await runRestSdkVerification();
    return;
  }

  printHelpGuide();
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
