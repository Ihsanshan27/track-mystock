import { spawnSync } from 'node:child_process';
import { bootstrapAdminProfile, getSupabaseScriptConfig, verifyRequiredTables } from './lib.mjs';

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function runSupabaseCommand(args) {
  const result = spawnSync(npxCommand, ['supabase', ...args], {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

async function main() {
  console.log('Mendorong migration ke project Supabase...');
  runSupabaseCommand(['db', 'push']);

  console.log('Deploy Edge Function admin-create-user...');
  runSupabaseCommand(['functions', 'deploy', 'admin-create-user']);

  const { serviceRoleKey, firstAdminEmail } = getSupabaseScriptConfig();
  if (!serviceRoleKey) {
    console.log('Lewati verifikasi database dan bootstrap admin karena SUPABASE_SERVICE_ROLE_KEY belum diisi.');
    return;
  }

  const { missingTables, requiredTables } = await verifyRequiredTables();
  if (missingTables.length > 0) {
    throw new Error(
      `Masih ada table yang belum siap: ${missingTables.map((entry) => entry.tableName).join(', ')}`,
    );
  }

  console.log(`Verifikasi table berhasil: ${requiredTables.join(', ')}`);

  if (!firstAdminEmail) {
    console.log('Lewati bootstrap admin karena SUPABASE_FIRST_ADMIN_EMAIL belum diisi.');
    return;
  }

  console.log(`Bootstrap admin pertama untuk ${firstAdminEmail}...`);
  const profile = await bootstrapAdminProfile(firstAdminEmail);
  console.log(`Admin siap: ${profile.email} (${profile.default_role})`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
