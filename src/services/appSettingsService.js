import { isSupabaseConfigured, supabase } from './supabaseClient';
import { isMissingDatabaseSetupError } from '../utils/errorMessages';

export async function getRegistrationEnabled() {
  if (!isSupabaseConfigured) return true;

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'registration_enabled')
    .maybeSingle();

  if (error) {
    if (isMissingDatabaseSetupError(error)) return true;
    throw error;
  }
  return data?.value !== false;
}

export async function setRegistrationEnabled(enabled, userId) {
  if (!isSupabaseConfigured) return enabled;

  const { data, error } = await supabase
    .from('app_settings')
    .upsert({
      key: 'registration_enabled',
      value: Boolean(enabled),
      updated_by: userId,
    }, { onConflict: 'key' })
    .select('value')
    .single();

  if (error) throw error;
  return data.value !== false;
}
