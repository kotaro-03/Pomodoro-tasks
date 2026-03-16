import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { BreakSettings } from './types';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakSettings: BreakSettings;
}

export const HelpModal: React.FC<HelpModalProps> = React.memo(({ isOpen, onClose, breakSettings }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="neu-flat rounded-[2.5rem] p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto custom-scrollbar relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10" />

            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 neu-inset rounded-2xl text-indigo-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white leading-tight">ポモドーロテクニック</h2>
            </div>
            
            <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
              <p>
                <strong className="text-indigo-400">ポモドーロテクニック</strong>は、1980年代にフランチェスコ・シリロが考案した時間管理法です。
                トマト型のキッチンタイマー🍅が名前の由来です。
              </p>
              
              <div className="neu-inset rounded-2xl p-6 space-y-3 bg-white/[0.02]">
                <p className="font-black text-zinc-100 mb-2 uppercase tracking-widest text-[10px]">📋 2サイクルの流れ:</p>
                <div className="space-y-2">
                  {[
                    { icon: '🧠', text: '25分 集中', color: 'text-indigo-400' },
                    { icon: '☕', text: `${breakSettings.shortBreak}分 小休止`, color: 'text-emerald-400' },
                    { icon: '🧠', text: '25分 集中', color: 'text-indigo-400' },
                    { icon: '☕', text: `${breakSettings.shortBreak}分 小休止`, color: 'text-emerald-400' },
                    { icon: '🧠', text: '25分 集中', color: 'text-indigo-400' },
                    { icon: '🍵', text: `${breakSettings.midBreak}分 中休止`, color: 'text-teal-400' },
                    { icon: '🔁', text: 'もう1サイクル繰り返し…', color: 'text-zinc-500' },
                    { icon: '🛋️', text: `${breakSettings.longBreak}分 長めの休憩`, color: 'text-blue-400' },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center space-x-3 text-xs ${item.color} font-bold`}>
                      <span className="text-base">{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-amber-400 uppercase tracking-widest text-[10px]">🌟 なぜ効果的なのか？</p>
                <ul className="list-disc list-inside space-y-1.5 text-zinc-400 text-xs">
                  <li>短い集中と休憩で<strong className="text-zinc-200">持続力</strong>を最大化</li>
                  <li>制限時間が<strong className="text-zinc-200">先延ばし</strong>を防止</li>
                  <li>小さなゴールの達成感で<strong className="text-zinc-200">やる気</strong>を維持</li>
                </ul>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="w-full mt-10 py-4 neu-flat hover:neu-pressed text-indigo-400 rounded-2xl font-black text-sm tracking-widest uppercase transition-all"
            >
              閉じる
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
