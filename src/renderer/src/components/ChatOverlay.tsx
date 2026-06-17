import { useState, useRef, useEffect, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { PROVIDER_LABELS } from '../../../types/settings';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatOverlayProps {
  onAIResponse?: (text: string) => void;
}

function ChatOverlay({ onAIResponse }: ChatOverlayProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelContext, setModelContext] = useState('');
  const { settings } = useSettings();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await window.electronAPI.requestExplanation({
        text,
        context: modelContext || undefined,
        history,
      });

      if (result.success && result.text) {
        const aiMsg: ChatMessage = { role: 'assistant', content: result.text, timestamp: Date.now() };
        setMessages((prev) => [...prev, aiMsg]);
        onAIResponse?.(result.text);
      } else {
        const errMsg: ChatMessage = { role: 'assistant', content: `Error: ${result.error || 'Unknown error'}`, timestamp: Date.now() };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (err) {
      const errMsg: ChatMessage = { role: 'assistant', content: `Error: ${(err as Error).message}`, timestamp: Date.now() };
      setMessages((prev) => [...prev, errMsg]);
    }
    setLoading(false);
  }, [input, loading, messages, modelContext, onAIResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput('');
  };

  const providerLabel = PROVIDER_LABELS[settings.provider];
  const modelName = settings[settings.provider].model;

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
        title="Chat"
      >
        <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 h-[calc(100vh-5rem)] bg-gray-900 border border-gray-800 rounded-xl flex flex-col shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-gray-200 text-sm font-medium">Chat</span>
              <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{providerLabel} &middot; {modelName}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={clearChat} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-0.5 rounded" title="Clear chat">Clear</button>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300 text-lg leading-none">&times;</button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-gray-500 text-xs text-center py-8">
                Ask a question about the 3D model you're viewing.
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-800 px-4 py-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the model..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatOverlay;
