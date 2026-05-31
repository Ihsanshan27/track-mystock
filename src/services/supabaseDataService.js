import { supabase } from './supabaseClient';

const TABLE_NAME = 'journal_data';
const DATA_KEYS = ['trades', 'watchlist', 'notes', 'cashflows', 'dividends', 'settings', 'marketPrices'];

export async function loadUserData(userId) {
  const ownerId = getRequiredUserId(userId);
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('data_key, data')
    .eq('user_id', ownerId)
    .in('data_key', DATA_KEYS);

  if (error) throw error;

  return (data || []).reduce((acc, row) => {
    acc[row.data_key] = row.data;
    return acc;
  }, {});
}

export async function saveUserData(dataKey, data, userId) {
  const ownerId = getRequiredUserId(userId);

  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(
      { user_id: ownerId, data_key: dataKey, data },
      { onConflict: 'user_id,data_key' }
    );

  if (error) throw error;
}

export async function replaceAllUserData(data, userId) {
  await Promise.all(
    DATA_KEYS
      .filter((key) => data[key] != null)
      .map((key) => saveUserData(key, data[key], userId))
  );
}

export async function clearUserData(userId) {
  const ownerId = getRequiredUserId(userId);
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('user_id', ownerId)
    .in('data_key', DATA_KEYS);
  if (error) throw error;
}

export { DATA_KEYS };

function getRequiredUserId(userId) {
  if (!userId) throw new Error('User belum login');
  return userId;
}
