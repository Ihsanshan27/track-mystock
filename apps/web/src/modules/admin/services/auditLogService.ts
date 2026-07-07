import { apiRequest, isApiConfigured } from '@/modules/shared/services/apiClient';

export async function createAuditLog({ actorId, action, targetType, targetId, metadata = {} }) {
  void actorId;
  void action;
  void targetType;
  void targetId;
  void metadata;
  return;
}

export async function createAuditLogSafe(payload) {
  try {
    await createAuditLog(payload);
  } catch (error) {
    console.warn('Audit log gagal dibuat:', error.message);
  }
}

export async function listAuditLogs(limit = 100) {
  if (!isApiConfigured) return [];

  const data = await apiRequest('/audit-logs');
  return Array.isArray(data) ? data.slice(0, limit) : [];
}

export async function cleanOldAuditLogs(retentionDays: number) {
  void retentionDays;
  return 0;
}
