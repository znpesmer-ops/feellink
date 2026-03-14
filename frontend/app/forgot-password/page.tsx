'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api, { getErrorMessage } from '@/lib/api';

const RESET_TOKEN_KEY = 'feellink_reset_token';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (step !== 'otp' || expiresAt == null) return;
    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setRemainingSec(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, expiresAt]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    setExpiresAt(null);
    setRemainingSec(null);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(res.data?.message || 'Eğer bu e-posta ile kayıtlı bir hesabınız varsa, doğrulama kodu e-posta adresinize gönderildi.');
      if (res.data?.expiresAt) {
        setExpiresAt(new Date(res.data.expiresAt).getTime());
      }
      setStep('otp');
    } catch (err: any) {
      setError(getErrorMessage(err) || 'İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.replace(/\D/g, '').slice(0, 6);
    if (trimmed.length !== 6) {
      setError('Lütfen 6 haneli kodu girin.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/verify-reset-otp', { email: email.trim(), code: trimmed });
      const token = res.data?.resetToken;
      if (token) {
        try {
          sessionStorage.setItem(RESET_TOKEN_KEY, token);
        } catch (_) {}
        router.push('/reset-password');
        return;
      }
      setError('Geçersiz yanıt. Lütfen tekrar deneyin.');
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Kod geçersiz veya süresi dolmuş. Lütfen yeniden kod isteyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0d0d0d] p-4 z-50">
      <div className="w-full max-w-md rounded-2xl bg-[#111111] p-6 shadow-xl border border-white/5">
        <h1 className="text-2xl font-semibold text-white mb-2">
          {step === 'email' ? 'Şifremi Unuttum' : 'Doğrulama kodu'}
        </h1>
        <p className="text-xs text-gray-400 mb-6">
          {step === 'email'
            ? 'E-posta adresinizi girin, şifrenizi sıfırlamanız için size tek kullanımlık doğrulama kodu gönderelim.'
            : `${email} adresine gönderilen 6 haneli kodu girin.`}
        </p>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-300 mb-1">E-posta Adresi</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                placeholder="ornek@mail.com"
              />
            </div>
            {message && <p className="text-xs text-emerald-400 whitespace-pre-line">{message}</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-sm font-medium text-black py-2 transition-colors"
            >
              {isLoading ? 'Gönderiliyor...' : 'Kod Gönder'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Doğrulama kodu</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={handleCodeChange}
                placeholder="000000"
                className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-3 py-2.5 text-center text-lg tracking-widest font-mono text-white outline-none focus:border-amber-400"
              />
              {remainingSec != null && (
                <p className="mt-1 text-xs text-gray-500">
                  {remainingSec > 0
                    ? `Kod ${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')} geçerli`
                    : 'Kodun süresi doldu. Yeni kod isteyin.'}
                </p>
              )}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full mt-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-sm font-medium text-black py-2 transition-colors"
            >
              {isLoading ? 'Doğrulanıyor...' : 'Doğrula ve devam et'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setError(''); setMessage(''); setExpiresAt(null); setRemainingSec(null); }}
              className="w-full text-xs text-gray-400 hover:text-white"
            >
              Farklı e-posta kullan
            </button>
          </form>
        )}

        <div className="mt-4 text-xs text-gray-400">
          Giriş ekranına dönmek için{' '}
          <a href="/login" className="text-amber-400 hover:text-amber-300">
            tıklayın
          </a>
          .
        </div>
      </div>
    </div>
  );
}
