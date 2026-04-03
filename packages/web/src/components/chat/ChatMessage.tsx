'use client';

interface Props {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: Props) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser ? 'bg-violet-600 text-white rounded-br-md' : 'bg-neutral-800 text-neutral-100 rounded-bl-md'
      }`}>
        <div className="whitespace-pre-wrap">{content}</div>
        {isStreaming && !content && (
          <span className="inline-block h-4 w-1 animate-pulse bg-violet-400 ml-0.5" />
        )}
      </div>
    </div>
  );
}
