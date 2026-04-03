'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function LoginButton() {
  return (
    <div className="flex flex-col gap-2">
      <a href={`${API_BASE}/auth/github`}
        className="flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm text-white hover:bg-neutral-700 transition-colors">
        Login with GitHub
      </a>
      <a href={`${API_BASE}/auth/google`}
        className="flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm text-white hover:bg-neutral-700 transition-colors">
        Login with Google
      </a>
    </div>
  );
}
