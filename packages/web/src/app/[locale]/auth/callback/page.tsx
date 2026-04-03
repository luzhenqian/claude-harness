'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setToken } from '@/lib/auth';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setToken(token);
      if (window.opener) {
        window.opener.location.reload();
        window.close();
      } else {
        router.push('/');
      }
    }
  }, [searchParams, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-neutral-400">Signing in...</p>
    </div>
  );
}
