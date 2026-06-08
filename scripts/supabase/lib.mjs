import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_TABLES = [
  'journal_data',
  'profiles',
  'workspaces',
  'workspace_members',
  'shared_access',
  'trade_reviews',
  'audit_logs',
  'app_settings',
  'report_shares',
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function readProjectEnv() {
  const cwd = process.cwd();
  const envFiles = ['.env', '.env.local'];

  return envFiles.reduce((acc, fileName) => {
    const filePath = path.join(cwd, fileName);
    return { ...acc, ...parseEnvFile(filePath) };
  }, {});
}

export function getEnv(key) {
  const fileEnv = readProjectEnv();
  return process.env[key] || fileEnv[key] || '';
}

export function getSupabaseScriptConfig() {
  const url = getEnv('VITE_SUPABASE_URL');
  const publishableKey = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const firstAdminEmail = getEnv('SUPABASE_FIRST_ADMIN_EMAIL').trim().toLowerCase();

  return {
    url,
    publishableKey,
    serviceRoleKey,
    firstAdminEmail,
  };
}

export function createServiceRoleClient() {
  const { url, serviceRoleKey } = getSupabaseScriptConfig();

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Butuh VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env atau environment variables.',
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function verifyRequiredTables() {
  const supabase = createServiceRoleClient();
  const missingTables = [];

  for (const tableName of REQUIRED_TABLES) {
    const { error } = await supabase.from(tableName).select('*', { head: true, count: 'exact' }).limit(1);
    if (error) {
      missingTables.push({ tableName, error: error.message });
    }
  }

  return {
    missingTables,
    requiredTables: REQUIRED_TABLES,
  };
}

export async function bootstrapAdminProfile(targetEmail) {
  const normalizedEmail = targetEmail.trim().toLowerCase();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc('bootstrap_admin_profile', {
    target_email: normalizedEmail,
  });

  if (error) {
    throw new Error(error.message);
  }

  const profile = Array.isArray(data) ? data[0] : data;
  if (!profile) {
    throw new Error('Bootstrap admin tidak mengembalikan data profile.');
  }

  return profile;
}
