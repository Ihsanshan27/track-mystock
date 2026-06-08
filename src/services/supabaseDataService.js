import { supabase } from './supabaseClient';

const TABLE_NAME = 'journal_data';
const DATA_KEYS = ['trades', 'watchlist', 'notes', 'cashflows', 'dividends', 'settings', 'marketPrices'];

export async function loadUserData(userId, workspaceId = null) {
  const ownerId = getRequiredUserId(userId);
  let query = supabase
    .from(TABLE_NAME)
    .select('data_key, data')
    .in('data_key', DATA_KEYS);

  query = applyDataScopeFilter(query, ownerId, workspaceId);
  const { data, error } = await query;

  if (error) throw error;

  return (data || []).reduce((acc, row) => {
    acc[row.data_key] = row.data;
    return acc;
  }, {});
}

export async function saveUserData(dataKey, data, userId, workspaceId = null) {
  const ownerId = getRequiredUserId(userId);
  const existingRow = await findUserDataRow(dataKey, ownerId, workspaceId);

  if (existingRow?.id) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({
        data,
        user_id: ownerId,
      })
      .eq('id', existingRow.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .insert({
      user_id: ownerId,
      workspace_id: workspaceId,
      data_key: dataKey,
      data,
    });

  if (error) throw error;
}

export async function replaceAllUserData(data, userId, workspaceId = null) {
  await Promise.all(
    DATA_KEYS
      .filter((key) => data[key] != null)
      .map((key) => saveUserData(key, data[key], userId, workspaceId))
  );
}

export async function clearUserData(userId, workspaceId = null) {
  const ownerId = getRequiredUserId(userId);
  let query = supabase
    .from(TABLE_NAME)
    .delete()
    .in('data_key', DATA_KEYS);

  query = applyDataScopeFilter(query, ownerId, workspaceId);
  const { error } = await query;
  if (error) throw error;
}

export { DATA_KEYS };

function getRequiredUserId(userId) {
  if (!userId) throw new Error('User belum login');
  return userId;
}

async function findUserDataRow(dataKey, userId, workspaceId) {
  let query = supabase
    .from(TABLE_NAME)
    .select('id')
    .eq('data_key', dataKey);

  query = applyDataScopeFilter(query, userId, workspaceId);
  query = query.limit(1).maybeSingle();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

function applyDataScopeFilter(query, userId, workspaceId) {
  if (workspaceId) {
    return query.eq('workspace_id', workspaceId);
  }

  return query
    .eq('user_id', userId)
    .is('workspace_id', null);
}
