import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  clearPendingVerificationEmail,
  getPendingResendAt,
  getPendingVerificationEmail,
  setPendingResendAt,
  setPendingVerificationEmail,
} from '@/modules/auth/verificationStorage';

function formatCooldown(seconds) {
  if (seconds <= 0) return '0 detik';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes <= 0) return `${remainingSeconds} detik`;
  if (remainingSeconds <= 0) return `${minutes} menit`;
  return `${minutes} menit ${remainingSeconds} detik`;
}

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmailOtp, resendEmailOtp } = useAuth();
  const initialEmail = useMemo(() => {
    const stateEmail = typeof location.state?.email === 'string' ? location.state.email : '';
    return stateEmail || getPendingVerificationEmail();
  }, [location.state]);
  const initialMessage = typeof location.state?.message === 'string' ? location.state.message : '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(initialMessage);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (initialEmail) {
      setPendingVerificationEmail(initialEmail);
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    const updateCooldown = () => {
      const resendAt = getPendingResendAt();
      const remaining = resendAt ? Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)) : 0;
      setCooldown(remaining);
    };

    updateCooldown();
    const intervalId = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError('Email verifikasi tidak ditemukan. Silakan daftar ulang atau login kembali.');
      return;
    }

    const normalizedOtp = otp.replace(/\D/g, '');
    if (normalizedOtp.length !== 6) {
      setError('Masukkan 6 digit kode OTP dari email Anda.');
      return;
    }

    setSubmitting(true);
    const result = await verifyEmailOtp(email, normalizedOtp);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    clearPendingVerificationEmail();
    if (result.hasSession) {
      navigate('/', { replace: true });
      return;
    }

    navigate('/login', {
      replace: true,
      state: {
        message: result.message || 'Email berhasil diverifikasi. Silakan login.',
      },
    });
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;

    setError('');
    setSuccessMessage('');
    setResending(true);
    const result = await resendEmailOtp(email);
    setResending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    const resendAt = Date.now() + (OTP_RESEND_COOLDOWN_SECONDS * 1000);
    setPendingResendAt(resendAt);
    setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    setSuccessMessage(result.message);
  };

  const handleOtpChange = (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(digitsOnly);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">📩</div>
          <h1>Verifikasi Email</h1>
        </div>
        <p className="login-subtitle">
          Masukkan kode OTP 6 digit yang kami kirim ke email Anda untuk mengaktifkan akun.
        </p>

        <div className="auth-email-highlight">
          {email || 'Email verifikasi belum tersedia'}
        </div>

        <form className="login-form" onSubmit={handleVerify}>
          {error && <div className="auth-alert auth-alert-danger">{error}</div>}
          {successMessage && <div className="auth-alert auth-alert-success">{successMessage}</div>}

          <div className="form-group">
            <label className="form-label">Kode OTP</label>
            <input
              type="text"
              inputMode="numeric"
              className="form-input auth-otp-input"
              placeholder="123456"
              value={otp}
              onChange={handleOtpChange}
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting || !email}>
            {submitting ? 'Memverifikasi...' : 'Verifikasi Email'}
          </button>
        </form>

        <div className="auth-secondary-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !email}
          >
            {resending ? 'Mengirim Ulang...' : cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : 'Kirim Ulang Kode'}
          </button>
          <p className="auth-helper-text">
            {cooldown > 0
              ? `Anda bisa meminta kode baru dalam ${formatCooldown(cooldown)}.`
              : 'Belum menerima email? Cek spam atau kirim ulang kode.'}
          </p>
        </div>

        {!email && (
          <div className="auth-inline-links">
            <Link to="/register">Kembali ke daftar</Link>
            <Link to="/login">Atau masuk</Link>
          </div>
        )}

        {email && (
          <div className="login-footer">
            Salah email? <Link to="/register">Daftar ulang</Link> atau <Link to="/login">kembali ke login</Link>
          </div>
        )}
      </div>
    </div>
  );
}
