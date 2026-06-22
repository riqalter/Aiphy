"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, saveTokens, saveCurrentUser } from '../lib/api';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleAuth() {
      const accessToken = searchParams.get('token');
      const refreshToken = searchParams.get('refresh');
      const error = searchParams.get('error');

      if (error === 'account_suspended') {
        router.push('/login?error=account_suspended');
        return;
      }

      if (!accessToken || !refreshToken) {
        router.push('/login?error=oauth_failed');
        return;
      }

      try {
        // Save tokens first
        saveTokens(accessToken, refreshToken);

        // Fetch full profile info to get the user object
        const profileRes = await api.get('/api/user/profile');
        saveCurrentUser(profileRes.data);

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (err) {
        console.error('OAuth Callback Error:', err);
        router.push('/login?error=oauth_failed');
      }
    }

    handleAuth();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto dark:border-indigo-400"></div>
        <h2 className="mt-6 text-lg font-bold text-slate-800 dark:text-slate-100">Menyinkronkan Sesi Anda...</h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Harap tunggu sebentar selagi kami masuk ke akun Anda.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto dark:border-indigo-400"></div>
          <h2 className="mt-6 text-lg font-bold text-slate-800 dark:text-slate-100">Memuat halaman...</h2>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
