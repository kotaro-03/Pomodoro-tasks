import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Brain, Clock, CalendarDays, 
  Trash2, ChevronRight, HelpCircle, Archive, ListTodo, Coffee
} from 'lucide-react';
import { 
  Task, Priority, TimeSlot, BreakSettings, BREAK_OPTIONS, 
  TASK_PLACEHOLDERS, getCurrentTimeSlot
} from './types';

interface InputViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  breakSettings: BreakSettings;
  setBreakSettings: React.Dispatch<React.SetStateAction<BreakSettings>>;
  onStartReview: () => void;
  onOpenHelp: () => void;
  activeDays: string[];
  workLog: Record<string, number[]>;
  onOpenHistory: (date: string) => void;
  quote: string;
}

export const InputView: React.FC<InputViewProps> = React.memo(({ 
  tasks, setTasks, breakSettings, setBreakSettings, 
  onStartReview, onOpenHelp, activeDays, onOpenHistory, quote 
}) => {
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState<Priority>('中');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(getCurrentTimeSlot());
  const [deadline, setDeadline] = useState('');
  const [showBacklog, setShowBacklog] = useState(false);

  const placeholder = useMemo(() => 
    TASK_PLACEHOLDERS[Math.floor(Math.random() * TASK_PLACEHOLDERS.length)], 
  []);

  const today = new Date().toISOString().split('T')[0];

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    setTasks(prev => [...prev, {
      id: Date.now().toString(),
      text: newTask.trim(),
      completed: false,
      priority,
      timeSlot,
      deadline: deadline || undefined,
      addedDate: today
    }]);
    
    setNewTask('');
    setDeadline('');
    setPriority('中');
    setTimeSlot(getCurrentTimeSlot());
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // ─── Filtering ───
  // Today's tasks: Added today OR incomplete with no deadline OR past deadline
  // Today's tasks: strictly non-completed tasks for today, or past/current deadline
  const todayTasks = useMemo(() => tasks.filter(t => {
    if (t.completed) return false;
    // Hide tasks with a FUTURE deadline, even if added today
    if (t.deadline && t.deadline > today) return false;
    // Show if added today OR if it has no deadline (backlogs always have deadlines in this flow)
    return t.addedDate === today || !t.deadline || t.deadline <= today;
  }), [tasks, today]);

  const backlogTasks = useMemo(() => tasks.filter(t => 
    !t.completed && t.addedDate !== today && t.deadline && t.deadline > today
  ), [tasks, today]);

  // Suggested task: Near deadline (3 days)
  const suggestion = useMemo(() => {
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    const limit = in3Days.toISOString().split('T')[0];
    
    return backlogTasks.find(t => t.deadline && t.deadline <= limit);
  }, [backlogTasks]);

  const approveSuggestion = (task: Task) => {
    // To ensure it's at the end, we mark it as added today and put it at the end of the tasks array
    setTasks(prev => {
      const filtered = prev.filter(t => t.id !== task.id);
      return [...filtered, { ...task, addedDate: today }];
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 items-start relative z-10 pt-10 px-4"
    >
      {/* ─── Left Side: Calendar & Suggestion ─── */}
      <div className="w-full lg:w-[40%] flex flex-col space-y-6">
        <div className="text-center lg:text-left">
          <motion.div 
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 8 }}
            className="inline-flex items-center justify-center p-5 neu-flat rounded-full mb-6"
          >
            <Brain className="w-10 h-10 text-indigo-400 animate-pulse-glow" />
          </motion.div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-white drop-shadow-md">今日は何に集中する？</h1>
          <button onClick={onOpenHelp} className="inline-flex items-center space-x-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-colors neu-flat px-3 py-1.5 rounded-full mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>ポモドーロとは？</span>
          </button>
          <p className="text-zinc-400 text-sm italic tracking-wide mt-2 min-h-[1.5em]">{quote}</p>
        </div>

        {/* Calendar (Mini) moves here */}
        <div className="neu-flat rounded-[2rem] p-6 relative overflow-hidden">
          <div className="flex items-center space-x-3 mb-4">
            <CalendarDays className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm tracking-widest text-zinc-400">ACTIVITIES</h3>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['日', '月', '火', '水', '木', '金', '土'].map(d => (
              <span key={d} className="text-[10px] text-zinc-600 font-bold">{d}</span>
            ))}
            {/* Simple dot grid for mini calendar */}
            {Array.from({ length: 28 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (27 - i));
              const dStr = d.toISOString().split('T')[0];
              const isActive = activeDays.includes(dStr);
              return (
                <div 
                  key={i} 
                  onClick={() => onOpenHistory(dStr)}
                  className={`aspect-square rounded-full flex items-center justify-center cursor-pointer transition-all ${
                    isActive ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-zinc-800/30'
                  } hover:scale-110`}
                >
                  {isActive && <div className="w-1 h-1 bg-white rounded-full" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Right Side: Task Entry & List ─── */}
      <div className="w-full lg:w-[60%] flex flex-col pt-2">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 neu-flat rounded-lg text-emerald-400">
              <ListTodo className="w-5 h-5" />
            </div>
            <span className="font-bold text-zinc-300">タスクを入力して下さい (優先度・期限・時間帯)</span>
          </div>
          <button 
            onClick={() => setShowBacklog(!showBacklog)}
            className={`p-2 rounded-xl transition-all ${showBacklog ? 'neu-pressed text-indigo-400' : 'neu-flat text-zinc-500 hover:text-white'}`}
            title="バックログ（未来のタスク）"
          >
            <Archive className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={addTask} className="space-y-4 mb-8">
          <div className="relative">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder={placeholder}
              className="w-full neu-inset rounded-2xl px-6 py-4 text-lg text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all font-medium"
            />
            <button
              type="submit"
              disabled={!newTask.trim()}
              className="absolute right-3 top-3 p-2.5 neu-flat text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-all rounded-xl active:scale-95"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Priority Selector */}
            <div className="flex neu-inset p-1.5 rounded-2xl">
              {(['高', '中', '低'] as Priority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    priority === p 
                      ? (p === '高' ? 'neu-urgent-pressed' : p === '中' ? 'neu-mid-pressed' : 'neu-low-pressed')
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Time Slot */}
            <div className="flex neu-inset p-1.5 rounded-2xl">
              {(['朝', '昼', '夜'] as TimeSlot[]).map(ts => (
                <button
                  key={ts}
                  type="button"
                  onClick={() => setTimeSlot(ts)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    timeSlot === ts ? 'neu-pressed text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {ts}
                </button>
              ))}
            </div>

            {/* Deadline */}
            <div className="relative">
              <input
                type="date"
                value={deadline}
                min={today}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full neu-inset bg-transparent rounded-2xl px-4 py-2.5 text-xs font-bold text-zinc-300 focus:outline-none"
              />
            </div>
          </div>
        </form>

        {/* Task List (Today or Backlog) */}
        <div className="space-y-3 min-h-[300px]">
          <h4 className="text-[10px] font-black text-zinc-600 tracking-[0.2em] mb-4 flex items-center">
            <div className="w-8 h-[1px] bg-zinc-800 mr-2" />
            {showBacklog ? 'BACKLOGタスク' : 'TODAYのタスク一覧'} ({showBacklog ? backlogTasks.length : todayTasks.length})
          </h4>
          
          <AnimatePresence mode="popLayout">
            {(showBacklog ? backlogTasks : todayTasks).map(t => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group flex items-center space-x-4 p-4 neu-flat rounded-2xl relative overflow-hidden"
              >
                <div className={`w-1 h-8 rounded-full ${
                  t.priority === '高' ? 'bg-rose-500' : t.priority === '中' ? 'bg-amber-400' : 'bg-teal-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-100 font-bold truncate">{t.text}</p>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase">{t.timeSlot}</span>
                    {t.deadline && (
                      <span className={`text-[10px] font-black ${t.deadline <= today ? 'text-rose-500' : 'text-zinc-600'}`}>
                         📅 {t.deadline === today ? '本日締切' : t.deadline}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => deleteTask(t.id)}
                  className="p-2 text-zinc-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {suggestion && !showBacklog && (
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="neu-flat rounded-2xl p-4 border border-indigo-500/20 bg-indigo-500/5 mt-6"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">Suggestion</span>
                <span className="text-[10px] text-zinc-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  締切が近いです
                </span>
              </div>
              <p className="text-sm font-bold text-white mb-3 leading-relaxed">
                「{suggestion.text}」を今日のリストに追加しますか？
              </p>
              <button 
                onClick={() => approveSuggestion(suggestion)}
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95"
              >
                今日のタスクに追加
              </button>
            </motion.div>
          )}

          {todayTasks.length > 0 && !showBacklog && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartReview}
              className="w-full mt-6 flex items-center justify-center space-x-2 py-5 px-6 neu-flat animate-button-glow text-indigo-400 rounded-3xl font-black text-lg tracking-widest uppercase transition-all"
            >
              <span>スケジュールを確認する</span>
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          )}

          {/* Break Settings (Inlined here) */}
          <div className="mt-8 neu-inset rounded-[2rem] p-6 border border-white/5">
             <h4 className="text-xs font-black text-zinc-500 mb-4 tracking-widest uppercase flex items-center">
               <Coffee className="w-4 h-4 mr-2 text-emerald-400" />
               休憩時間の設定
             </h4>
             <div className="grid grid-cols-3 gap-3">
               {[
                 { key: 'shortBreak' as const, label: '小休止', color: 'text-emerald-400' },
                 { key: 'midBreak' as const, label: '中休止', color: 'text-teal-400' },
                 { key: 'longBreak' as const, label: '長めの休憩', color: 'text-indigo-400' }
               ].map(({ key, label, color }) => (
                 <div key={key} className="flex flex-col space-y-2">
                   <span className={`text-[9px] font-black text-center ${color} tracking-tighter`}>{label}</span>
                   <select
                     value={breakSettings[key]}
                     onChange={(e) => setBreakSettings(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                     className="neu-inset bg-transparent rounded-xl py-2 text-center text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                   >
                     {BREAK_OPTIONS.map(m => <option key={m} value={m} className="bg-zinc-900">{m}分</option>)}
                   </select>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
