import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/AuthContext';
import { isSupabaseConfigured, supabase } from '@/modules/shared/services/supabaseClient';
import { clearPasswordRecoveryReady, isPasswordRecoveryReady, markPasswordRecoveryReady } from '@/modules/auth/passwordRecoveryStorage';

function hasRecoveryHint(search, hash) {
  return search.includes('type=recovery') || hash.includes('type=recovery') || search.includes('code=');
}

export default function ResetPasswordPage() {
  const { resetPassword, user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(() => isPasswordRecoveryReady());
  const shouldTryRecoverySession = useMemo(
    () => hasRecoveryHint(location.search, location.hash),
    [location.hash, location.search]
  );

  useEffect(() => {
    let active = true;

    async function prepareRecovery() {
      if (!isSupabaseConfigured) {
        if (active) setPreparing(false);
        return;
      }

      try {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeError && data.session && active) {
            markPasswordRecoveryReady();
            setRecoveryReady(true);
          }
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (active && (sessionData.session || isPasswordRecoveryReady())) {
          setRecoveryReady(true);
        }
      } finally {
        if (active) setPreparing(false);
      }
    }

    prepareRecovery();
    return () => {
      active = false;
    };
  }, [location.search]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setSubmitting(true);
    const result = await resetPassword(password);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    clearPasswordRecoveryReady();
    setSuccessMessage(result.message);
    navigate('/login', {
      replace: true,
      state: {
        message: result.message,
      },
    });
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">🔒</div>
            <h1>Reset Password</h1>
          </div>
          <div className="auth-alert auth-alert-warning">
            Reset password via email hanya tersedia saat Supabase aktif.
          </div>
          <div className="login-footer">
            <Link to="/login">Kembali ke login</Link>
          </div>
        </div>
      </div>
    );
  }

  const canShowForm = recoveryReady || user;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🔑</div>
          <h1>Password Baru</h1>
        </div>
        <p className="login-subtitle">
          Buat password baru untuk akun Anda. Setelah selesai, Anda bisa login kembali seperti biasa.
        </p>

        {(preparing || loading) && <div className="auth-alert auth-alert-info">Menyiapkan sesi reset password...</div>}

        {!preparing && !loading && !canShowForm && (
          <div className="auth-alert auth-alert-warning">
            Link reset password tidak valid, sudah kedaluwarsa, atau belum membuka sesi recovery.
          </div>
        )}

        {!preparing && !loading && !canShowForm && shouldTryRecoverySession && (
          <div className="auth-helper-panel">
            Coba minta link reset baru dari halaman lupa password untuk mendapatkan sesi recovery yang masih aktif.
          </div>
        )}

        {canShowForm && (
          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="auth-alert auth-alert-danger">{error}</div>}
            {successMessage && <div className="auth-alert auth-alert-success">{successMessage}</div>}

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
          <Link to="/forgot-password">Minta link baru</Link> atau <Link to="/login">kembali ke login</Link>
        </div>
      </div>
    </div>
  );
}
