'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { LogOut, MessageSquare, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface Props { locale: string; }

export function UserMenu({ locale }: Props) {
  const { user, logout } = useAuthContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  if (!user) {
    return (
      <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/github`}
        className="nav-btn" style={{ fontSize: '13px' }}>
        Sign in
      </a>
    );
  }

  const handleLogout = () => {
    logout();
    setOpen(false);
    window.location.href = `/${locale}`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors"
        style={{ color: 'var(--text-dim)' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" style={{ border: '1px solid var(--border)' }} />
        ) : (
          <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg shadow-xl py-1 z-50"
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            backdropFilter: 'blur(20px)',
          }}>
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{user.name}</div>
          </div>

          <Link href={`/${locale}/chat`} onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-dim)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <MessageSquare size={14} />
            对话历史
          </Link>

          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />

          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
            style={{ color: 'var(--red)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={14} />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
