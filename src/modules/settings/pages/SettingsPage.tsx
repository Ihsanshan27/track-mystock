import { useEffect, useState } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { useAuth } from '@/modules/auth/AuthContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { createAuditLogSafe } from '@/modules/admin/services/auditLogService';
import { listProfiles } from '@/modules/shared/services/profileService';
import { ACCESS_LEVELS, listOwnedSharedAccess, revokeSharedAccess, upsertSharedAccess } from '@/modules/shared/services/sharedAccessService';
import { isSupabaseConfigured } from '@/modules/shared/services/supabaseClient';
import { formatDateTime, formatRupiah } from '@/modules/shared/utils/formatters';
import CurrencyInput from '@/modules/shared/components/CurrencyInput';
import { Trash2, Plus, X } from 'lucide-react';

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

export default function SettingsPage() {
  const { settings, updateSettings, showToast, exportData, importData, clearData } = useData();
  const { user, updateUsername, logout } = useAuth();
  const { roleLabel, roleError, refreshProfile, can } = usePermissions();
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

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleBrokerIDChange = (brokerName: string) => {
    const broker = BROKERS_ID.find(b => b.name === brokerName);
    if (broker) {
      setForm(prev => ({
        ...prev,
        selectedBrokerID: brokerName,
        ...(brokerName !== 'Custom' ? { defaultBuyFee: broker.buyFee, defaultSellFee: broker.sellFee } : {})
      }));
    }
  };

  const handleBrokerUSChange = (brokerName: string) => {
    const broker = BROKERS_US.find(b => b.name === brokerName);
    if (broker) {
      setForm(prev => ({
        ...prev,
        selectedBrokerUS: brokerName,
        ...(brokerName !== 'Custom' ? { defaultBuyFeeUS: broker.buyFee, defaultSellFeeUS: broker.sellFee } : {})
      }));
    }
  };

  const addStrategy = () => {
    const val = newStrategy.trim();
    if (!val) return;
    if ((form.customStrategies || []).includes(val)) {
      showToast('Strategi sudah terdaftar', 'error');
      return;
    }
    setForm(prev => ({
      ...prev,
      customStrategies: [...(prev.customStrategies || []), val]
    }));
    setNewStrategy('');
  };

  const removeStrategy = (strat: string) => {
    setForm(prev => ({
      ...prev,
      customStrategies: (prev.customStrategies || []).filter(s => s !== strat)
    }));
  };

  const addEmotion = () => {
    const val = newEmotionVal.trim().toLowerCase();
    const lbl = newEmotionLbl.trim();
    if (!val || !lbl) return;
    if ((form.customEmotions || []).some((e: any) => e.value === val)) {
      showToast('Value emosi sudah terdaftar', 'error');
      return;
    }
    setForm(prev => ({
      ...prev,
      customEmotions: [...(prev.customEmotions || []), { value: val, label: lbl }]
    }));
    setNewEmotionVal('');
    setNewEmotionLbl('');
  };

  const removeEmotion = (val: string) => {
    setForm(prev => ({
      ...prev,
      customEmotions: (prev.customEmotions || []).filter((e: any) => e.value !== val)
    }));
  };

  const handleThemePreferenceChange = (pref: 'light' | 'dark' | 'system') => {
    setForm(prev => ({ ...prev, themePreference: pref }));
    if (pref === 'system') {
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      localStorage.setItem('jurnal_saham_theme', isDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', pref);
      localStorage.setItem('jurnal_saham_theme', pref);
    }
  };

  const handleSaveSettings = () => {
    updateSettings({
      initialCapital: parseFloat(form.initialCapital) || 10000000,
      monthlyTarget: parseFloat(form.monthlyTarget) || 5,
      defaultBuyFee: parseFloat(form.defaultBuyFee) || 0.15,
      defaultSellFee: parseFloat(form.defaultSellFee) || 0.25,
      initialCapitalUS: parseFloat(form.initialCapitalUS) || 1000,
      defaultBuyFeeUS: parseFloat(form.defaultBuyFeeUS) || 0,
      defaultSellFeeUS: parseFloat(form.defaultSellFeeUS) || 0,
      selectedBrokerID: form.selectedBrokerID || 'Custom',
      selectedBrokerUS: form.selectedBrokerUS || 'Custom',
      customStrategies: form.customStrategies || [],
      customEmotions: form.customEmotions || [],
      usdToIdrRate: parseFloat(form.usdToIdrRate) || 16200,
      defaultRiskPercent: parseFloat(form.defaultRiskPercent) || 2,
      defaultTargetRR: parseFloat(form.defaultTargetRR) || 2,
      themePreference: form.themePreference || 'system',
      logRetentionDays: form.logRetentionDays === '' ? 90 : (parseInt(form.logRetentionDays as any) >= 0 ? parseInt(form.logRetentionDays as any) : 90),
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
  };

  const handleSaveUsername = async () => {
    if (newUsername.trim().length >= 3) {
      const result = await updateUsername(newUsername.trim());
      if (result?.success === false) {
        showToast(result.error, 'error');
      } else {
        await refreshProfile();
        await createAuditLogSafe({
          actorId: user?.id,
          action: 'profile.display_name_updated',
          targetType: 'profile',
          targetId: user?.id,
          metadata: { displayName: newUsername.trim() },
        });
        showToast('Profil diperbarui');
      }
    }
  };

  const handleExport = () => {
    const data = exportData(user?.id);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jurnal-saham-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
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

  const handleClearData = () => {
    if (window.confirm('PERINGATAN: Semua data transaksi, watchlist, dan catatan akan dihapus permanen. Lanjutkan?')) {
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
    }
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
    if (!window.confirm('Cabut akses user ini dari jurnal Anda?')) return;

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

  const profileById = allProfiles.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Pengaturan</h1>
          <p className="page-subtitle">Kelola profil, preferensi, dan data Anda</p>
        </div>
      </div>

      <div style={{ maxWidth: 700 }}>
        {/* Trading Settings */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">📈 Pengaturan Trading</h3></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Modal Awal (Rp)</label>
                <CurrencyInput
                  value={String(form.initialCapital ?? '')}
                  onChange={v => set('initialCapital', v)}
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
                {BROKERS_ID.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
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

            <h4 style={{ margin: '20px 0 10px', fontSize: '1.1rem' }}>🌎 Pasar US (Gotrade)</h4>
            
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Preset Broker Amerika (USD)</label>
              <select className="form-select" value={form.selectedBrokerUS || 'Custom'} onChange={e => handleBrokerUSChange(e.target.value)}>
                {BROKERS_US.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Modal Awal US ($)</label>
                <CurrencyInput
                  value={String(form.initialCapitalUS ?? '')}
                  onChange={v => set('initialCapitalUS', v)}
                  placeholder="1.000"
                  allowDecimal={true}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Saat ini: ${settings.initialCapitalUS || 1000}
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
            <button className="btn btn-primary" onClick={handleSaveSettings}>💾 Simpan Pengaturan</button>
          </div>
        </div>

        {/* Custom Prefs */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">⚙️ Preferensi Kustom & UI</h3></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Kurs Konversi USD ke IDR (Rp)</label>
                <input type="number" className="form-input" value={form.usdToIdrRate} onChange={e => set('usdToIdrRate', e.target.value)} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Digunakan untuk mengonversi total aset portofolio gabungan.
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tema Aplikasi</label>
                <select className="form-select" value={form.themePreference || 'system'} onChange={e => handleThemePreferenceChange(e.target.value as any)}>
                  <option value="system">Ikuti Sistem (Otomatis)</option>
                  <option value="light">Light Mode (Terang)</option>
                  <option value="dark">Dark Mode (Gelap)</option>
                </select>
              </div>
            </div>
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
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Masa Simpan Audit Log (Hari)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="90"
                  value={form.logRetentionDays ?? 90}
                  onChange={e => {
                    const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                    set('logRetentionDays', val);
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Isi 0 untuk menyimpan selamanya. Minimal 1 hari jika ingin dibersihkan otomatis.
                </div>
              </div>
              <div className="form-group"></div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveSettings}>💾 Simpan Preferensi</button>
          </div>
        </div>

        {/* User Behavior Guard */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              🧠 Proteksi Perilaku & Psikologi Pengguna (User Behavior Guard)
            </h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Fitur-fitur ini membantu Anda mendisiplinkan diri, membatasi impulse trading, menjaga psikologi emosi, dan mematuhi rencana risk management.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Daily Limit */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Maksimal Transaksi Harian</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Membatasi jumlah pencatatan transaksi baru per hari untuk mencegah over-trading.</div>
                  </div>
                  <label className="switch-container" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!form.behaviorDailyTradeLimitEnabled}
                      onChange={e => set('behaviorDailyTradeLimitEnabled', e.target.checked)}
                      style={{ width: 18, height: 18, marginRight: 8, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Aktifkan</span>
                  </label>
                </div>
                {form.behaviorDailyTradeLimitEnabled && (
                  <div className="form-group" style={{ maxWidth: 200, marginTop: 8 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Maksimal Transaksi</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={form.behaviorDailyTradeLimit ?? 3}
                      onChange={e => set('behaviorDailyTradeLimit', Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                )}
              </div>

              {/* Emotion Guard */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Peringatan Emosi Negatif (Negative Emotion Tip)</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Menampilkan pesan edukatif jika Anda memilih emosi negatif saat mencatat transaksi.</div>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!form.behaviorNegativeEmotionWarning}
                      onChange={e => set('behaviorNegativeEmotionWarning', e.target.checked)}
                      style={{ width: 18, height: 18, marginRight: 8, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Aktifkan</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Blokir Transaksi Emosi Negatif</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Mencegah Anda menyimpan transaksi baru jika memilih emosi negatif (mencegah impulsiveness).</div>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!form.behaviorBlockNegativeEmotion}
                      onChange={e => set('behaviorBlockNegativeEmotion', e.target.checked)}
                      style={{ width: 18, height: 18, marginRight: 8, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Aktifkan</span>
                  </label>
                </div>
              </div>

              {/* Strategy and Reason */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Kepatuhan Rencana Trading (Wajib Strategi)</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Mencegah transaksi disimpan jika Anda tidak menentukan strategi trading.</div>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!form.behaviorRequireStrategy}
                      onChange={e => set('behaviorRequireStrategy', e.target.checked)}
                      style={{ width: 18, height: 18, marginRight: 8, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Aktifkan</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Wajib Isi Alasan Entry</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Mencegah transaksi disimpan jika kolom Alasan Entry dibiarkan kosong.</div>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!form.behaviorRequireReason}
                      onChange={e => set('behaviorRequireReason', e.target.checked)}
                      style={{ width: 18, height: 18, marginRight: 8, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Aktifkan</span>
                  </label>
                </div>
              </div>

              {/* Position Sizing */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Peringatan Ukuran Posisi Maksimal</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Memberikan warning jika nilai beli transaksi melebihi batas toleransi dari total modal awal.</div>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!form.behaviorMaxPositionSizeWarning}
                      onChange={e => set('behaviorMaxPositionSizeWarning', e.target.checked)}
                      style={{ width: 18, height: 18, marginRight: 8, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Aktifkan</span>
                  </label>
                </div>
                {form.behaviorMaxPositionSizeWarning && (
                  <div className="form-group" style={{ maxWidth: 200, marginTop: 8 }}>
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
                )}
              </div>

              {/* Double Confirm Exit */}
              <div style={{ paddingBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>Konfirmasi Batalkan Input</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Menanyakan konfirmasi sebelum menutup halaman jika form transaksi telah diisi.</div>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!form.behaviorDoubleConfirmExit}
                      onChange={e => set('behaviorDoubleConfirmExit', e.target.checked)}
                      style={{ width: 18, height: 18, marginRight: 8, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Aktifkan</span>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <button className="btn btn-primary" onClick={handleSaveSettings}>💾 Simpan Pengaturan Perilaku</button>
            </div>
          </div>
        </div>

        {/* Custom Strategies & Emotions Manager */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">🏷️ Strategi & Emosi Kustom</h3></div>
          <div className="card-body">
            <h4 style={{ fontSize: '1rem', marginBottom: 12 }}>Daftar Strategi Trading</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {(form.customStrategies || []).map((strat: string) => (
                <span key={strat} className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20 }}>
                  {strat}
                  <button type="button" onClick={() => removeStrategy(strat)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'inherit', padding: 0 }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <input className="form-input" placeholder="Tambah strategi baru... (cth: Breakaway)" value={newStrategy} onChange={e => setNewStrategy(e.target.value)} />
              <button type="button" className="btn btn-secondary" onClick={addStrategy} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={14} />
                Tambah
              </button>
            </div>

            <h4 style={{ fontSize: '1rem', marginBottom: 12 }}>Daftar Emosi / Psikologi</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {(form.customEmotions || []).map((em: any) => (
                <span key={em.value} className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20 }}>
                  {em.label} ({em.value})
                  <button type="button" onClick={() => removeEmotion(em.value)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'inherit', padding: 0 }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" style={{ flex: 1 }} placeholder="Label (cth: Dendam)" value={newEmotionLbl} onChange={e => setNewEmotionLbl(e.target.value)} />
              <input className="form-input" style={{ flex: 1 }} placeholder="Value (cth: revenge)" value={newEmotionVal} onChange={e => setNewEmotionVal(e.target.value)} />
              <button type="button" className="btn btn-secondary" onClick={addEmotion} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={14} />
                Tambah
              </button>
            </div>
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={handleSaveSettings}>💾 Simpan Strategi & Emosi</button>
            </div>
          </div>
        </div>

        {can('share:journal') ? (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><h3 className="card-title">🤝 Share Jurnal ke Mentor / Viewer</h3></div>
            <div className="card-body">
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
                    {shareSaving ? 'Menyimpan...' : 'Simpan Akses'}
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
                                  {itemProfile?.role || 'user'} · {ACCESS_LABELS[row.access_level] || row.access_level}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 6 }}>
                                  Dibuat {formatDateTime(row.created_at)}
                                  {row.expires_at ? ` · berakhir ${formatDateTime(row.expires_at)}` : ''}
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
            </div>
          </div>
        ) : null}

        {/* Data Management */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">💾 Manajemen Data</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <button className="btn btn-secondary" onClick={handleExport}>
                📤 Export Data (JSON)
              </button>
              <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                📥 Import Data
                <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              </label>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
              <div style={{ marginBottom: 8, fontSize: '0.85rem', color: 'var(--accent-red)' }}>
                ⚠️ Zona Bahaya
              </div>
              <button className="btn btn-danger" onClick={handleClearData}>
                🗑 Hapus Semua Data
              </button>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">🚪 Akun</h3></div>
          <div className="card-body">
            <button className="btn btn-secondary" onClick={logout}>
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
