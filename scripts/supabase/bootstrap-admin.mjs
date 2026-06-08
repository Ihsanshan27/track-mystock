import { bootstrapAdminProfile, getSupabaseScriptConfig } from './lib.mjs';

async function main() {
  const emailArg = process.argv[2]?.trim().toLowerCase();
  const { firstAdminEmail } = getSupabaseScriptConfig();
  const targetEmail = emailArg || firstAdminEmail;

  if (!targetEmail) {
    throw new Error(
      'Email admin belum diisi. Jalankan `npm run db:bootstrap-admin -- email@contoh.com` atau set SUPABASE_FIRST_ADMIN_EMAIL.',
    );
  }

  const profile = await bootstrapAdminProfile(targetEmail);

  console.log(`Admin siap: ${profile.email} (${profile.default_role})`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
