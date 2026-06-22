import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { setPendingVerificationEmail } from '@/modules/auth/verificationStorage';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const message = typeof location.state?.message === 'string' ? location.state.message : '';
    if (message) {
      setSuccessMessage(message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Email dan password wajib diisi');
      return;
    }
    setSubmitting(true);
    const result = await login(username.trim(), password);
    setSubmitting(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  const handleGoToVerification = () => {
    const normalizedEmail = username.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Masukkan email terlebih dahulu untuk lanjut ke verifikasi.');
      return;
    }
    setPendingVerificationEmail(normalizedEmail);
    navigate('/verify-email', {
      state: {
        email: normalizedEmail,
      },
    });
  };

  const showVerificationAction = error.toLowerCase().includes('belum dikonfirmasi');

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">📈</div>
          <h1>Jurnal Saham</h1>
        </div>
        <p className="login-subtitle">Catat, analisis, dan tingkatkan performa trading Anda</p>

        <form className="login-form" onSubmit={handleSubmit}>
          {successMessage && <div className="auth-alert auth-alert-success">{successMessage}</div>}
          {error && <div className="auth-alert auth-alert-danger">{error}</div>}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="Masukkan email"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Masukkan password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        {showVerificationAction && (
          <div className="auth-secondary-actions">
            <button type="button" className="btn btn-secondary" onClick={handleGoToVerification}>
              Lanjut Verifikasi Email
            </button>
          </div>
        )}

        <div className="login-footer">
          Belum punya akun? <Link to="/register">Daftar sekarang</Link>
        </div>
      </div>
    </div>
  );
}
