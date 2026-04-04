'use client';

import Link from 'next/link';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/ui-translations';

export function LoginButton() {
  const locale = useLocale();

  const handleClick = () => {
    sessionStorage.setItem('auth_redirect', window.location.pathname);
  };

  return (
    <Link href={`/${locale}/auth/login`}
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
      style={{ background: 'var(--accent)', color: 'white' }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
      {t(locale, 'user.signIn')}
    </Link>
  );
}
