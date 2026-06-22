import { useEffect, useMemo, useState, ReactNode } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { useAuth } from '@/modules/auth/AuthContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { cleanOldAuditLogs, createAuditLogSafe } from '@/modules/admin/services/auditLogService';
import { listProfiles } from '@/modules/shared/services/profileService';
import { ACCESS_LEVELS, listOwnedSharedAccess, revokeSharedAccess, upsertSharedAccess } from '@/modules/shared/services/sharedAccessService';
import { isSupabaseConfigured } from '@/modules/shared/services/supabaseClient';
import { formatDateTime, formatRupiah, formatUSD } from '@/modules/shared/utils/formatters';
import CurrencyInput from '@/modules/shared/components/CurrencyInput';
import SelectionToggleCard from '@/modules/shared/components/SelectionToggleCard';
import {
  Brain,
  Database,
  LogOut,
  Monitor,
  Plus,
  Save,
  Share2,
  ShieldCheck,
  Tag,
  Trash2,
  User2,
  Wallet,
  X
} from 'lucide-react';

const ACCESS_LABELS = {
  read: 'Read Only',
  review: 'Review Mentor',
  admin: 'Admin Share',
};

const BROKERS_ID = [
  { name: 'Custom', buyFee: 0.15, sellFee: 0.25 },
  { name: 'Ajaib', buyFee: 0.15, sellFee: 0.25 },
  { name: 'Stockbit', buyFee: 0.15, sellFee: 0.25 },
  { name: 'IndoPremier', buyFee: 0.19, sellFee: 0.29 },
  { name: 'Mirae Asset', buyFee: 0.15, sellFee: 0.25 },
];

const BROKERS_US = [
  { name: 'Custom', buyFee: 0.00, sellFee: 0.00 },
  { name: 'Gotrade', buyFee: 0.00, sellFee: 0.00 },
  { name: 'Interactive Brokers', buyFee: 0.05, sellFee: 0.05 },
];

const SETTING_TABS = [
  { id: 'trading', label: 'Trading', icon: Wallet },
  { id: 'preferences', label: 'Preferensi & UI', icon: Monitor },
  { id: 'behavior', label: 'Perilaku', icon: Brain },
  { id: 'strategies', label: 'Strategi & Emosi', icon: Tag },
  { id: 'sharing', label: 'Sharing', icon: Share2 },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'account', label: 'Akun', icon: User2 },
];

interface SectionCardProps {
  title: string;
  description?: string;
  children?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}

