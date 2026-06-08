import { useState, useMemo } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { useWorkspace } from '@/modules/shared/context/WorkspaceContext';
import { useData } from '@/modules/shared/context/DataContext';
import { createAuditLogSafe } from '@/modules/admin/services/auditLogService';
import { calculatePortfolioBalance, calculateUnrealizedPnL } from '@/modules/trades/calculations';
import { formatRupiah } from '@/modules/shared/utils/formatters';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import * as Icons from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUsername } = useAuth();
  const { profile, roleLabel, role, roleError, permissions, permissionDefinitions, refreshProfile } = usePermissions();
  const { availableWorkspaces, activeWorkspaceId } = useWorkspace();
  const { portfolios, activePortfolioId, showToast, allTrades, allCashflows, allDividends, marketPrices, settings } = useData();

  const [newUsername, setNewUsername] = useState(profile?.displayName || user?.username || '');

  const activePort = portfolios.find(p => p.id === activePortfolioId)?.name || 'Utama';
  const activeWS = availableWorkspaces.find((w: any) => w.id === activeWorkspaceId)?.name || 'Workspace Pribadi';

  const blurStyle = usePrivacyStyle();

  // Calculate Total Assets across all portfolios
  const totalAssetsIDR = useMemo(() => {
    let total = 0;

    portfolios.forEach((p: any) => {
      const pTrades = allTrades.filter((t: any) => (t.portfolioId || 'default') === p.id);
      const pCashflows = allCashflows.filter((c: any) => (c.portfolioId || 'default') === p.id);
      const pDividends = allDividends.filter((d: any) => (d.portfolioId || 'default') === p.id);

      const initialCapID = p.id === 'default' ? settings.initialCapital : 0;
      const initialCapUS = p.id === 'default' ? (settings.initialCapitalUS || 1000) : 0;

      // 1. Calculate Buying Power
      const statsID = calculatePortfolioBalance(
        pTrades.filter((t: any) => t.market !== 'US'),
        pCashflows.filter((c: any) => c.market !== 'US'),
        pDividends.filter((d: any) => d.market !== 'US'),
        initialCapID
      );

      const statsUS = calculatePortfolioBalance(
        pTrades.filter((t: any) => t.market === 'US'),
        pCashflows.filter((c: any) => c.market === 'US'),
        pDividends.filter((d: any) => d.market === 'US'),
        initialCapUS
      );

      // 2. Calculate open stock position values
      const openTrades = pTrades.filter((t: any) => !t.sellPrice || !t.dateSell);
      let openValueID = 0;
      let openValueUS = 0;

      openTrades.forEach((t: any) => {
        const isUS = t.market === 'US';
        const shares = isUS ? t.lots : t.lots * 100;
        const currentPrice = (marketPrices && marketPrices[t.stockCode]) || t.sellPrice || 0;

        let positionVal = t.buyPrice * shares;
        if (currentPrice > 0) {
          const unrealized = calculateUnrealizedPnL(t.buyPrice, currentPrice, t.lots, t.buyFee, t.market || 'ID');
          positionVal = (t.buyPrice * shares) + unrealized.pnl;
        }

        if (isUS) {
          openValueUS += positionVal;
        } else {
          openValueID += positionVal;
        }
      });

      const portfolioTotalID = statsID.buyingPower + openValueID;
      const portfolioTotalUS = statsUS.buyingPower + openValueUS;

      total += portfolioTotalID + (portfolioTotalUS * (settings.usdToIdrRate || 16200));
    });

    return total;
  }, [portfolios, allTrades, allCashflows, allDividends, settings, marketPrices]);

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim();
    if (trimmed.length < 3) {
      showToast('Nama tampilan minimal 3 karakter', 'error');
      return;
    }

    try {
      const result = await updateUsername(trimmed);
      if (result?.success === false) {
        showToast(result.error, 'error');
      } else {
        await refreshProfile();
        await createAuditLogSafe({
          actorId: user?.id,
          action: 'profile.display_name_updated',
          targetType: 'profile',
          targetId: user?.id,
          metadata: { displayName: trimmed },
        });
        showToast('Profil diperbarui');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui profil', 'error');
    }
  };

  const displayName = profile?.displayName || user?.username || 'User';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 Profil Saya</h1>
          <p className="page-subtitle">Kelola informasi akun dan hak akses Anda</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left Card: Account Info summary */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Informasi Akun</h3>
          </div>
          <div className="card-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                background: 'var(--gradient-primary)',
                color: '#ffffff',
                fontSize: '2.5rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)'
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px 0' }}>{displayName}</h2>
            <div style={{ display: 'inline-block', marginBottom: 20 }}>
              <span className={`role-badge role-badge-${role}`} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                {roleLabel}
              </span>
            </div>

            {roleError && (
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-yellow)', marginBottom: 20 }}>
                Role fallback aktif: {roleError}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Icons.Mail size={16} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.email || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Icons.Building size={16} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Workspace Aktif</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{activeWS}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icons.Wallet size={16} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Portofolio Aktif</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{activePort}</div>
                </div>
              </div>
            </div>

            {/* Total Assets Card */}
            <div 
              style={{ 
                marginTop: 24, 
                padding: '16px 20px', 
                background: 'var(--gradient-primary)', 
                borderRadius: 'var(--radius-lg)', 
                color: '#ffffff', 
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                💰 Total Aset (Semua Dompet)
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 8, ...blurStyle }}>
                {formatRupiah(totalAssetsIDR)}
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: 6, lineHeight: 1.3 }}>
                Akumulasi seluruh saldo & nilai saham terbuka. Konversi USD menggunakan kurs Rp {settings.usdToIdrRate || '16.200'}.
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Edit profile & Capability list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Edit Profil</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Nama Tampilan</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    className="form-input"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="Nama Anda..."
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveUsername}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Icons.Save size={16} />
                    Simpan
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  Ganti nama tampilan yang akan dilihat oleh mentor atau admin ketika berkolaborasi.
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Hak Akses & Kapabilitas</h3>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                Berikut adalah fitur-fitur yang bisa Anda gunakan dengan role <strong>{roleLabel}</strong> saat ini:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {permissions.map((permKey: string) => {
                  const def = (permissionDefinitions as any)[permKey];
                  return (
                    <div
                      key={permKey}
                      style={{
                        padding: 12,
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start'
                      }}
                    >
                      <Icons.CheckCircle2 size={16} style={{ color: 'var(--accent-green)', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{def?.label || permKey}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {def?.description || '-'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
