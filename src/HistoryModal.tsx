import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, History } from 'lucide-react';
import { TaskHistory } from './types';

interface HistoryModalProps {
  date: string | null;
  history: TaskHistory;
  workLog: Record<string, number[]>;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = React.memo(({ date, history, workLog, onClose }) => {
  if (!date) return null;

  const tasks = history[date] || [];
  const dayLog = workLog[date] || [];
  const totalSeconds = dayLog.reduce((a, b) => a + b, 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return (
    <AnimatePresence>
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
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 neu-inset rounded-2xl text-indigo-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{date} の記録</h2>
              <p className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase mt-1">Daily Records</p>
            </div>
          </div>

          <div className="neu-inset rounded-2xl p-6 mb-8 flex items-center justify-between border border-white/5">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-bold text-zinc-300">合計業務時間</span>
            </div>
            <div className="text-xl font-black text-white">
              {hrs > 0 ? `${hrs}時間${mins}分` : `${mins}分`}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase mb-2 flex items-center">
              <div className="w-8 h-[1px] bg-zinc-800 mr-2" />
              完了したタスク ({tasks.length})
            </h3>
            
            {tasks.length === 0 ? (
              <p className="text-center py-10 text-zinc-600 text-sm italic font-medium">この日の記録はありません</p>
            ) : (
              tasks.map((t, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 neu-flat rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-100 font-bold truncate text-sm">{t.text}</p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{t.timeSlot}</span>
                      {t.priority && (
                        <span className="text-[9px] font-black text-zinc-700 uppercase">・ {t.priority}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-10 py-4 neu-flat hover:neu-pressed text-zinc-500 hover:text-white rounded-2xl font-black text-sm tracking-widest uppercase transition-all"
          >
            閉じる
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
