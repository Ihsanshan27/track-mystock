import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReportView from '../components/reports/ReportView';
import StateMessage from '../components/StateMessage';
import { loadPublicReportShare } from '../services/reportShareService';

export default function SharedReportPage() {
  const { shareId } = useParams();
  const [shareRow, setShareRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadShare() {
      setLoading(true);
      setError('');

      try {
        const data = await loadPublicReportShare(shareId);
        if (!cancelled) setShareRow(data);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadShare();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  if (loading) {
    return <div className="loading-spinner" style={{ marginTop: '40vh' }} />;
  }

  if (error) {
    return (
      <div style={{ maxWidth: 720, margin: '80px auto', padding: '0 16px' }}>
        <StateMessage
          tone="warning"
          title="Report tidak bisa dibuka"
          description={error}
        >
          <Link to="/login" className="btn btn-primary">Masuk ke aplikasi</Link>
        </StateMessage>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <ReportView
        report={shareRow?.report_data}
        title={shareRow?.title}
        shareMeta={{ updatedAt: shareRow?.updated_at }}
        actions={(
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => window.print()}>
              Export PDF
            </button>
            <Link className="btn btn-primary" to="/login">
              Buka Aplikasi
            </Link>
          </div>
        )}
      />
    </div>
  );
}
