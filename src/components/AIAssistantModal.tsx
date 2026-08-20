import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Loader as Loader2, RotateCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AIAssistantModalProps {
  open: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_GREETING: ChatMessage = {
  role: 'assistant',
  content: 'Merhaba balıkçı! Av geçmişine dayalı öneriler ve genel balıkçılık soruları için buradayım. Sana nasıl yardımcı olabilirim?',
};

export function AIAssistantModal({ open, onClose }: AIAssistantModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([SYSTEM_GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('fish-assistant', {
        body: {
          message: text,
          history: history.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (!data || typeof data.reply !== 'string') {
        throw new Error('Yanıt alınamadı');
      }

      setMessages([...history, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağlantı hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      setMessages(messages.slice(0, messages.lastIndexOf(lastUser)));
      setInput(lastUser.content);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ocean-bg relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-x border-white/10"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between glass px-5 py-3 pt-[max(env(safe-area-inset-top),12px)]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lake-500/20">
                  <Sparkles className="h-4 w-4 text-lake-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Balık Asistanı</p>
                  <p className="text-[10px] text-slate-400">Av geçmişine dayalı öneriler</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-200 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-br-md bg-lake-600 text-white'
                        : 'glass rounded-bl-md text-slate-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="glass flex items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-3">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-lake-300 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-lake-300 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-lake-300" />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center gap-2 pt-2">
                  <p className="rounded-xl bg-coral-500/20 px-4 py-2.5 text-center text-sm text-coral-300">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 rounded-full bg-lake-600 px-4 py-2 text-xs font-semibold text-white active:scale-95"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Tekrar Dene
                  </button>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 glass px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Bir soru sor... (örn: Bu mevsim nerede avlanmalıyım?)"
                  className="glass max-h-32 flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-lake-400"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lake-600 text-white active:scale-95 disabled:opacity-40"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
