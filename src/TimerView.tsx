import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, ChevronLeft,
  Check, Timer, FastForward,
  Sparkles
} from 'lucide-react';
import { 
  Task, ModeId, POMODORO_SEQUENCE, Modes, 
  formatTime
} from './types';

interface TimerViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  mode: ModeId;
  timeLeft: number;
  isActive: boolean;
  onToggle: () => void;
  onReset: () => void;
  onBack: () => void;
  onComplete: (id: string) => void;
  onExtend: () => void;
  onSetContinue: () => void;
  sequenceIndex: number;
  MODES: Modes;
  isContinuing: boolean;
}

export const TimerView: React.FC<TimerViewProps> = React.memo(({ 
  tasks, mode, timeLeft, isActive, onToggle, onReset, 
  onBack, onComplete, onExtend, onSetContinue, sequenceIndex, MODES, isContinuing
}) => {
  const currentMode = MODES[mode];
  const CurrentIcon = currentMode.icon;
  
  const activeTasks = tasks.filter(t => !t.completed);
  const currentTask = activeTasks[0];

  // Progress Ring
  const radius = 160;
  const circumference = 2 * Math.PI * radius;
  const timeRatio = timeLeft / currentMode.time;
  const strokeDashoffset = circumference * (1 - timeRatio);

  // Upcoming Flow (next 8 items)
  const upcomingFlow = useMemo(() => {
    const flow: { type: 'work' | 'break'; task?: Task | null; mode: any }[] = [];
    let tempSeqIdx = sequenceIndex;
    let taskIdx = 0;
    
    for (let i = 0; i < 8; i++) {
        const m = POMODORO_SEQUENCE[tempSeqIdx % POMODORO_SEQUENCE.length];
        if (m === 'work') {
            const task = activeTasks[taskIdx];
            if (task) {
                // If the user marked to continue, the next work slot is also this task
                if (isContinuing && i > 0 && flow.some(f => f.type === 'work' && f.task?.id === task.id)) {
                   // This logic is slightly complex for a simple loop, 
                   // but basically we want to show the current task repeated if continuing.
                }
                flow.push({ type: 'work' as const, task, mode: MODES[m] });
                // Only increment task pointer if we are NOT continuing the current task in the next slot
                if (!(isContinuing && taskIdx === 0)) {
                  taskIdx++;
                }
            } else {
                flow.push({ type: 'work' as const, task: null, mode: MODES[m] });
            }
        } else {
            flow.push({ type: 'break' as const, mode: MODES[m] });
        }
        tempSeqIdx++;
    }
    return flow;
  }, [sequenceIndex, activeTasks, MODES, isContinuing]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 items-start relative z-10 pt-10 px-4"
    >
      {/* ─── Left Side: Timer ─── */}
      <div className="w-full lg:w-[45%] flex flex-col gap-8">
        <div className="flex items-center justify-between text-sm font-semibold mb-[-1rem]">
          <button 
            onClick={onBack}
            className="text-zinc-400 hover:text-white transition-colors flex items-center space-x-1 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>タスク一覧に戻る</span>
          </button>
          
          <div className="flex space-x-1">
            {POMODORO_SEQUENCE.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-500 ${
                  idx === sequenceIndex % POMODORO_SEQUENCE.length
                    ? `w-6 ${MODES[POMODORO_SEQUENCE[idx]].activeBtn.split(' ')[0]}` 
                    : idx < sequenceIndex % POMODORO_SEQUENCE.length ? 'w-2 bg-zinc-600' : 'w-2 bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current Task Status Card */}
        <div className="neu-flat rounded-[2rem] p-6 flex items-center space-x-5">
           <div className={`p-3 neu-inset rounded-xl ${currentMode.color}`}>
             <CurrentIcon className={`w-6 h-6 ${isActive ? 'animate-pulse-glow' : ''}`} />
           </div>
           <div className="flex-1 min-w-0">
             <p className="flex items-center space-x-2 mb-1">
               <span className="text-[10px] text-zinc-500 font-black tracking-widest uppercase">
                 {mode === 'work' ? 'Current Task' : 'Break Time'}
               </span>
               {isContinuing && mode === 'work' && (
                 <span className="text-[10px] font-black text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded-full border border-teal-400/20">
                   CONTINUING
                 </span>
               )}
             </p>
             <p className="text-zinc-100 font-bold truncate text-lg">
               {mode === 'work' ? (currentTask ? currentTask.text : 'No active task') : currentMode.label}
             </p>
           </div>
           {mode === 'work' && currentTask && (
             <div className="flex items-center space-x-2">
               <button
                 onClick={onSetContinue}
                 className={`p-2.5 rounded-xl transition-all ${isContinuing ? 'neu-pressed text-teal-400' : 'neu-flat text-zinc-500 hover:text-teal-400'}`}
                 title="次のフェーズでもこのタスクを続ける"
               >
                 <FastForward className="w-5 h-5" />
               </button>
               <button
                 onClick={() => onComplete(currentTask.id)}
                 className="p-3 neu-flat hover:neu-pressed text-zinc-400 hover:text-indigo-400 rounded-xl transition-all"
                 title="完了ボタン"
               >
                 <Check className="w-6 h-6" />
               </button>
             </div>
           )}
        </div>

        {/* The Big Timer Circle */}
        <div className="relative aspect-square w-full max-w-[400px] mx-auto group">
          <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <circle
              cx="200" cy="200" r={radius}
              stroke="currentColor" strokeWidth="8" fill="transparent"
              className="text-zinc-800/50"
            />
            <motion.circle
              cx="200" cy="200" r={radius}
              stroke="currentColor" strokeWidth="12" fill="transparent"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: "linear" }}
              strokeLinecap="round"
              className={`${currentMode.color} drop-shadow-[0_0_12px_currentColor]`}
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <motion.span 
              key={timeLeft}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-8xl font-black tracking-tighter text-white tabular-nums drop-shadow-2xl"
            >
              {formatTime(timeLeft)}
            </motion.span>
            <span className={`text-sm font-black tracking-[0.3em] uppercase mt-2 ${currentMode.color}`}>
              {currentMode.label}
            </span>
            
            <div className="flex items-center space-x-6 mt-8">
              <button onClick={onReset} className="p-4 neu-flat hover:neu-pressed text-zinc-500 hover:text-white rounded-2xl transition-all active:scale-95">
                <RotateCcw className="w-6 h-6" />
              </button>
              <button 
                onClick={onToggle} 
                className={`p-6 neu-flat hover:neu-pressed rounded-[2rem] transition-all active:scale-90 ${isActive ? 'text-zinc-400' : 'text-indigo-400 animate-button-glow'}`}
              >
                {isActive ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 fill-current" />}
              </button>
              <button onClick={onExtend} className="p-4 neu-flat hover:neu-pressed text-zinc-500 hover:text-amber-400 rounded-2xl transition-all active:scale-95">
                <Timer className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Side: Task Flow ─── */}
      <div className="w-full lg:w-[55%] flex flex-col gap-6">
        <div className="neu-flat rounded-[2.5rem] p-8 min-h-[500px] flex flex-col relative overflow-hidden h-full">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
           
           <div className="flex items-center justify-between mb-8 relative z-10">
             <div className="flex items-center space-x-3">
                <div className="p-2.5 neu-inset rounded-xl text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-white italic tracking-tight">Today's Flow</h3>
             </div>
             <div className="text-[10px] font-black text-zinc-500 tracking-widest uppercase bg-zinc-800/50 px-3 py-1.5 rounded-full">
               Next 8 Steps
             </div>
           </div>

           <div className="space-y-4 relative z-10 flex-1">
             <AnimatePresence mode="popLayout">
               {upcomingFlow.map((item, idx) => (
                 <motion.div
                   key={idx}
                   layout
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: idx * 0.05 }}
                   className={`flex items-center space-x-4 p-4 rounded-2xl border transition-all ${
                     idx === 0 
                       ? `neu-pressed ${item.mode.border} scale-[1.02] shadow-[0_0_20px_rgba(99,102,241,0.1)]` 
                       : 'neu-flat border-transparent opacity-60'
                   }`}
                 >
                   <div className={`p-2.5 rounded-xl neu-inset ${item.mode.color}`}>
                     <item.mode.icon className="w-4 h-4" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between">
                       <p className={`font-black text-sm tracking-tight ${idx === 0 ? 'text-zinc-100' : 'text-zinc-500'}`}>
                         {item.type === 'work' ? (item.task?.text || 'No task') : item.mode.label}
                       </p>
                       <span className={`text-[10px] font-black ${item.mode.color}`}>
                         {Math.floor(item.mode.time / 60)} min
                       </span>
                     </div>
                     {item.type === 'work' && (
                       <div className="flex items-center space-x-2 mt-1">
                         <div className={`w-1 h-3 rounded-full ${item.task?.priority === '高' ? 'bg-rose-500' : item.task?.priority === '中' ? 'bg-amber-400' : 'bg-teal-500'}`} />
                         <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                           {item.task?.priority || 'N/A'} Priority
                         </span>
                       </div>
                     )}
                   </div>
                 </motion.div>
               ))}
             </AnimatePresence>
           </div>
           
           <div className="mt-8 p-6 neu-inset rounded-3xl bg-indigo-500/[0.02] relative z-10">
              <p className="text-xs font-bold text-zinc-400 text-center italic">
                {mode === 'work' 
                  ? "「集中は力なり。」残りの時間を一歩ずつ大切に進めましょう。" 
                  : "「休憩は次の集中のための準備。」しっかり脳を休めてください。"}
              </p>
           </div>
        </div>
      </div>
    </motion.div>
  );
});
