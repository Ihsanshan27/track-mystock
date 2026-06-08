import { supabase } from '@/modules/shared/services/supabaseClient';

export async function createUserAsAdmin({ email, password, displayName, role }) {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: {
      email,
      password,
      displayName,
      role,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.user;
}
