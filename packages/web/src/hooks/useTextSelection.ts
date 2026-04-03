'use client';

import { useState, useEffect, useCallback } from 'react';

interface SelectionState {
  text: string;
  x: number;
  y: number;
}

export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
    if (containerRef.current && !containerRef.current.contains(sel.anchorNode)) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelection({ text: sel.toString().trim(), x: rect.left + rect.width / 2, y: rect.top - 10 });
  }, [containerRef]);

  const clearSelection = useCallback(() => { setSelection(null); }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', clearSelection);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', clearSelection);
    };
  }, [handleMouseUp, clearSelection]);

  return { selection, clearSelection };
}
