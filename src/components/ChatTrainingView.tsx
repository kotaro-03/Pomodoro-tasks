import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, User, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Question } from '../data';
import { ChatMessage, chatWithAI, getSystemPrompt } from '../utils/ai';

interface ChatTrainingViewProps {
  question: Question;
  apiKey: string;
  initialMessages?: ChatMessage[];
  onExit: (messages: ChatMessage[]) => void;
  onComplete: (messages: ChatMessage[]) => void;
}

export const ChatTrainingView: React.FC<ChatTrainingViewProps> = ({
  question,
  apiKey,
  initialMessages = [],
  onExit,
  onComplete
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize chat if empty
  useEffect(() => {
    if (messages.length === 0) {
      const systemMessage: ChatMessage = { role: 'system', content: getSystemPrompt(question) };
      const initialGreeting: ChatMessage = {
        role: 'assistant',
        content: `こんにちは。本日はケース面接の練習を行います。お題は「${question.title}」です。\nまずは前提条件の確認から始めましょうか。どのようにアプローチを進めるか、あなたの考えを教えてください。`
      };
      setMessages([systemMessage, initialGreeting]);
    }
  }, [question, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Add a placeholder for assistant's streaming response
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      await chatWithAI(apiKey, updatedMessages, (chunkedText) => {
        setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = chunkedText;
          return newMsgs;
        });
      });
    } catch (error: any) {
      setMessages((prev) => [
        ...prev.slice(0, -1), // remove the empty assistant placeholder
        { role: 'assistant', content: `【エラーが発生しました】\n${error.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const displayMessages = messages.filter((m) => m.role !== 'system');

  return (
    <div className="flex flex-col h-[70vh] rounded-2xl border dark:border-slate-800/80 dark:bg-slate-900/10 bg-white border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b dark:border-slate-800 border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-indigo-500" />
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">AI面接官との対話モード</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onExit(messages)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            保存して中断
          </button>
          <button
            onClick={() => onComplete(messages)}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-1"
          >
            <CheckCircle2 className="h-3 w-3" />
            面接を終了して評価へ
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/30 dark:bg-slate-950/20">
        <AnimatePresence initial={false}>
          {displayMessages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`flex shrink-0 h-8 w-8 items-center justify-center rounded-full border ${
                  isUser 
                    ? 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700' 
                    : 'bg-indigo-100 border-indigo-200 text-indigo-500 dark:bg-indigo-500/20 dark:border-indigo-500/30'
                }`}>
                  {isUser ? <User className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {isLoading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full border bg-indigo-100 border-indigo-200 text-indigo-500 dark:bg-indigo-500/20 dark:border-indigo-500/30">
              <Brain className="h-4 w-4 animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-tl-sm flex items-center gap-1 shadow-sm">
              <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800 border-slate-200">
        {!apiKey ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>AIを利用するには、ヘッダーの「設定」からOpenAI APIキーを設定してください。</span>
          </div>
        ) : (
          <div className="relative flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder="メッセージを入力... (Cmd/Ctrl + Enter で送信)"
                rows={1}
                className="w-full rounded-2xl border border-slate-200 p-3 pr-10 text-sm leading-relaxed outline-none transition-all resize-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-500 max-h-40"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md disabled:opacity-50 disabled:bg-slate-400 hover:bg-indigo-500 transition-all active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
