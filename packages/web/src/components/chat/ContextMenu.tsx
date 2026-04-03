'use client';

import { useState } from 'react';

interface Props {
  x: number;
  y: number;
  selectedText: string;
  onAction: (action: string, customPrompt?: string) => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, selectedText, onAction, onClose }: Props) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const actions = [
    { id: 'explain', icon: '🔍', label: 'Explain this' },
    { id: 'find_code', icon: '📄', label: 'Find related source code' },
    { id: 'find_articles', icon: '📚', label: 'Find related articles' },
  ];

  return (
    <div
      className="fixed z-[60] min-w-[220px] rounded-lg shadow-xl py-1 animate-in fade-in duration-150"
      style={{
        left: x, top: y, transform: 'translate(-50%, -100%)',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
      }}
      onMouseDown={(e) => e.stopPropagation()}>
      {actions.map((action) => (
        <button key={action.id} onClick={() => { onAction(action.id); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors"
          style={{ color: 'var(--text)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-dim)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <span>{action.icon}</span><span>{action.label}</span>
        </button>
      ))}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '4px' }}>
        {!showCustomInput ? (
          <button onClick={() => setShowCustomInput(true)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm transition-colors"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-dim)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <span className="flex items-center gap-2"><span>✏️</span><span>Custom question...</span></span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>⌘K</span>
          </button>
        ) : (
          <div className="px-3 py-2">
            <input autoFocus value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customPrompt.trim()) { onAction('custom', customPrompt.trim()); onClose(); }
                if (e.key === 'Escape') onClose();
              }}
              placeholder="Type your question..."
              className="w-full rounded px-3 py-1.5 text-sm focus:outline-none"
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                color: 'var(--text)', caretColor: 'var(--accent)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