function SectionCard({
  title,
  description,
  children,
  actionLabel,
  onAction,
  actionDisabled = false,
}: SectionCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {description ? <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{description}</div> : null}
        </div>
      </div>
      <div className="card-body">
        {children}
        {actionLabel && onAction ? (
          <div style={{ marginTop: 24 }}>
            <button className="btn btn-primary" onClick={onAction} disabled={actionDisabled}>
              <Save size={16} />
              <span>{actionLabel}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  children,
}: ToggleRowProps) {
  return (
    <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <SelectionToggleCard
          checked={!!checked}
          onToggle={() => onChange(!checked)}
          title={title}
          description={description}
        />
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, showToast, exportData, importData, clearData } = useData();
  const { user, updateUsername, logout } = useAuth();
  const { roleLabel, roleError, refreshProfile, can } = usePermissions();
  const { confirm } = useDialog();
  const [activeTab, setActiveTab] = useState('trading');
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [form, setForm] = useState({ ...settings });
  const [allProfiles, setAllProfiles] = useState([]);
  const [sharedAccessRows, setSharedAccessRows] = useState([]);
  const [shareLoading, setShareLoading] = useState(true);
  const [shareSaving, setShareSaving] = useState(false);
  const [shareForm, setShareForm] = useState({
    granteeId: '',
    accessLevel: 'review',
    expiresAt: '',
  });
  const [newStrategy, setNewStrategy] = useState('');
  const [newEmotionVal, setNewEmotionVal] = useState('');
  const [newEmotionLbl, setNewEmotionLbl] = useState('');

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  useEffect(() => {
    setNewUsername(user?.username || user?.displayName || '');
  }, [user?.displayName, user?.username]);

  useEffect(() => {
    let cancelled = false;

    async function loadSharingData() {
      if (!can('share:journal') || !user?.id || !isSupabaseConfigured) {
        setAllProfiles([]);
        setSharedAccessRows([]);
        setShareLoading(false);
        return;
      }

      setShareLoading(true);
      try {
        const [profiles, accessRows] = await Promise.all([
          listProfiles(),
          listOwnedSharedAccess(user.id),
        ]);
        if (cancelled) return;
        setAllProfiles(profiles.filter((item) => item.id !== user.id));
        setSharedAccessRows(accessRows);
      } catch (error) {
        if (!cancelled) showToast(`Gagal memuat data sharing: ${error.message}`, 'error');
      } finally {
        if (!cancelled) setShareLoading(false);
      }
    }

    loadSharingData();
    return () => {
      cancelled = true;
    };
  }, [can, showToast, user?.id]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleBrokerIDChange = (brokerName: string) => {
    const broker = BROKERS_ID.find((item) => item.name === brokerName);
    if (!broker) return;
    setForm((prev) => ({
      ...prev,
      selectedBrokerID: brokerName,
      ...(brokerName !== 'Custom' ? { defaultBuyFee: broker.buyFee, defaultSellFee: broker.sellFee } : {})
    }));
  };

  const handleBrokerUSChange = (brokerName: string) => {
    const broker = BROKERS_US.find((item) => item.name === brokerName);
    if (!broker) return;
    setForm((prev) => ({
      ...prev,
      selectedBrokerUS: brokerName,
      ...(brokerName !== 'Custom' ? { defaultBuyFeeUS: broker.buyFee, defaultSellFeeUS: broker.sellFee } : {})
    }));
  };

  const addStrategy = () => {
    const value = newStrategy.trim();
    if (!value) return;
    if ((form.customStrategies || []).includes(value)) {
      showToast('Strategi sudah terdaftar', 'error');
      return;
    }
    setForm((prev) => ({
      ...prev,
      customStrategies: [...(prev.customStrategies || []), value]
    }));
    setNewStrategy('');
  };

  const removeStrategy = (strategy: string) => {
    setForm((prev) => ({
      ...prev,
      customStrategies: (prev.customStrategies || []).filter((item) => item !== strategy)
    }));
  };

  const addEmotion = () => {
    const value = newEmotionVal.trim().toLowerCase();
    const label = newEmotionLbl.trim();
    if (!value || !label) return;
    if ((form.customEmotions || []).some((item: any) => item.value === value)) {
      showToast('Value emosi sudah terdaftar', 'error');
      return;
    }
    setForm((prev) => ({
      ...prev,
      customEmotions: [...(prev.customEmotions || []), { value, label }]
    }));
    setNewEmotionVal('');
    setNewEmotionLbl('');
  };

  const removeEmotion = (value: string) => {
    setForm((prev) => ({
      ...prev,
      customEmotions: (prev.customEmotions || []).filter((item: any) => item.value !== value)
    }));
  };

  const handleThemePreferenceChange = (pref: 'light' | 'dark' | 'system') => {
    setForm((prev) => ({ ...prev, themePreference: pref }));
    if (pref === 'system') {
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      localStorage.setItem('jurnal_saham_theme', isDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', pref);
      localStorage.setItem('jurnal_saham_theme', pref);
    }
  };

  const handleSaveSettings = async () => {
    const toNumberOrDefault = (value: any, fallback: number) => {
      if (value === '' || value == null) return fallback;
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? fallback : parsed;
    };

    const nextLogRetentionDays = form.logRetentionDays === '' ? 90 : (parseInt(form.logRetentionDays as any) >= 0 ? parseInt(form.logRetentionDays as any) : 90);

    updateSettings({
      initialCapital: toNumberOrDefault(form.initialCapital, 10000000),
      monthlyTarget: toNumberOrDefault(form.monthlyTarget, 5),
      defaultBuyFee: toNumberOrDefault(form.defaultBuyFee, 0.15),
      defaultSellFee: toNumberOrDefault(form.defaultSellFee, 0.25),
      initialCapitalUS: toNumberOrDefault(form.initialCapitalUS, 1000),
      defaultBuyFeeUS: toNumberOrDefault(form.defaultBuyFeeUS, 0),
      defaultSellFeeUS: toNumberOrDefault(form.defaultSellFeeUS, 0),
      selectedBrokerID: form.selectedBrokerID || 'Custom',
      selectedBrokerUS: form.selectedBrokerUS || 'Custom',
      customStrategies: form.customStrategies || [],
      customEmotions: form.customEmotions || [],
      usdToIdrRate: toNumberOrDefault(form.usdToIdrRate, 16200),
      defaultRiskPercent: toNumberOrDefault(form.defaultRiskPercent, 2),
      defaultTargetRR: toNumberOrDefault(form.defaultTargetRR, 2),
      themePreference: form.themePreference || 'system',
      logRetentionDays: nextLogRetentionDays,
      privacyMode: !!form.privacyMode,
      behaviorDailyTradeLimitEnabled: !!form.behaviorDailyTradeLimitEnabled,
      behaviorDailyTradeLimit: parseInt(form.behaviorDailyTradeLimit as any) >= 0 ? parseInt(form.behaviorDailyTradeLimit as any) : 3,
      behaviorNegativeEmotionWarning: !!form.behaviorNegativeEmotionWarning,
      behaviorBlockNegativeEmotion: !!form.behaviorBlockNegativeEmotion,
      behaviorRequireStrategy: !!form.behaviorRequireStrategy,
      behaviorRequireReason: !!form.behaviorRequireReason,
      behaviorMaxPositionSizeWarning: !!form.behaviorMaxPositionSizeWarning,
      behaviorMaxPositionSizePercent: parseFloat(form.behaviorMaxPositionSizePercent as any) >= 0 ? parseFloat(form.behaviorMaxPositionSizePercent as any) : 20,
      behaviorDoubleConfirmExit: !!form.behaviorDoubleConfirmExit,
    });

    if (nextLogRetentionDays > 0) {
      try {
        const deletedCount = await cleanOldAuditLogs(nextLogRetentionDays);
        if (deletedCount > 0) {
          showToast(`${deletedCount} audit log lama dibersihkan`);
        }
      } catch (error: any) {
        showToast(`Pengaturan tersimpan, tapi cleanup audit log gagal: ${error.message}`, 'error');
      }
    }
  };

  const handleSaveUsername = async () => {
    if (newUsername.trim().length < 3) {
      showToast('Nama tampilan minimal 3 karakter', 'error');
      return;
    }

    const result = await updateUsername(newUsername.trim());
    if (result?.success === false) {
      showToast(result.error, 'error');
      return;
    }

    await refreshProfile();
    await createAuditLogSafe({
      actorId: user?.id,
      action: 'profile.display_name_updated',
      targetType: 'profile',
      targetId: user?.id,
      metadata: { displayName: newUsername.trim() },
    });
    showToast('Profil diperbarui');
  };

  const handleExport = () => {
    const data = exportData(user?.id);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jurnal-saham-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    createAuditLogSafe({
      actorId: user?.id,
      action: 'data.exported',
      targetType: 'journal_data',
      targetId: user?.id,
      metadata: { storage: data.storage, version: data.version },
    });
    showToast('Data berhasil diexport');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result as string);
        await importData(data, user?.id);
        await createAuditLogSafe({
          actorId: user?.id,
          action: 'data.imported',
          targetType: 'journal_data',
          targetId: user?.id,
          metadata: { version: data.version || 'unknown' },
        });
        showToast('Data berhasil diimport! Refresh halaman untuk melihat perubahan.');
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        showToast('Format file tidak valid', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = async () => {
    const isConfirmed = await confirm('PERINGATAN: Semua data transaksi, watchlist, dan catatan akan dihapus permanen. Lanjutkan?', {
      title: 'Hapus Semua Data',
      severity: 'danger',
      confirmText: 'Hapus Permanen'
    });
    if (!isConfirmed) return;

    clearData(user?.id)
      .then(async () => {
        await createAuditLogSafe({
          actorId: user?.id,
          action: 'data.cleared',
          targetType: 'journal_data',
          targetId: user?.id,
        });
        showToast('Semua data telah dihapus');
        setTimeout(() => window.location.reload(), 1000);
      })
      .catch((error) => showToast(error.message, 'error'));
  };

  const handleSaveShare = async () => {
    if (!shareForm.granteeId) return;

    setShareSaving(true);
    try {
      const row = await upsertSharedAccess({
        ownerId: user.id,
        granteeId: shareForm.granteeId,
        accessLevel: shareForm.accessLevel,
        expiresAt: shareForm.expiresAt ? new Date(shareForm.expiresAt).toISOString() : null,
      });
      await createAuditLogSafe({
        actorId: user.id,
        action: 'shared_access.upserted',
        targetType: 'shared_access',
        targetId: row.id,
        metadata: {
          granteeId: row.grantee_id,
          accessLevel: row.access_level,
        },
      });
      setSharedAccessRows((prev) => {
        const existing = prev.find((item) => item.id === row.id || item.grantee_id === row.grantee_id);
        if (!existing) return [row, ...prev];
        return prev.map((item) => item.id === existing.id ? row : item);
      });
      setShareForm({ granteeId: '', accessLevel: 'review', expiresAt: '' });
      showToast('Akses jurnal berhasil diperbarui.');
    } catch (error) {
      showToast(`Gagal menyimpan akses: ${error.message}`, 'error');
    } finally {
      setShareSaving(false);
    }
  };

  const handleRevokeShare = async (row) => {
    const isConfirmed = await confirm('Apakah Anda yakin ingin mencabut akses user ini dari jurnal Anda?', {
      title: 'Cabut Akses Jurnal',
      severity: 'warning',
      confirmText: 'Cabut Akses'
    });
    if (!isConfirmed) return;

    try {
      await revokeSharedAccess(row.id);
      await createAuditLogSafe({
        actorId: user.id,
        action: 'shared_access.revoked',
        targetType: 'shared_access',
        targetId: row.id,
        metadata: {
          granteeId: row.grantee_id,
        },
      });
      setSharedAccessRows((prev) => prev.filter((item) => item.id !== row.id));
      showToast('Akses berhasil dicabut.');
    } catch (error) {
      showToast(`Gagal mencabut akses: ${error.message}`, 'error');
    }
  };

  const profileById = useMemo(() => {
    return allProfiles.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [allProfiles]);

  const activeTabMeta = SETTING_TABS.find((tab) => tab.id === activeTab);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengaturan</h1>
          <p className="page-subtitle">Kelola profil, preferensi, perilaku trading, dan data aplikasi</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{newUsername || user?.email || 'Pengguna'}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: 4 }}>
                {user?.email || 'Tidak ada email'} {roleError ? `• ${roleError}` : ''}
              </div>
            </div>
            <div className="badge badge-green" style={{ fontSize: '0.82rem' }}>
              {activeTabMeta ? <activeTabMeta.icon size={14} /> : null}
              <span>{activeTabMeta?.label || 'Pengaturan'}</span>
            </div>
          </div>

          <div className="settings-summary-grid">
            <div className="settings-summary-item">
              <div className="settings-summary-label">Role</div>
              <div className="settings-summary-value">{roleLabel || 'User'}</div>
            </div>
            <div className="settings-summary-item">
              <div className="settings-summary-label">Tema Aktif</div>
              <div className="settings-summary-value">{form.themePreference === 'dark' ? 'Dark' : form.themePreference === 'light' ? 'Light' : 'System'}</div>
            </div>
            <div className="settings-summary-item">
              <div className="settings-summary-label">Broker ID</div>
              <div className="settings-summary-value">{form.selectedBrokerID || 'Custom'}</div>
            </div>
            <div className="settings-summary-item">
              <div className="settings-summary-label">Broker US</div>
              <div className="settings-summary-value">{form.selectedBrokerUS || 'Custom'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-shell">
        <div className="settings-tabs">
          {SETTING_TABS.map((tab) => {
            const Icon = tab.icon;
            const disabled = tab.id === 'sharing' && !can('share:journal');
            return (
              <button
                key={tab.id}
                type="button"
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => !disabled && setActiveTab(tab.id)}
                disabled={disabled}
                style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="settings-panel">
          {activeTab === 'trading' ? (
            <>
              <SectionCard title="Pengaturan Trading Indonesia" description="Atur modal awal, target, dan preset broker untuk pasar IDR." actionLabel="Simpan Pengaturan Trading" onAction={handleSaveSettings}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Modal Awal (Rp)</label>
                    <CurrencyInput
                      value={String(form.initialCapital ?? '')}
                      onChange={value => set('initialCapital', value)}
                      placeholder="10.000.000"
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Saat ini: {formatRupiah(settings.initialCapital)}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Profit Bulanan (%)</label>
                    <input type="number" className="form-input" step="0.1" value={form.monthlyTarget} onChange={e => set('monthlyTarget', e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Preset Broker Indonesia (IDR)</label>
                  <select className="form-select" value={form.selectedBrokerID || 'Custom'} onChange={e => handleBrokerIDChange(e.target.value)}>
                    {BROKERS_ID.map((broker) => <option key={broker.name} value={broker.name}>{broker.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Default Fee Beli (%)</label>
                    <input type="number" className="form-input" step="0.01" value={form.defaultBuyFee} onChange={e => set('defaultBuyFee', e.target.value)} disabled={form.selectedBrokerID !== 'Custom'} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Fee Jual (%)</label>
                    <input type="number" className="form-input" step="0.01" value={form.defaultSellFee} onChange={e => set('defaultSellFee', e.target.value)} disabled={form.selectedBrokerID !== 'Custom'} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Pengaturan Trading Amerika" description="Atur modal dan broker default untuk transaksi USD." actionLabel="Simpan Pengaturan US" onAction={handleSaveSettings}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Preset Broker Amerika (USD)</label>
                  <select className="form-select" value={form.selectedBrokerUS || 'Custom'} onChange={e => handleBrokerUSChange(e.target.value)}>
                    {BROKERS_US.map((broker) => <option key={broker.name} value={broker.name}>{broker.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Modal Awal US ($)</label>
                    <CurrencyInput
                      value={String(form.initialCapitalUS ?? '')}
                      onChange={value => set('initialCapitalUS', value)}
                      placeholder="1.000"
                      allowDecimal={true}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Saat ini: {formatUSD(settings.initialCapitalUS)}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kurs Informasi Saat Ini</label>
                    <div className="settings-summary-item" style={{ height: '100%' }}>
                      <div className="settings-summary-label">USD ke IDR</div>
                      <div className="settings-summary-value">{formatRupiah(Number(form.usdToIdrRate ?? 16200))}</div>
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Default Fee Beli US (%)</label>
                    <input type="number" className="form-input" step="0.01" value={form.defaultBuyFeeUS} onChange={e => set('defaultBuyFeeUS', e.target.value)} disabled={form.selectedBrokerUS !== 'Custom'} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Fee Jual US (%)</label>
                    <input type="number" className="form-input" step="0.01" value={form.defaultSellFeeUS} onChange={e => set('defaultSellFeeUS', e.target.value)} disabled={form.selectedBrokerUS !== 'Custom'} />
                  </div>
                </div>
              </SectionCard>
            </>
          ) : null}

          {activeTab === 'preferences' ? (
            <>
              <SectionCard title="Preferensi Tampilan" description="Atur tema, privasi nominal, dan preferensi UI utama." actionLabel="Simpan Preferensi" onAction={handleSaveSettings}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tema Aplikasi</label>
                    <select className="form-select" value={form.themePreference || 'system'} onChange={e => handleThemePreferenceChange(e.target.value as any)}>
                      <option value="system">Ikuti Sistem</option>
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mode Privasi Nominal</label>
                    <div style={{ paddingTop: 10 }}>
                      <SelectionToggleCard
                        checked={!!form.privacyMode}
                        onToggle={() => set('privacyMode', !form.privacyMode)}
                        title="Sembunyikan nominal"
                        description="Nominal di area portofolio dan statistik akan diburamkan."
                        compact
                      />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Kurs Konversi USD ke IDR (Rp)</label>
                  <input type="number" className="form-input" value={form.usdToIdrRate} onChange={e => set('usdToIdrRate', e.target.value)} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Digunakan untuk mengonversi total aset portofolio gabungan dan tampilan IDR Eq.
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Default Risk Management" description="Tetapkan angka dasar yang akan dipakai berulang saat mengisi form trading." actionLabel="Simpan Default Risk" onAction={handleSaveSettings}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Default Toleransi Risiko per Trade (%)</label>
                    <input type="number" className="form-input" step="0.1" value={form.defaultRiskPercent} onChange={e => set('defaultRiskPercent', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Target Rasio Risk:Reward (1 : X)</label>
                    <input type="number" className="form-input" step="0.1" value={form.defaultTargetRR} onChange={e => set('defaultTargetRR', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Masa Simpan Audit Log (Hari)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="90"
                    value={form.logRetentionDays ?? 90}
                    onChange={e => {
                      const value = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                      set('logRetentionDays', value);
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Isi 0 untuk menyimpan selamanya. Minimal 1 hari jika ingin dibersihkan otomatis.
                  </div>
                </div>
              </SectionCard>
            </>
          ) : null}

          {activeTab === 'behavior' ? (
            <SectionCard title="Proteksi Perilaku Trading" description="Bantu jaga disiplin, batasi overtrading, dan paksa kepatuhan terhadap rule pribadi." actionLabel="Simpan Pengaturan Perilaku" onAction={handleSaveSettings}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ToggleRow
                  title="Maksimal Transaksi Harian"
                  description="Membatasi jumlah pencatatan transaksi baru per hari untuk mencegah over-trading."
                  checked={!!form.behaviorDailyTradeLimitEnabled}
                  onChange={(checked) => set('behaviorDailyTradeLimitEnabled', checked)}
                >
                  {form.behaviorDailyTradeLimitEnabled ? (
                    <div className="form-group" style={{ maxWidth: 220, marginTop: 8 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Maksimal Transaksi</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={form.behaviorDailyTradeLimit ?? 3}
                        onChange={e => set('behaviorDailyTradeLimit', Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                  ) : null}
                </ToggleRow>

                <ToggleRow
                  title="Peringatan Emosi Negatif"
                  description="Menampilkan pesan edukatif jika Anda memilih emosi negatif saat mencatat transaksi."
                  checked={!!form.behaviorNegativeEmotionWarning}
                  onChange={(checked) => set('behaviorNegativeEmotionWarning', checked)}
                />

                <ToggleRow
                  title="Blokir Transaksi Emosi Negatif"
                  description="Mencegah Anda menyimpan transaksi baru jika memilih emosi negatif."
                  checked={!!form.behaviorBlockNegativeEmotion}
                  onChange={(checked) => set('behaviorBlockNegativeEmotion', checked)}
                />

                <ToggleRow
                  title="Wajib Pilih Strategi"
                  description="Mencegah transaksi disimpan jika Anda tidak menentukan strategi trading."
                  checked={!!form.behaviorRequireStrategy}
                  onChange={(checked) => set('behaviorRequireStrategy', checked)}
                />

                <ToggleRow
                  title="Wajib Isi Alasan Entry"
                  description="Mencegah transaksi disimpan jika kolom alasan entry dibiarkan kosong."
                  checked={!!form.behaviorRequireReason}
                  onChange={(checked) => set('behaviorRequireReason', checked)}
                />

                <ToggleRow
                  title="Peringatan Ukuran Posisi Maksimal"
                  description="Memberikan warning jika nilai beli melebihi batas toleransi dari total modal awal."
                  checked={!!form.behaviorMaxPositionSizeWarning}
                  onChange={(checked) => set('behaviorMaxPositionSizeWarning', checked)}
                >
                  {form.behaviorMaxPositionSizeWarning ? (
                    <div className="form-group" style={{ maxWidth: 220, marginTop: 8 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Maksimal Ukuran Posisi (%)</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="100"
                        className="form-input"
                        value={form.behaviorMaxPositionSizePercent ?? 20}
                        onChange={e => set('behaviorMaxPositionSizePercent', Math.min(100, Math.max(1, parseFloat(e.target.value) || 1)))}
                      />
                    </div>
                  ) : null}
                </ToggleRow>

                <div style={{ paddingBottom: 8 }}>
                  <SelectionToggleCard
                    checked={!!form.behaviorDoubleConfirmExit}
                    onToggle={() => set('behaviorDoubleConfirmExit', !form.behaviorDoubleConfirmExit)}
                    title="Konfirmasi Batalkan Input"
                    description="Menanyakan konfirmasi sebelum menutup halaman jika form transaksi telah diisi."
                  />
                </div>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === 'strategies' ? (
            <>
              <SectionCard title="Strategi Trading Kustom" description="Tambahkan strategi yang sering Anda pakai agar mudah dipilih dari form transaksi." actionLabel="Simpan Strategi & Emosi" onAction={handleSaveSettings}>
                <div className="settings-inline-list" style={{ marginBottom: 12 }}>
                  {(form.customStrategies || []).map((strategy: string) => (
                    <span key={strategy} className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20 }}>
                      {strategy}
                      <button type="button" onClick={() => removeStrategy(strategy)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'inherit', padding: 0 }}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="settings-action-row">
                  <input className="form-input" placeholder="Tambah strategi baru... (cth: Breakaway)" value={newStrategy} onChange={e => setNewStrategy(e.target.value)} />
                  <button type="button" className="btn btn-secondary" onClick={addStrategy}>
                    <Plus size={14} />
                    <span>Tambah</span>
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Emosi / Psikologi Kustom" description="Buat daftar emosi versi Anda sendiri untuk evaluasi psikologi trading." actionLabel="Simpan Strategi & Emosi" onAction={handleSaveSettings}>
                <div className="settings-inline-list" style={{ marginBottom: 12 }}>
                  {(form.customEmotions || []).map((emotionItem: any) => (
                    <span key={emotionItem.value} className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20 }}>
                      {emotionItem.label} ({emotionItem.value})
                      <button type="button" onClick={() => removeEmotion(emotionItem.value)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'inherit', padding: 0 }}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="form-row">
                  <input className="form-input" placeholder="Label (cth: Dendam)" value={newEmotionLbl} onChange={e => setNewEmotionLbl(e.target.value)} />
                  <input className="form-input" placeholder="Value (cth: revenge)" value={newEmotionVal} onChange={e => setNewEmotionVal(e.target.value)} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="btn btn-secondary" onClick={addEmotion}>
                    <Plus size={14} />
                    <span>Tambah Emosi</span>
                  </button>
                </div>
              </SectionCard>
            </>
          ) : null}

          {activeTab === 'sharing' ? (
            can('share:journal') ? (
              <SectionCard title="Share Jurnal ke Mentor / Viewer" description="Atur siapa yang bisa melihat atau mereview jurnal Anda.">
                {!isSupabaseConfigured ? (
                  <div style={{ color: 'var(--accent-yellow)' }}>
                    Fitur sharing jurnal butuh Supabase aktif.
                  </div>
                ) : (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Pilih User</label>
                        <select
                          className="form-select"
                          value={shareForm.granteeId}
                          onChange={(event) => setShareForm((prev) => ({ ...prev, granteeId: event.target.value }))}
                        >
                          <option value="">Pilih mentor / viewer</option>
                          {allProfiles
                            .filter((item) => item.role === 'mentor' || item.role === 'viewer' || item.role === 'admin')
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.displayName} ({item.role})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Level Akses</label>
                        <select
                          className="form-select"
                          value={shareForm.accessLevel}
                          onChange={(event) => setShareForm((prev) => ({ ...prev, accessLevel: event.target.value }))}
                        >
                          {ACCESS_LEVELS.map((level) => (
                            <option key={level} value={level}>{ACCESS_LABELS[level] || level}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tanggal Berakhir Akses (opsional)</label>
                      <input
                        type="date"
                        className="form-input"
                        value={shareForm.expiresAt}
                        onChange={(event) => setShareForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveShare}
                      disabled={shareSaving || !shareForm.granteeId}
                    >
                      <ShieldCheck size={16} />
                      <span>{shareSaving ? 'Menyimpan...' : 'Simpan Akses'}</span>
                    </button>

                    <div style={{ marginTop: 24 }}>
                      <h4 style={{ marginBottom: 12 }}>Akses Aktif</h4>
                      {shareLoading ? (
                        <div style={{ color: 'var(--text-muted)' }}>Memuat akses sharing...</div>
                      ) : sharedAccessRows.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)' }}>Belum ada user yang diberi akses.</div>
                      ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                          {sharedAccessRows.map((row) => {
                            const itemProfile = profileById[row.grantee_id];
                            return (
                              <div
                                key={row.id}
                                style={{
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-lg)',
                                  padding: 14,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 700 }}>
                                    {itemProfile?.displayName || itemProfile?.email || row.grantee_id}
                                  </div>
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 4 }}>
                                    {itemProfile?.role || 'user'} • {ACCESS_LABELS[row.access_level] || row.access_level}
                                  </div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 6 }}>
                                    Dibuat {formatDateTime(row.created_at)}
                                    {row.expires_at ? ` • berakhir ${formatDateTime(row.expires_at)}` : ''}
                                  </div>
                                </div>
                                <div>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleRevokeShare(row)}>
                                    Cabut Akses
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </SectionCard>
            ) : (
              <SectionCard title="Sharing Tidak Tersedia" description="Role Anda belum memiliki akses untuk membagikan jurnal.">
                <div style={{ color: 'var(--text-secondary)' }}>
                  Minta akses ke admin jika Anda ingin membagikan jurnal ke mentor atau viewer.
                </div>
              </SectionCard>
            )
          ) : null}

          {activeTab === 'data' ? (
            <>
              <SectionCard title="Backup & Restore" description="Export data ke file JSON atau import backup yang sudah pernah dibuat.">
                <div className="settings-action-row">
                  <button className="btn btn-secondary" onClick={handleExport}>
                    <Database size={16} />
                    <span>Export Data (JSON)</span>
                  </button>
                  <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                    <Database size={16} />
                    <span>Import Data</span>
                    <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                  </label>
                </div>
              </SectionCard>

              <SectionCard title="Zona Bahaya" description="Hapus seluruh data jurnal, watchlist, dan catatan secara permanen.">
                <div style={{ marginBottom: 14, fontSize: '0.85rem', color: 'var(--accent-red)' }}>
                  Tindakan ini tidak bisa dibatalkan.
                </div>
                <button className="btn btn-danger" onClick={handleClearData}>
                  <Trash2 size={16} />
                  <span>Hapus Semua Data</span>
                </button>
              </SectionCard>
            </>
          ) : null}

          {activeTab === 'account' ? (
            <>
              <SectionCard title="Profil Akun" description="Perbarui nama tampilan yang digunakan di aplikasi.">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nama Tampilan</label>
                    <input className="form-input" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Minimal 3 karakter" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" value={user?.email || ''} disabled />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={handleSaveUsername}>
                    <Save size={16} />
                    <span>Simpan Profil</span>
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Aksi Akun" description="Keluar dari aplikasi pada perangkat ini.">
                <button className="btn btn-secondary" onClick={logout}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </SectionCard>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
