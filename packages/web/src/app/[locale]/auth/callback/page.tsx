'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { setToken } from '@/lib/auth';
import { t } from '@/lib/ui-translations';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/').filter(Boolean)[0] || 'en';

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setToken(token);

      const redirect = sessionStorage.getItem('auth_redirect');
      sessionStorage.removeItem('auth_redirect');

      if (window.opener) {
        window.opener.location.reload();
        window.close();
      } else {
        router.push(redirect || `/${locale}`);
      }
    }
  }, [searchParams, router, locale]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-neutral-400">{t(locale, 'user.signingIn')}</p>
    </div>
  );
}
