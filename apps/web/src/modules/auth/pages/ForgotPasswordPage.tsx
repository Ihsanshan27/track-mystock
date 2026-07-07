import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/AuthContext';
import { setPendingPasswordReset } from '@/modules/auth/authSessionStorage';

export default function ForgotPasswordPage() {
  const { requestPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setError('Masukkan email akun Anda terlebih dahulu.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setSubmitting(true);
    const result = await requestPasswordRecovery(normalizedEmail);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    if (result.email && result.resetToken) {
      setPendingPasswordReset(result.email, result.resetToken);
      navigate('/reset-password', {
        state: {
          email: result.email,
          resetToken: result.resetToken,
          message: result.message,
        },
      });
      return;
    }

    setSuccessMessage(result.message);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🔐</div>
          <h1>Lupa Password</h1>
        </div>
        <p className="login-subtitle">
          Masukkan email akun Anda. Kami akan buat kode reset untuk mengganti password.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="auth-alert auth-alert-danger">{error}</div>}
          {successMessage && <div className="auth-alert auth-alert-success">{successMessage}</div>}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="nama@email.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Mengirim...' : 'Buat Kode Reset'}
          </button>
        </form>

        <div className="login-footer">
          Sudah ingat password? <Link to="/login">Kembali ke login</Link>
        </div>
      </div>
    </div>
  );
}
