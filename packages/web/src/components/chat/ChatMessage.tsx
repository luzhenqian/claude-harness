'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageRenderer } from './MessageRenderer';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/ui-translations';
import { Pencil, Check, Copy, RefreshCw } from 'lucide-react';

interface Props {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  isStreaming?: boolean;
  onEdit?: (id: string, newContent: string) => void;
}

export function ChatMessage({ id, role, content, isStreaming, onEdit }: Props) {
  const locale = useLocale();
  const isUser = role === 'user';
  const [hovering, setHovering] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [copied, setCopied] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = 'auto';
      editRef.current.style.height = editRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  const handleConfirmEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== content && onEdit) {
      onEdit(id, trimmed);
    }
    setEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 20,
        animation: 'chat-msg-in 0.3s ease-out',
      }}
    >
      {/* Avatar + label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          background: isUser
            ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))'
            : 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(96,165,250,0.08))',
          color: isUser ? 'var(--accent)' : '#60a5fa',
          border: `1px solid ${isUser ? 'rgba(245,158,11,0.2)' : 'rgba(96,165,250,0.2)'}`,
          flexShrink: 0,
        }}>
          {isUser ? '\u4f60' : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/>
            </svg>
          )}
        </div>
        <span style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--text-muted)',
          fontWeight: 500,
        }}>
          {isUser ? '\u4f60' : t(locale, 'chat.title')}
        </span>
      </div>

      {/* Message bubble */}
      {editing ? (
        <div style={{ width: '100%', maxWidth: isUser ? 520 : '100%', alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
          <textarea
            ref={editRef}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleConfirmEdit();
              if (e.key === 'Escape') { setEditing(false); setEditValue(content); }
            }}
            style={{
              width: '100%',
              minHeight: 80,
              padding: '14px 16px',
              borderRadius: 12,
              border: '1px solid var(--accent)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: 14,
              lineHeight: 1.7,
              fontFamily: "'Noto Sans SC', sans-serif",
              resize: 'none',
              outline: 'none',
              boxShadow: '0 0 0 3px rgba(245,158,11,0.1)',
            }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => { setEditing(false); setEditValue(content); }}
              style={{
                padding: '5px 14px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
              }}
            >
              {t(locale, 'chat.cancel')}
            </button>
            <button
              onClick={handleConfirmEdit}
              style={{
                padding: '5px 14px', borderRadius: 6, border: 'none',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#09090b',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t(locale, 'chat.saveResend')}
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>
            \u2318+Enter {t(locale, 'chat.saveResend')} \u00b7 Esc {t(locale, 'chat.cancel')}
          </div>
        </div>
      ) : (
        <div style={{
          maxWidth: isUser ? 520 : '100%',
          padding: '14px 18px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser
            ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.04))'
            : 'rgba(255,255,255,0.025)',
          border: `1px solid ${isUser ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)'}`,
          fontSize: 14,
          lineHeight: 1.8,
          color: 'var(--text)',
        }}>
          {isUser ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
          ) : (
            <MessageRenderer content={content} isStreaming={isStreaming} />
          )}
          {isStreaming && !content && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)',
                  animation: `chat-typing-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons on hover */}
      {hovering && !editing && !isStreaming && (
        <div style={{
          display: 'flex',
          gap: 2,
          marginTop: 4,
          animation: 'chat-fade-in 0.15s ease',
          alignSelf: isUser ? 'flex-end' : 'flex-start',
        }}>
          {isUser && onEdit && (
            <button onClick={() => setEditing(true)} title={t(locale, 'chat.saveResend')}
              className="chat-action-btn"><Pencil size={13} /></button>
          )}
          <button onClick={handleCopy} title={copied ? '\u2713' : 'Copy'}
            className="chat-action-btn">
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
          {!isUser && (
            <button title="Regenerate" className="chat-action-btn"><RefreshCw size={13} /></button>
          )}
        </div>
      )}
    </div>
  );
}
