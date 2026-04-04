'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { t, formatTemplate } from '@/lib/ui-translations';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LoginPage() {
  const pathname = usePathname();
  const locale = pathname.split('/').filter(Boolean)[0] || 'en';
  const { user } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Preserve redirect target from query param (e.g. middleware redirect)
  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (redirect && !sessionStorage.getItem('auth_redirect')) {
      sessionStorage.setItem('auth_redirect', redirect);
    }
  }, [searchParams]);

  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      const redirect = sessionStorage.getItem('auth_redirect');
      sessionStorage.removeItem('auth_redirect');
      router.push(redirect || `/${locale}`);
    }
  }, [user, locale, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 24px 24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href={`/${locale}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: 'var(--accent)', boxShadow: '0 0 14px var(--accent-glow)',
            }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
              fontSize: '18px', color: 'var(--accent)', letterSpacing: '-0.02em',
            }}>
              Claude Harness
            </span>
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '40px 32px',
        }}>
          <h1 style={{
            fontSize: '20px', fontWeight: 600, color: 'var(--text-bright)',
            textAlign: 'center', marginBottom: '8px',
          }}>
            {t(locale, 'user.loginTitle')}
          </h1>
          <p style={{
            fontSize: '14px', color: 'var(--text-dim)',
            textAlign: 'center', marginBottom: '32px', lineHeight: 1.5,
          }}>
            {t(locale, 'user.loginDesc')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* GitHub */}
            <a href={`${API_BASE}/auth/github`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '12px 20px', borderRadius: '10px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: '14px', fontWeight: 500,
                textDecoration: 'none', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)';
                e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--bg-elevated)';
              }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              {formatTemplate(t(locale, 'user.continueWith'), { provider: 'GitHub' })}
            </a>

            {/* Google */}
            <a href={`${API_BASE}/auth/google`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '12px 20px', borderRadius: '10px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: '14px', fontWeight: 500,
                textDecoration: 'none', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-hover)';
                e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--bg-elevated)';
              }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {formatTemplate(t(locale, 'user.continueWith'), { provider: 'Google' })}
            </a>
          </div>

          <p style={{
            fontSize: '12px', color: 'var(--text-muted)',
            textAlign: 'center', marginTop: '24px', lineHeight: 1.5,
          }}>
            {t(locale, 'user.terms')}
          </p>
        </div>
      </div>
    </div>
  );
}
