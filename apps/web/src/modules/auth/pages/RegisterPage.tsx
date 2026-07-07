import { useEffect, useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { getRegistrationEnabled } from '@/modules/shared/services/appSettingsService';
import { setPendingVerificationEmail } from '@/modules/auth/verificationStorage';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingSetting, setLoadingSetting] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function loadSetting() {
      try {
        const enabled = await getRegistrationEnabled();
        if (!cancelled) setRegistrationEnabled(enabled);
      } catch {
        if (!cancelled) setRegistrationEnabled(true);
      } finally {
        if (!cancelled) setLoadingSetting(false);
      }
    }

    loadSetting();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!registrationEnabled) {
      setError('Registrasi sedang dinonaktifkan. Hubungi admin untuk dibuatkan akun.');
      return;
    }
    if (!username.trim() || !password.trim()) {
      setError('Semua field wajib diisi');
      return;
    }
    if (!username.includes('@')) {
      setError('Masukkan email yang valid');
      return;
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }
    if (password !== confirmPass) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    setSubmitting(true);
    const result = await register(username.trim(), password);
    setSubmitting(false);
    if (result.success) {
      if (result.needsOtpVerification && result.email) {
        setPendingVerificationEmail(result.email);
        navigate('/verify-email', {
          replace: true,
          state: {
            email: result.email,
            message: result.message,
          },
        });
        return;
      }
      if (result.needsConfirmation) {
        setSuccessMessage(result.message);
        return;
      }
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">📈</div>
          <h1>Jurnal Saham</h1>
        </div>
        <p className="login-subtitle">Buat akun untuk mulai mencatat trading Anda</p>

        <form className="login-form" onSubmit={handleSubmit}>
          {!loadingSetting && !registrationEnabled && (
            <div className="auth-alert auth-alert-warning">
              Registrasi publik sedang dinonaktifkan. Admin dapat membuat akun dari panel admin.
            </div>
          )}
          {error && <div className="auth-alert auth-alert-danger">{error}</div>}
          {successMessage && <div className="auth-alert auth-alert-success">{successMessage}</div>}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="nama@email.com"
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
              placeholder="Buat password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Konfirmasi Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Ulangi password"
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting || loadingSetting || !registrationEnabled}>
            {submitting ? 'Memproses...' : 'Daftar'}
          </button>
        </form>

        <div className="login-footer">
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </div>
      </div>
    </div>
  );
}
