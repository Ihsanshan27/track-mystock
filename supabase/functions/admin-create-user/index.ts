// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const roles = new Set(['admin', 'mentor', 'trader', 'viewer']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Supabase function environment belum lengkap.');
    }

    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) throw new Error('User belum login.');

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('default_role')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw profileError;
    if (profile?.default_role !== 'admin') throw new Error('Hanya admin yang bisa menambah user.');

    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const displayName = String(body.displayName || email.split('@')[0] || 'User').trim();
    const role = String(body.role || 'trader');

    if (!email.includes('@')) throw new Error('Email tidak valid.');
    if (password.length < 6) throw new Error('Password minimal 6 karakter.');
    if (!roles.has(role)) throw new Error('Role tidak valid.');

    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
      },
    });

    if (createError) throw createError;
    const createdUser = createData.user;
    if (!createdUser) throw new Error('User gagal dibuat.');

    const { error: profileUpsertError } = await adminClient
      .from('profiles')
      .upsert({
        id: createdUser.id,
        email,
        display_name: displayName,
        default_role: role,
      }, { onConflict: 'id' });

    if (profileUpsertError) throw profileUpsertError;

    await adminClient
      .from('audit_logs')
      .insert({
        actor_id: authData.user.id,
        action: 'auth.user_created',
        target_type: 'profile',
        target_id: createdUser.id,
        metadata: { email, role },
      });

    return new Response(JSON.stringify({
      user: {
        id: createdUser.id,
        email,
        displayName,
        role,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
