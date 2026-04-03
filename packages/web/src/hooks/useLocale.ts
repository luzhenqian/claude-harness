'use client';

import { usePathname } from 'next/navigation';

export function useLocale(): string {
  const pathname = usePathname();
  return pathname.split('/').filter(Boolean)[0] || 'en';
}
