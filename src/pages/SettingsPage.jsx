import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { exportAllData, importAllData, clearAllData } from '../utils/storage';
import { formatRupiah } from '../utils/formatters';

export default function SettingsPage() {
  const { settings, updateSettings, showToast } = useData();
  const { user, updateUsername, logout } = useAuth();
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [form, setForm] = useState({ ...settings });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSaveSettings = () => {
    updateSettings({
      initialCapital: parseFloat(form.initialCapital) || 10000000,
      monthlyTarget: parseFloat(form.monthlyTarget) || 5,
      defaultBuyFee: parseFloat(form.defaultBuyFee) || 0.15,
      defaultSellFee: parseFloat(form.defaultSellFee) || 0.25,
      initialCapitalUS: parseFloat(form.initialCapitalUS) || 1000,
      defaultBuyFeeUS: parseFloat(form.defaultBuyFeeUS) || 0,
      defaultSellFeeUS: parseFloat(form.defaultSellFeeUS) || 0,
    });
  };

  const handleSaveUsername = () => {
    if (newUsername.trim().length >= 3) {
      updateUsername(newUsername.trim());
      showToast('Username diperbarui');
    }
  };

  const handleExport = () => {
    const data = exportAllData(user?.id);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jurnal-saham-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data berhasil diexport');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        importAllData(data, user?.id);
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
      clearAllData(user?.id);
      showToast('Semua data telah dihapus');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Pengaturan</h1>
          <p className="page-subtitle">Kelola profil, preferensi, dan data Anda</p>
        </div>
      </div>

      <div style={{ maxWidth: 700 }}>
        {/* Profile */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">👤 Profil</h3></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <input className="form-input" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
                <button className="btn btn-secondary" onClick={handleSaveUsername}>Simpan</button>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Settings */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">📈 Pengaturan Trading</h3></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Modal Awal (Rp)</label>
                <input type="number" className="form-input" value={form.initialCapital} onChange={e => set('initialCapital', e.target.value)} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Saat ini: {formatRupiah(settings.initialCapital)}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Target Profit Bulanan (%)</label>
                <input type="number" className="form-input" step="0.1" value={form.monthlyTarget} onChange={e => set('monthlyTarget', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Default Fee Beli (%)</label>
                <input type="number" className="form-input" step="0.01" value={form.defaultBuyFee} onChange={e => set('defaultBuyFee', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Default Fee Jual (%)</label>
                <input type="number" className="form-input" step="0.01" value={form.defaultSellFee} onChange={e => set('defaultSellFee', e.target.value)} />
              </div>
            </div>

            <h4 style={{ margin: '20px 0 10px', fontSize: '1.1rem' }}>🌎 Pasar US (Gotrade)</h4>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Modal Awal US ($)</label>
                <input type="number" className="form-input" value={form.initialCapitalUS} onChange={e => set('initialCapitalUS', e.target.value)} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Saat ini: ${settings.initialCapitalUS || 1000}
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Default Fee Beli US (%)</label>
                <input type="number" className="form-input" step="0.01" value={form.defaultBuyFeeUS} onChange={e => set('defaultBuyFeeUS', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Default Fee Jual US (%)</label>
                <input type="number" className="form-input" step="0.01" value={form.defaultSellFeeUS} onChange={e => set('defaultSellFeeUS', e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveSettings}>💾 Simpan Pengaturan</button>
          </div>
        </div>

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
