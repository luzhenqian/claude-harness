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
      className="fixed z-[60] min-w-[220px] bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl py-1 animate-in fade-in duration-150"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}
      onMouseDown={(e) => e.stopPropagation()}>
      {actions.map((action) => (
        <button key={action.id} onClick={() => { onAction(action.id); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800 transition-colors">
          <span>{action.icon}</span><span>{action.label}</span>
        </button>
      ))}
      <div className="border-t border-neutral-800 mt-1 pt-1">
        {!showCustomInput ? (
          <button onClick={() => setShowCustomInput(true)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm text-neutral-400 hover:bg-neutral-800 transition-colors">
            <span className="flex items-center gap-2"><span>✏️</span><span>Custom question...</span></span>
            <span className="text-xs text-neutral-600">⌘K</span>
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
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
