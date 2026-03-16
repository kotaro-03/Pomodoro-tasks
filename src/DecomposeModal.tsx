import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Minus } from 'lucide-react';
import { Task } from './types';

interface DecomposeModalProps {
  target: Task | null;
  parts: number;
  names: string[];
  onPartsChange: (val: number) => void;
  onNameChange: (idx: number, val: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const DecomposeModal: React.FC<DecomposeModalProps> = React.memo(({ 
  target, parts, names, onPartsChange, onNameChange, onConfirm, onClose 
}) => {
  if (!target) return null;

  return (
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
        className="neu-flat rounded-[2.5rem] p-8 max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col relative"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10" />

        <div className="flex items-center space-x-4 mb-8 relative">
          <div className="p-3 neu-inset rounded-2xl text-indigo-400">
            <Sparkles className="w-6 h-6 animate-pulse-glow" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white leading-tight">タスクを分解する</h2>
            <p className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase mt-1">Manual Decomposition</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8 neu-inset p-4 rounded-2xl">
          <span className="text-sm font-bold text-zinc-400 ml-2">分割数</span>
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => onPartsChange(parts - 1)}
              className="p-3 neu-flat rounded-xl hover:text-indigo-400 transition-all active:scale-90"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="text-2xl font-black text-indigo-400 w-8 text-center">{parts}</span>
            <button 
              onClick={() => onPartsChange(parts + 1)}
              className="p-3 neu-flat rounded-xl hover:text-indigo-400 transition-all active:scale-90"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 mb-8">
          {names.map((name, i) => (
            <motion.div
              layout
              key={i}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center p-3 neu-inset rounded-xl"
            >
              <span className="w-8 text-xs font-black text-zinc-600 text-center">{i + 1}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(i, e.target.value)}
                className="flex-1 bg-transparent border-none text-zinc-100 font-bold text-sm focus:outline-none px-2"
              />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onClose}
            className="py-4 neu-flat text-zinc-500 hover:text-white rounded-2xl font-bold text-sm tracking-widest uppercase transition-all"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="py-4 neu-flat text-emerald-400 rounded-2xl font-black text-sm tracking-[0.2em] uppercase transition-all hover:shadow-[0_0_15px_rgba(52,211,153,0.3)]"
          >
            確定して分解
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});
