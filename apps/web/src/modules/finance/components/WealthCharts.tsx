import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { formatRupiah, formatCompactNumber } from '@/modules/shared/utils/formatters';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#06B6D4', '#EC4899', '#84CC16'];

interface WealthChartsProps {
  walletEquityData: { name: string; value: number }[];
  cashVsInvestData: { name: string; value: number }[];
  currencyData: { name: string; IDR: number; USD: number }[];
}

export default function WealthCharts({ walletEquityData, cashVsInvestData, currencyData }: WealthChartsProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: 8,
          fontSize: '0.8rem'
        }}>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ color: entry.color || entry.fill }}>
              {entry.name}: {formatRupiah(entry.value)}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const yAxisTickFormatter = (value: number) => {
    if (value === 0) return 'Rp 0';
    return `Rp ${formatCompactNumber(value)}`;
  };

  return (
    <div className="grid-3" style={{ marginBottom: 24, gap: 16 }}>
      {/* Chart 1: Sebaran Ekuitas Dompet */}
      <div className="card finance-insights-card">
        <div className="card-header">
          <h3 className="card-title">Sebaran Ekuitas Dompet</h3>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: 320 }}>
          {walletEquityData.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>Belum ada data ekuitas.</div>
          ) : (
            <>
              <div style={{ flex: 1, position: 'relative', minHeight: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={walletEquityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      innerRadius="50%"
                      paddingAngle={3}
                    >
                      {walletEquityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend-container" style={{ maxHeight: 80, overflowY: 'auto', marginTop: 12 }}>
                {walletEquityData.map((item, index) => {
                  const total = walletEquityData.reduce((acc, curr) => acc + curr.value, 0);
                  const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                  return (
                    <div key={item.name} className="chart-legend-item">
                      <div className="chart-legend-color" style={{ background: COLORS[index % COLORS.length] }} />
                      <span style={{ fontSize: '0.75rem' }} title={item.name}>{item.name} ({percentage}%)</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chart 2: Kas vs Investasi Saham */}
      <div className="card finance-insights-card">
        <div className="card-header">
          <h3 className="card-title">Kas vs Investasi</h3>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: 320 }}>
          {cashVsInvestData.every(d => d.value === 0) ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>Belum ada data kas/investasi.</div>
          ) : (
            <>
              <div style={{ flex: 1, position: 'relative', minHeight: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cashVsInvestData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      innerRadius="50%"
                      paddingAngle={3}
                    >
                      {cashVsInvestData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#3B82F6'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend-container" style={{ marginTop: 12 }}>
                {cashVsInvestData.map((item, index) => {
                  const total = cashVsInvestData.reduce((acc, curr) => acc + curr.value, 0);
                  const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                  return (
                    <div key={item.name} className="chart-legend-item">
                      <div className="chart-legend-color" style={{ background: index === 0 ? '#10B981' : '#3B82F6' }} />
                      <span style={{ fontSize: '0.75rem' }}>{item.name} ({percentage}%)</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chart 3: Distribusi Mata Uang */}
      <div className="card finance-insights-card">
        <div className="card-header">
          <h3 className="card-title">Distribusi Mata Uang</h3>
        </div>
        <div className="card-body" style={{ height: 320, padding: '16px 16px 16px 0' }}>
          {currencyData.every(d => d.IDR === 0 && d.USD === 0) ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Belum ada distribusi mata uang.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currencyData} margin={{ left: 30, right: 10, top: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="var(--text-muted)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={yAxisTickFormatter}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="IDR" fill="#10B981" radius={[4, 4, 0, 0]} name="IDR (Rupiah)" />
                <Bar dataKey="USD" fill="#3B82F6" radius={[4, 4, 0, 0]} name="USD (Dollar setara IDR)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
