'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api, { getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Suspense } from 'react';

const RESET_TOKEN_KEY = 'feellink_reset_token';
const authShellClass = "fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(255,123,0,0.12),transparent_32%),#f8fafc] p-4 text-slate-950 dark:bg-[radial-gradient(circle_at_50%_20%,rgba(255,123,0,0.12),transparent_32%),#0d0d0d] dark:text-white";
const authLoadingClass = "min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(255,123,0,0.12),transparent_32%),#f8fafc] text-slate-950 dark:bg-[radial-gradient(circle_at_50%_20%,rgba(255,123,0,0.12),transparent_32%),#0d0d0d] dark:text-white";
const authCardClass = "w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:border-white/5 dark:bg-[#111111] dark:shadow-xl";
const authInputClass = "w-full rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-amber-400 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token') || '';
  const clearAuth = useAuthStore((state: any) => state.clearAuth);

  const [resetToken, setResetToken] = useState<string | null>(null);
  const [tokenSource, setTokenSource] = useState<'none' | 'session' | 'url'>('none');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    clearAuth();
  }, [clearAuth]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(RESET_TOKEN_KEY);
      if (stored) {
        setResetToken(stored);
        setTokenSource('session');
      } else if (urlToken) {
        setResetToken(urlToken);
        setTokenSource('url');
      } else {
        setResetToken('');
        setTokenSource('none');
      }
    } catch (_) {
      if (urlToken) {
        setResetToken(urlToken);
        setTokenSource('url');
      } else {
        setResetToken('');
        setTokenSource('none');
      }
    }
  }, [urlToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!resetToken) {
      setError('Şifre sıfırlama oturumu bulunamadı. Lütfen şifremi unuttum adımından tekrar doğrulama kodu alın.');
      return;
    }

    if (password.length < 8) {
      setError('Şifreniz en az 8 karakter olmalı.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setIsLoading(true);

    try {
      const isOtpFlow = tokenSource === 'session' || resetToken.includes('.'); // JWT from verify-reset-otp
      if (isOtpFlow) {
        const res = await api.post('/auth/reset-password-with-otp', {
          resetToken,
          newPassword: password,
        });
        setMessage(res.data?.message || 'Şifreniz başarıyla güncellendi.');
        try {
          sessionStorage.removeItem(RESET_TOKEN_KEY);
        } catch (_) {}
      } else {
        const res = await api.post('/auth/reset-password', { token: resetToken, password });
        setMessage(res.data?.message || 'Şifreniz başarıyla güncellendi.');
      }
      setTimeout(() => router.replace('/login?reset=success'), 2000);
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Bağlantınız geçersiz veya süresi dolmuş olabilir. Lütfen şifremi unuttum adımlarını tekrarlayın.');
    } finally {
      setIsLoading(false);
    }
  };

  if (resetToken === null) {
    return (
      <div className={authLoadingClass}>
        Yükleniyor...
      </div>
    );
  }

  if (resetToken === '') {
    return (
      <div className={authShellClass}>
        <div className={`${authCardClass} text-center`}>
          <h1 className="text-xl font-semibold text-slate-950 dark:text-white mb-2">Şifre sıfırlama</h1>
          <p className="text-sm text-slate-600 dark:text-gray-400 mb-6">
            Şifrenizi sıfırlamak için önce e-posta adresinize giden doğrulama kodunu kullanmanız gerekiyor.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block rounded-xl bg-amber-500 hover:bg-amber-400 text-sm font-medium text-black py-2 px-6"
          >
            Şifremi unuttum
          </Link>
          <p className="mt-4 text-xs text-slate-500 dark:text-gray-500">
            <Link href="/login" className="text-amber-400 hover:text-amber-300">Giriş sayfasına dön</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={authShellClass}>
      <div className={authCardClass}>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white mb-2">Yeni Şifre Oluştur</h1>
        <p className="text-xs text-slate-600 dark:text-gray-400 mb-6">
          Güvenli bir şifre belirleyin. Bu şifre ile Feellink hesabınıza giriş yapabileceksiniz.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-700 dark:text-gray-300 mb-1">Yeni Şifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
              placeholder="Yeni şifreniz"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-700 dark:text-gray-300 mb-1">Yeni Şifre (Tekrar)</label>
            <input
              type="password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={authInputClass}
              placeholder="Yeni şifrenizi tekrar girin"
            />
          </div>

          {message && <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p>}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-sm font-medium text-black py-2 transition-colors"
          >
            {isLoading ? 'Kaydediliyor...' : 'Şifremi Güncelle'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className={authLoadingClass}>Yükleniyor...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
