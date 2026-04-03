'use client';

import { useState } from 'react';
import { ChatPanel } from './ChatPanel';

interface Props { articleSlug?: string; articleContent?: string; }

export function ChatWidget({ articleSlug, articleContent }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/25 flex items-center justify-center text-white text-xl hover:scale-105 transition-transform"
          aria-label="Open AI chat">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[480px] h-[600px]">
          <ChatPanel onClose={() => setIsOpen(false)} articleSlug={articleSlug} articleContent={articleContent} />
        </div>
      )}
    </>
  );
}
