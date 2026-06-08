import { Link } from 'react-router-dom';
import StateMessage from './StateMessage';

export default function AccessDenied({ roleLabel, message }) {
  return (
    <StateMessage
      tone="warning"
      title="Akses tidak tersedia"
      description={message || `Role ${roleLabel || 'Anda'} belum punya izin untuk membuka halaman ini.`}
    >
      <Link to="/" className="btn btn-primary">Kembali ke Dashboard</Link>
    </StateMessage>
  );
}
