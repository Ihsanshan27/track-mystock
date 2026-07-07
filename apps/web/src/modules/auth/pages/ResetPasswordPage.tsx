import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  clearPendingPasswordReset,
  getPendingPasswordResetEmail,
  getPendingPasswordResetToken,
  setPendingPasswordReset,
} from '@/modules/auth/authSessionStorage';

export default function ResetPasswordPage() {
  const { resetPassword, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const initialEmail = useMemo(() => {
    const stateEmail = typeof location.state?.email === 'string' ? location.state.email : '';
    return stateEmail || getPendingPasswordResetEmail();
  }, [location.state]);
  const initialToken = useMemo(() => {
    const stateToken = typeof location.state?.resetToken === 'string' ? location.state.resetToken : '';
    return stateToken || getPendingPasswordResetToken();
  }, [location.state]);

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(
    typeof location.state?.message === 'string' ? location.state.message : '',
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialEmail || initialToken) {
      setPendingPasswordReset(initialEmail, initialToken);
    }
  }, [initialEmail, initialToken]);

  const canShowForm = Boolean(email && token);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim() || !token.trim()) {
      setError('Email dan kode reset wajib tersedia.');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setSubmitting(true);
    const result = await resetPassword(password, {
      email: email.trim().toLowerCase(),
      token: token.trim(),
    });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    clearPendingPasswordReset();
    setSuccessMessage(result.message);
    navigate('/login', {
      replace: true,
      state: {
        message: result.message,
      },
    });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🔑</div>
          <h1>Password Baru</h1>
        </div>
        <p className="login-subtitle">
          Masukkan email, kode reset, lalu buat password baru untuk akun Anda.
        </p>

        {loading && <div className="auth-alert auth-alert-info">Menyiapkan reset password...</div>}

        {!loading && !canShowForm && (
          <div className="auth-alert auth-alert-warning">
            Kode reset password belum tersedia. Minta kode baru dari halaman lupa password.
          </div>
        )}

        {canShowForm && (
          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="auth-alert auth-alert-danger">{error}</div>}
            {successMessage && <div className="auth-alert auth-alert-success">{successMessage}</div>}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={event => setEmail(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kode Reset</label>
              <input
                type="text"
                inputMode="numeric"
                className="form-input auth-otp-input"
                placeholder="123456"
                value={token}
                onChange={event => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password Baru</label>
              <input
                type="password"
                className="form-input"
                placeholder="Masukkan password baru"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Konfirmasi Password Baru</label>
              <input
                type="password"
                className="form-input"
                placeholder="Ulangi password baru"
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </form>
        )}

        <div className="login-footer">
          <Link to="/forgot-password">Minta kode baru</Link> atau <Link to="/login">kembali ke login</Link>
        </div>
      </div>
    </div>
  );
}
