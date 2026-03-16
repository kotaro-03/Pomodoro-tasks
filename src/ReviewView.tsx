import React from 'react';
import { motion, Reorder } from 'framer-motion';
import { 
  GripVertical, Play, ChevronLeft, 
  Sparkles, Clock, Calendar
} from 'lucide-react';
import { Task } from './types';

interface ReviewViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onBack: () => void;
  onStart: () => void;
}

export const ReviewView: React.FC<ReviewViewProps> = React.memo(({ 
  tasks, setTasks, onBack, onStart 
}) => {
  // We only reorder tasks that are part of today's plan
  // (In this refactored flow, App.tsx should pass the filtered 'today' tasks here)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto pt-10 px-4 flex flex-col items-center"
    >
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-4 neu-flat rounded-2xl mb-4 text-emerald-400">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">スケジュールを確認</h2>
        <p className="text-zinc-500 text-sm font-medium">ドラッグして実行順序を最終調整してください</p>
      </div>

      <Reorder.Group 
        axis="y" 
        values={tasks} 
        onReorder={setTasks}
        className="w-full space-y-4 mb-10"
      >
        {tasks.map((task) => (
          <Reorder.Item
            key={task.id}
            value={task}
            className="group relative"
          >
            <motion.div
              whileDrag={{ 
                scale: 1.05, 
                boxShadow: "0 0 30px rgba(139, 92, 241, 0.4)",
                borderColor: "rgba(139, 92, 241, 0.4)" 
              }}
              className="flex items-center space-x-4 p-5 neu-flat rounded-2xl border border-transparent transition-colors group-active:cursor-grabbing"
            >
              <div className="cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-400 transition-colors p-1">
                <GripVertical className="w-5 h-5" />
              </div>

              <div className={`w-1 h-6 rounded-full shrink-0 ${
                task.priority === '高' ? 'bg-rose-500' : 
                task.priority === '中' ? 'bg-amber-400' : 'bg-teal-500'
              }`} />

              <div className="flex-1 min-w-0">
                <p className="text-zinc-100 font-bold truncate">{task.text}</p>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-[9px] font-black text-zinc-500 tracking-widest uppercase flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {task.timeSlot}
                  </span>
                  {task.deadline && (
                    <span className="text-[9px] font-black text-zinc-600 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {task.deadline}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[10px] font-black text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded-lg uppercase tracking-tighter">
                {task.priority}
              </div>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <div className="flex space-x-4 w-full">
        <button
          onClick={onBack}
          className="flex-1 py-4 neu-flat text-zinc-500 hover:text-white rounded-2xl font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center space-x-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>戻る</span>
        </button>
        <button
          onClick={onStart}
          className="flex-[2] py-4 neu-flat animate-button-glow text-emerald-400 rounded-2xl font-black text-lg tracking-[0.2em] uppercase transition-all flex items-center justify-center space-x-3"
        >
          <Play className="w-5 h-5" />
          <span>作業を開始する</span>
        </button>
      </div>
      
      <p className="mt-8 text-[10px] text-zinc-600 font-bold text-center leading-relaxed">
        ※ 「作業を開始する」を押すと、ポモドーロタイマーが起動します。<br/>
        並び替えた順序で自動的にタスクが割り当てられます。
      </p>
    </motion.div>
  );
});
