import { useState, useMemo } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { useWorkspace } from '@/modules/shared/context/WorkspaceContext';
import { useData } from '@/modules/shared/context/DataContext';
import { createAuditLogSafe } from '@/modules/admin/services/auditLogService';
import { calculatePortfolioBalance, calculateUnrealizedPnL } from '@/modules/trades/calculations';
import { formatRupiah } from '@/modules/shared/utils/formatters';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import SelectionToggleCard from '@/modules/shared/components/SelectionToggleCard';
import * as Icons from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUsername } = useAuth();
  const { profile, roleLabel, role, roleError, permissions, permissionDefinitions, refreshProfile } = usePermissions();
  const { availableWorkspaces, activeWorkspaceId } = useWorkspace();
  const {
    portfolios,
    activePortfolioId,
    defaultPortfolioId,
    showToast,
    allTrades,
    allCashflows,
    allDividends,
    marketPrices,
    settings,
    updateSettings,
    financeAccounts,
    getFinanceAccountCurrentBalance,
  } = useData();

  const [newUsername, setNewUsername] = useState(profile?.displayName || user?.username || '');

  const activePort = portfolios.find((p) => p.id === activePortfolioId)?.name || 'Utama';
  const activeWS = availableWorkspaces.find((w: any) => w.id === activeWorkspaceId)?.name || 'Workspace Pribadi';
  const blurStyle = usePrivacyStyle();
  const selectedFinanceAccountIds = settings.profileIncludedFinanceAccountIds || [];
  const selectableFinanceAccounts = financeAccounts.filter((account: any) => account.isActive !== false);

  const tradingAssetsIDR = useMemo(() => {
    let total = 0;

    portfolios.forEach((portfolio: any) => {
      const portfolioTrades = allTrades.filter((trade: any) => (trade.portfolioId || defaultPortfolioId) === portfolio.id);
      const portfolioCashflows = allCashflows.filter((cashflow: any) => (cashflow.portfolioId || defaultPortfolioId) === portfolio.id);
      const portfolioDividends = allDividends.filter((dividend: any) => (dividend.portfolioId || defaultPortfolioId) === portfolio.id);

      const initialCapID = portfolio.id === defaultPortfolioId ? (settings.initialCapital ?? 10000000) : 0;
      const initialCapUS = portfolio.id === defaultPortfolioId ? (settings.initialCapitalUS ?? 1000) : 0;

      const statsID = calculatePortfolioBalance(
        portfolioTrades.filter((trade: any) => trade.market !== 'US'),
        portfolioCashflows.filter((cashflow: any) => cashflow.market !== 'US'),
        portfolioDividends.filter((dividend: any) => dividend.market !== 'US'),
        initialCapID,
      );

      const statsUS = calculatePortfolioBalance(
        portfolioTrades.filter((trade: any) => trade.market === 'US'),
        portfolioCashflows.filter((cashflow: any) => cashflow.market === 'US'),
        portfolioDividends.filter((dividend: any) => dividend.market === 'US'),
        initialCapUS,
      );

      const openTrades = portfolioTrades.filter((trade: any) => !trade.sellPrice || !trade.dateSell);
      let openValueID = 0;
      let openValueUS = 0;

      openTrades.forEach((trade: any) => {
        const isUS = trade.market === 'US';
        const shares = isUS ? trade.lots : trade.lots * 100;
        const currentPrice = (marketPrices && marketPrices[trade.stockCode]) || trade.sellPrice || 0;

        let positionValue = trade.buyPrice * shares;
        if (currentPrice > 0) {
          const unrealized = calculateUnrealizedPnL(trade.buyPrice, currentPrice, trade.lots, trade.buyFee, trade.market || 'ID', trade.assetType || 'stock');
          positionValue = (trade.buyPrice * shares) + unrealized.pnl;
        }

        if (isUS) {
          openValueUS += positionValue;
        } else {
          openValueID += positionValue;
        }
      });

      const portfolioTotalID = statsID.buyingPower + openValueID;
      const portfolioTotalUS = statsUS.buyingPower + openValueUS;

      total += portfolioTotalID + (portfolioTotalUS * (settings.usdToIdrRate ?? 16200));
    });

    return total;
  }, [portfolios, defaultPortfolioId, allTrades, allCashflows, allDividends, settings, marketPrices]);

  const selectedFinanceBalance = useMemo(() => {
    return selectedFinanceAccountIds.reduce((total: number, accountId: string) => {
      return total + getFinanceAccountCurrentBalance(accountId);
    }, 0);
  }, [selectedFinanceAccountIds, getFinanceAccountCurrentBalance]);

  const totalAssetsIDR = tradingAssetsIDR + selectedFinanceBalance;

  const handleToggleFinanceInProfile = (accountId: string) => {
    const nextIds = selectedFinanceAccountIds.includes(accountId)
      ? selectedFinanceAccountIds.filter((id: string) => id !== accountId)
      : [...selectedFinanceAccountIds, accountId];

    updateSettings({
      profileIncludedFinanceAccountIds: nextIds,
    });
  };

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
          <h1 className="page-title">Profil Saya</h1>
          <p className="page-subtitle">Kelola informasi akun, total aset profile, dan hak akses Anda</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
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
                Total Aset Profile
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 8, ...blurStyle }}>
                {formatRupiah(totalAssetsIDR)}
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: 6, lineHeight: 1.3 }}>
                Aset trading semua dompet ditambah saldo rekening finance yang Anda pilih. Konversi USD menggunakan kurs Rp {settings.usdToIdrRate ?? '16.200'}.
              </div>
              <div style={{ fontSize: '0.72rem', opacity: 0.88, marginTop: 10, lineHeight: 1.4 }}>
                Trading: <strong>{formatRupiah(tradingAssetsIDR)}</strong>
              </div>
              <div style={{ fontSize: '0.72rem', opacity: 0.88, marginTop: 4, lineHeight: 1.4 }}>
                Bank terpilih: <strong>{formatRupiah(selectedFinanceBalance)}</strong>
              </div>
            </div>

            {selectableFinanceAccounts.length > 0 ? (
              <div
                style={{
                  marginTop: 16,
                  padding: '16px 20px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 10 }}>
                  Pilih Rekening untuk Total Aset
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Centang rekening yang mau ikut dihitung ke total aset profile.
                  </div>
                  <div className="badge badge-blue">
                    {selectedFinanceAccountIds.length} dipilih
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
                  {selectableFinanceAccounts.map((account: any) => {
                    const isSelected = selectedFinanceAccountIds.includes(account.id);
                    return (
                      <SelectionToggleCard
                        key={account.id}
                        checked={isSelected}
                        onToggle={() => handleToggleFinanceInProfile(account.id)}
                        title={account.name}
                        description={account.institutionName}
                        rightContent={(
                          <>
                            <span
                              className={isSelected ? 'badge badge-green' : 'badge'}
                              style={isSelected ? undefined : { background: 'var(--bg-input)', color: 'var(--text-muted)' }}
                            >
                              {isSelected ? 'Terpilih' : 'Opsional'}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', ...blurStyle }}>
                              {formatRupiah(getFinanceAccountCurrentBalance(account.id))}
                            </span>
                          </>
                        )}
                      />
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10 }}>
                  Kalau rekening tidak dipilih, saldo finance-nya tidak ikut masuk ke total aset profile.
                </div>
              </div>
            ) : null}
          </div>
        </div>

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
                  const definition = (permissionDefinitions as any)[permKey];
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
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{definition?.label || permKey}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {definition?.description || '-'}
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
