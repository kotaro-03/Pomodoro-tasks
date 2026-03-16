import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, Plus, Trash2, 
  Check, Brain, Coffee, BatteryCharging, 
  ListTodo, ChevronRight, GripVertical, Sparkles, CalendarDays,
  HelpCircle, Clock, Timer, BarChart3, FastForward
} from 'lucide-react';

const MOTIVATIONAL_QUOTES = [
  "「進み続けよ。決して立ち止まってはならない。」- スティーブ・ジョブズ",
  "「失敗は、より賢く再挑戦するための良い機会である。」- ヘンリー・フォード",
  "「未来を予測する最良の方法は、それを発明することだ。」- アラン・ケイ",
  "「小さいことを重ねることが、とんでもないところに行くただひとつの道だ。」- イチロー",
  "「私は失敗したことがない。ただ、1万通りのうまく行かない方法を見つけただけだ。」- トーマス・エジソン",
  "「行動を起こさなければ、何も始まらない。」- アインシュタイン",
  "「準備しておこう。チャンスはいつか訪れるものだ。」- エイブラハム・リンカーン",
  "「どんなに暗くても、星は輝いている。」- ラルフ・ワルド・エマーソン",
  "「成功とは、失敗から失敗へと情熱を失わずに進むことである。」- ウィンストン・チャーチル",
  "「今日逃げたら、明日はもっと逃げたくなる。」- ゲーテ",
  "「限界を決めるのは、いつも自分の思い込みだ。」- 盛田昭夫",
  "「できると思えばできる、できないと思えばできない。どちらも絶対に正しい。」- ヘンリー・フォード",
  "「夢を見るから、人生は輝く。」- モーツァルト",
  "「何かを始めるのに、完璧である必要はない。」- ジグ・ジグラー",
  "「人生とは、今日一日のことである。」- カーネギー"
];

// Define the extended Pomodoro sequence (2 cycles)
// Cycle 1: work, shortBreak, work, shortBreak, work, midBreak
// Cycle 2: work, shortBreak, work, shortBreak, work, longBreak
const POMODORO_SEQUENCE = [
  'work', 'shortBreak', 'work', 'shortBreak', 'work', 'midBreak',
  'work', 'shortBreak', 'work', 'shortBreak', 'work', 'longBreak'
] as const;

type ModeId = 'work' | 'shortBreak' | 'midBreak' | 'longBreak';

const BREAK_OPTIONS = [5, 10, 15, 20, 25, 30]; // minutes

type BreakSettings = {
  shortBreak: number; // minutes
  midBreak: number;
  longBreak: number;
};

const DEFAULT_BREAK_SETTINGS: BreakSettings = {
  shortBreak: 5,
  midBreak: 15,
  longBreak: 25,
};

function buildModes(bs: BreakSettings) {
  return {
    work: { 
      id: 'work' as const,
      label: '集中', 
      time: 25 * 60, 
      icon: Brain, 
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10', 
      border: 'border-indigo-500/20',
      activeBtn: 'bg-indigo-500 hover:bg-indigo-600'
    },
    shortBreak: { 
      id: 'shortBreak' as const,
      label: '小休止', 
      time: bs.shortBreak * 60, 
      icon: Coffee, 
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10', 
      border: 'border-emerald-500/20',
      activeBtn: 'bg-emerald-500 hover:bg-emerald-600'
    },
    midBreak: {
      id: 'midBreak' as const,
      label: '中休止',
      time: bs.midBreak * 60,
      icon: Coffee,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      activeBtn: 'bg-teal-500 hover:bg-teal-600'
    },
    longBreak: { 
      id: 'longBreak' as const,
      label: '長めの休憩', 
      time: bs.longBreak * 60, 
      icon: BatteryCharging, 
      color: 'text-blue-400',
      bg: 'bg-blue-500/10', 
      border: 'border-blue-500/20',
      activeBtn: 'bg-blue-500 hover:bg-blue-600'
    }
  };
}

type TimeSlot = '朝' | '昼' | '夜';

function getCurrentTimeSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return '朝';
  if (h >= 10 && h < 18) return '昼';
  return '夜';
}

type Priority = '高' | '中' | '低';

type Task = {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  timeSlot: TimeSlot;
  addedDate?: string;
};

type WorkLog = Record<string, number[]>; // date -> 24 element array (seconds per hour)

const LS_KEYS = {
  tasks: 'pomodoro_tasks',
  lastDate: 'pomodoro_lastDate',
  history: 'pomodoro_history',
  activeDays: 'harmonicRadiation_activeDays',
  breakSettings: 'pomodoro_breakSettings',
  workLog: 'pomodoro_workLog',
};

type TaskHistory = Record<string, Task[]>;

function loadFromLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

// Reliable notification: always plays a beep tone + browser notification
function sendNotification(title: string, body: string) {
  // Browser Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
  // Audio beep as fallback (works even if notifications are blocked)
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 500);
  } catch { /* AudioContext not supported */ }
}

export default function PomodoroApp() {
  // Application State: 'planning' (entering tasks) | 'running' (timer active)
  const [appState, setAppState] = useState<'planning' | 'running'>('planning');
  
  // Break Settings State
  const [breakSettings, setBreakSettings] = useState<BreakSettings>(() =>
    loadFromLS<BreakSettings>(LS_KEYS.breakSettings, DEFAULT_BREAK_SETTINGS)
  );
  const MODES = buildModes(breakSettings);

  // Timer State
  const [timeLeft, setTimeLeft] = useState(MODES['work'].time);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<ModeId>('work');
  const [sequenceIndex, setSequenceIndex] = useState(0);
  
  // Tasks State – initialized from localStorage with date rollover
  const [tasks, setTasks] = useState<Task[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = loadFromLS<string>(LS_KEYS.lastDate, today);
    const savedTasks = loadFromLS<Task[]>(LS_KEYS.tasks, []);
    const savedHistory = loadFromLS<TaskHistory>(LS_KEYS.history, {});

    if (lastDate !== today && savedTasks.length > 0) {
      // Archive completed tasks for lastDate
      const completedYesterday = savedTasks.filter(t => t.completed);
      if (completedYesterday.length > 0) {
        const updatedHistory = { ...savedHistory, [lastDate]: completedYesterday };
        localStorage.setItem(LS_KEYS.history, JSON.stringify(updatedHistory));
      }
      // Carry over incomplete tasks (reset any extra state if needed)
      const carryOver = savedTasks.filter(t => !t.completed);
      localStorage.setItem(LS_KEYS.lastDate, today);
      localStorage.setItem(LS_KEYS.tasks, JSON.stringify(carryOver));
      return carryOver;
    }

    // Same day or first run — just restore tasks as-is
    localStorage.setItem(LS_KEYS.lastDate, today);
    return savedTasks;
  });

  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('中');
  const [newTaskTimeSlot, setNewTaskTimeSlot] = useState<TimeSlot>(getCurrentTimeSlot());

  // Work Log State (tracks seconds worked per hour per day)
  const [workLog, setWorkLog] = useState<WorkLog>(() =>
    loadFromLS<WorkLog>(LS_KEYS.workLog, {})
  );

  // UI State
  const [quote, setQuote] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Decomposition Modal State
  const [decomposeTarget, setDecomposeTarget] = useState<Task | null>(null);
  const [decomposeParts, setDecomposeParts] = useState(2);
  const [decomposeNames, setDecomposeNames] = useState<string[]>([]);

  // History Modal State
  const [historyModalDate, setHistoryModalDate] = useState<string | null>(null);
  const [taskHistory, setTaskHistory] = useState<TaskHistory>(() =>
    loadFromLS<TaskHistory>(LS_KEYS.history, {})
  );

  // Calendar State
  const [activeDays, setActiveDays] = useState<string[]>(() =>
    loadFromLS<string[]>(LS_KEYS.activeDays, [])
  );

  // Persist tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LS_KEYS.tasks, JSON.stringify(tasks));
  }, [tasks]);

  // Persist activeDays
  useEffect(() => {
    localStorage.setItem(LS_KEYS.activeDays, JSON.stringify(activeDays));
  }, [activeDays]);

  // Persist taskHistory
  useEffect(() => {
    localStorage.setItem(LS_KEYS.history, JSON.stringify(taskHistory));
  }, [taskHistory]);

  // Persist breakSettings
  useEffect(() => {
    localStorage.setItem(LS_KEYS.breakSettings, JSON.stringify(breakSettings));
  }, [breakSettings]);

  // Persist workLog
  useEffect(() => {
    localStorage.setItem(LS_KEYS.workLog, JSON.stringify(workLog));
  }, [workLog]);

  // Track work time: log 1 second per tick when in work mode
  useEffect(() => {
    if (!isActive || mode !== 'work') return;
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    setWorkLog(prev => {
      const dayLog = prev[today] ? [...prev[today]] : new Array(24).fill(0);
      dayLog[hour] = (dayLog[hour] || 0) + 1;
      return { ...prev, [today]: dayLog };
    });
  }, [timeLeft, isActive, mode]); // fires every second the timer ticks

  const archiveTodayCompleted = () => {
    const today = new Date().toISOString().split('T')[0];
    const completed = tasks.filter(t => t.completed);
    if (completed.length > 0) {
      setTaskHistory(prev => ({ ...prev, [today]: [...(prev[today] ?? []), ...completed.filter(c => !(prev[today] ?? []).find(h => h.id === c.id))] }));
    }
  };

  const logDate = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setActiveDays(prev => prev.includes(todayStr) ? prev : [...prev, todayStr]);
  };

  useEffect(() => {
    // Pick a random quote on mount
    setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

    // Request Notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);



  // Update document title
  useEffect(() => {
    document.title = `${formatTime(timeLeft)} - ${MODES[mode].label}`;
  }, [timeLeft, mode]);

  // Timer Tick & Auto-Advance Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft <= 0 && isActive) {
      // Timer finished! Auto-advance to next block in the sequence
      const nextIndex = (sequenceIndex + 1) % POMODORO_SEQUENCE.length;
      const nextModeId = POMODORO_SEQUENCE[nextIndex];
      
      setSequenceIndex(nextIndex);
      setMode(nextModeId); // Update mode state
      setTimeLeft(MODES[nextModeId].time);
      setIsActive(true); // Automatically start the next block
      
      // Send Notification for new block
      sendNotification('Pomodoro Update', `次のフェーズが始まりました: ${MODES[nextModeId].label}`);
    }
    
    return () => clearInterval(interval);
  }, [isActive, timeLeft, sequenceIndex, mode]); // Added mode to dependencies

  const toggleTimer = () => {
    const nextActive = !isActive;
    setIsActive(nextActive);

    // Notification on manual toggle
    if (nextActive) {
      sendNotification('Pomodoro Started', `${MODES[mode].label} のタイマーを開始しました。`);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode].time);
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setTasks([...tasks, { 
      id: Date.now().toString(), 
      text: newTask.trim(), 
      completed: false,
      priority: newTaskPriority,
      timeSlot: newTaskTimeSlot
    }]);
    setNewTask('');
    setNewTaskPriority('中');
    setNewTaskTimeSlot(getCurrentTimeSlot());
    logDate();
  };

  const toggleTask = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completeCurrentActiveTask = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // mark task completed and archive it to today's history
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
    archiveTodayCompleted();
    logDate();

    // advance to break
    const isNextBreak = POMODORO_SEQUENCE[(sequenceIndex + 1) % POMODORO_SEQUENCE.length] !== 'work';
    let nextIndex = sequenceIndex;
    if (isNextBreak) {
       nextIndex = (sequenceIndex + 1) % POMODORO_SEQUENCE.length;
    } else {
       // Find next break manually if not directly next
       const nextBreakIdx = POMODORO_SEQUENCE.findIndex((m, i) => i > sequenceIndex && m !== 'work');
       nextIndex = nextBreakIdx !== -1 ? nextBreakIdx : 1; 
    }
    
    const nextModeId = POMODORO_SEQUENCE[nextIndex];
    setSequenceIndex(nextIndex);
    setMode(nextModeId); // Update mode state
    setTimeLeft(MODES[nextModeId].time);
    setIsActive(true);
    
    sendNotification('Task Completed 🎉', `お疲れ様でした！${MODES[nextModeId].label}に入ります。`);
  };

  // Continue same task in next work phase (skip to break, then resume same task)
  const continueTaskNextPhase = useCallback(() => {
    // advance to next break, but don't mark task as completed
    const nextIndex = (sequenceIndex + 1) % POMODORO_SEQUENCE.length;
    const nextModeId = POMODORO_SEQUENCE[nextIndex];
    setSequenceIndex(nextIndex);
    setMode(nextModeId);
    setTimeLeft(MODES[nextModeId].time);
    setIsActive(true);
    sendNotification('タスク継続', '休憩後に同じタスクを続けます。');
  }, [sequenceIndex, MODES]);

  // Extend current timer by 5 minutes
  const extendTimer = useCallback(() => {
    setTimeLeft(prev => prev + 5 * 60);
  }, []);

  const deleteTask = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTasks(tasks.filter(t => t.id !== id));
  };

  const openDecomposeModal = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setDecomposeTarget(task);
    setDecomposeParts(2);
    setDecomposeNames([`${task.text} (1)`, `${task.text} (2)`]);
  };

  const handlePartsChange = (val: number) => {
    const parts = Math.max(2, Math.min(10, val));
    setDecomposeParts(parts);
    const newNames = [];
    for(let i=1; i<=parts; i++) {
       newNames.push(`${decomposeTarget?.text} (${i})`);
    }
    setDecomposeNames(newNames);
  };

  const handleNameChange = (index: number, val: string) => {
    const newNames = [...decomposeNames];
    newNames[index] = val;
    setDecomposeNames(newNames);
  };

  const confirmDecompose = () => {
    if (!decomposeTarget) return;
    
    const subTasks: Task[] = decomposeNames.map((name, i) => ({
      id: Date.now().toString() + '-' + i,
      text: name + ' [25分]',
      completed: false,
      priority: decomposeTarget.priority,
      timeSlot: decomposeTarget.timeSlot
    }));

    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === decomposeTarget.id);
      if (taskIndex === -1) return prev;
      const newTasks = [...prev];
      newTasks.splice(taskIndex, 1, ...subTasks);
      return newTasks;
    });

    setDecomposeTarget(null);

    sendNotification('タスクを分解しました ✨', `「${decomposeTarget.text}」を${decomposeParts}個のタスクに分解しました。`);
  };

  const startSession = () => {
    if (tasks.length === 0) return;
    
    // Sort tasks: current timeSlot first, then by Priority
    const priorityWeight = { '高': 3, '中': 2, '低': 1 };
    const slotWeight: Record<TimeSlot, number> = { '朝': 0, '昼': 0, '夜': 0 };
    slotWeight[getCurrentTimeSlot()] = 10; // boost current slot
    
    setTasks(prev => {
      return [...prev].sort((a, b) => {
        const slotDiff = (slotWeight[b.timeSlot] || 0) - (slotWeight[a.timeSlot] || 0);
        if (slotDiff !== 0) return slotDiff;
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      });
    });
    
    // Start the first block (always 'work')
    setSequenceIndex(0);
    setMode('work'); // Set mode explicitly
    setTimeLeft(MODES['work'].time);
    setIsActive(true); // Automatically start the flow
    setAppState('running');
  };

  const returnToPlanning = () => {
    setAppState('planning');
    setIsActive(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Get active (incomplete) tasks
  const activeTasks = tasks.filter(t => !t.completed);
  const currentActiveTask = activeTasks.length > 0 ? activeTasks[0] : null;

  const currentMode = MODES[mode];
  const CurrentIcon = currentMode.icon;
  
  // Progress Ring Calculations
  const radius = 160;
  const circumference = 2 * Math.PI * radius;
  const timeRatio = timeLeft / currentMode.time;
  const strokeDashoffset = circumference * (1 - timeRatio);

  const isBreak = appState === 'running' && mode !== 'work';
  const bgClass = isBreak ? 'bg-[#061c17]' : 'bg-[#15171c]';

  return (
    <div className={`min-h-screen relative flex items-center justify-center p-4 sm:p-8 font-sans selection:bg-zinc-800 xl:overflow-hidden overflow-x-hidden text-zinc-100 transition-colors duration-1000 ${bgClass}`}>
      
      {/* --- BACKGROUND GLOWS --- */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-30"
        style={{
          background: `radial-gradient(1000px circle at 50% 50%, rgba(255,255,255,0.05), transparent 60%)`
        }}
      />

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <div className={`organic-curve absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] transition-colors duration-1000 ${isBreak ? 'bg-[radial-gradient(circle,rgba(5,150,105,0.4)_0%,transparent_70%)]' : 'bg-[radial-gradient(circle,rgba(79,70,229,0.4)_0%,transparent_70%)]'}`} />
        <div className={`organic-curve absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] transition-colors duration-1000 ${isBreak ? 'bg-[radial-gradient(circle,rgba(13,148,136,0.3)_0%,transparent_70%)]' : 'bg-[radial-gradient(circle,rgba(124,58,237,0.3)_0%,transparent_70%)]'}`} style={{ animationDelay: '-4s' }} />
        <div className={`organic-curve absolute -bottom-[20%] left-[20%] w-[70vw] h-[50vw] transition-colors duration-1000 ${isBreak ? 'bg-[radial-gradient(circle,rgba(22,163,74,0.3)_0%,transparent_70%)]' : 'bg-[radial-gradient(circle,rgba(192,38,211,0.3)_0%,transparent_70%)]'}`} style={{ animationDelay: '-2s' }} />
      </div>

      <AnimatePresence mode="wait">
        
        {/* --- PLANNING SCREEN --- */}
        {appState === 'planning' && (
          <motion.div 
            key="planning"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 items-start relative z-10 pt-10"
          >
            {/* --- LEFT SIDE: HEADER & CALENDAR --- */}
            <div className="w-full lg:w-[40%] flex flex-col space-y-8">
              <div className="text-center lg:text-left">
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center justify-center p-5 neu-flat rounded-full mb-6"
                >
                  <Brain className="w-10 h-10 text-indigo-400 animate-pulse-glow" />
                </motion.div>
                <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-white drop-shadow-md">集中するタスクは？</h1>
                <button onClick={() => setShowHelp(true)} className="inline-flex items-center space-x-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-colors neu-flat px-3 py-1.5 rounded-full mb-2">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>ポモドーロテクニックとは？</span>
                </button>
                <p className="text-zinc-400 text-sm italic tracking-wide mt-2">{quote}</p>
              </div>

            {/* --- CALENDAR --- */}
            {(() => {
              const today = new Date();
              const year = today.getFullYear();
              const month = today.getMonth();
              const currentStr = today.toISOString().split('T')[0];
              
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const firstDayOfMonth = new Date(year, month, 1).getDay();
              const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
              
              const days = [];
              for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
              for (let i = 1; i <= daysInMonth; i++) days.push(i);

              const dateFormatted = `${year}年${month + 1}月${today.getDate()}日 (${weekdays[today.getDay()]})`;

              return (
                <div className="neu-flat rounded-[2rem] p-6 mb-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 neu-inset rounded-lg text-indigo-400">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 font-bold tracking-wider">今日🗓️</p>
                        <h3 className="text-md font-bold text-zinc-100">{dateFormatted}</h3>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs relative z-10">
                    {weekdays.map(wd => (
                      <div key={wd} className="text-zinc-500 font-bold py-1">{wd}</div>
                    ))}
                    {days.map((day, idx) => {
                       if (!day) return <div key={`empty-${idx}`} />;
                       const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                       const isActiveDay = activeDays.includes(dateStr);
                       const isToday = dateStr === currentStr;
                       const hasHistory = !!taskHistory[dateStr]?.length;
                       return (
                         <div
                           key={day}
                           onClick={() => hasHistory ? setHistoryModalDate(dateStr) : undefined}
                           className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border border-transparent transition-all ${
                             isToday ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                             hasHistory ? 'neu-inset text-amber-400 cursor-pointer hover:border-amber-500/40' :
                             isActiveDay ? 'neu-inset text-amber-400' : 'text-zinc-400 opacity-50'
                           } ${isActiveDay || isToday ? 'font-bold' : ''}`}
                         >
                           <span className={`${isToday ? 'scale-110 drop-shadow-md' : ''}`}>{day}</span>
                           {hasHistory && !isToday && <Check className="w-3 h-3 mt-0.5 opacity-80" />}
                           {isToday && isActiveDay && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 shadow-[0_0_5px_rgba(129,140,248,0.8)]" />}
                         </div>
                       );
                     })}
                  </div>
                </div>
              );
            })()}
            </div>

            {/* --- RIGHT SIDE: TASK INPUT & LIST --- */}
            <div className="w-full lg:w-[60%] neu-flat rounded-[2.5rem] p-6 sm:p-8">
              <form onSubmit={addTask} className="relative mb-8 flex flex-col space-y-5">
                <div className="relative">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="例: 企画書を作成する..."
                    autoFocus
                    className="w-full neu-inset rounded-2xl px-6 py-5 pr-16 text-lg tracking-wide text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-all font-medium border border-transparent focus:border-indigo-500/30"
                  />
                  <button
                    type="submit"
                    disabled={!newTask.trim()}
                    className="absolute right-3 top-3 p-3 neu-flat text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl active:neu-pressed"
                  >
                    <Plus className="w-5 h-5 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  </button>
                </div>
                
                {/* Priority Selector */}
                <div className="flex items-center space-x-3 w-full neu-inset p-2 rounded-2xl">
                  {(['高', '中', '低'] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTaskPriority(p)}
                      className={`flex-1 py-3 px-3 text-sm font-bold rounded-xl transition-all duration-500 ease-out transform ${
                         newTaskPriority === p 
                          ? (p === '高' ? 'neu-urgent-pressed scale-[0.98]' : 
                             p === '中' ? 'neu-mid-pressed scale-[0.98]' : 
                                          'neu-low-pressed scale-[0.98]')
                          : 'neu-flat text-zinc-500 hover:text-zinc-300 hover:-translate-y-0.5'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Time Slot Selector */}
                <div className="flex items-center space-x-3 w-full neu-inset p-2 rounded-2xl">
                  {(['朝', '昼', '夜'] as TimeSlot[]).map((ts) => (
                    <button
                      key={ts}
                      type="button"
                      onClick={() => setNewTaskTimeSlot(ts)}
                      className={`flex-1 py-2.5 px-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-1.5 ${
                        newTaskTimeSlot === ts
                          ? 'neu-pressed text-amber-400'
                          : 'neu-flat text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{ts} {ts === '朝' ? '(6-10時)' : ts === '昼' ? '(10-18時)' : '(18-6時)'}</span>
                    </button>
                  ))}
                </div>
              </form>

              <div className="space-y-3 min-h-[200px] max-h-[400px] overflow-y-auto pr-2 custom-scrollbar -mr-2 mb-8">
                <AnimatePresence mode="popLayout">
                  {tasks.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center h-full py-12 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-2xl"
                    >
                      <ListTodo className="w-8 h-8 mb-4 opacity-50 text-zinc-400" />
                      <p className="text-sm font-medium text-zinc-400">まずはタスクを1つ以上追加してください。</p>
                    </motion.div>
                  ) : (
                    tasks.map((task) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={task.id}
                        className={`group flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                          task.completed 
                            ? 'neu-pressed opacity-50' 
                            : 'neu-flat hover:-translate-y-1'
                        }`}
                      >
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100" />
                          <button
                            type="button"
                            onClick={() => toggleTask(task.id)}
                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                              task.completed ? 'neu-inset text-indigo-500' : 'neu-inset hover:shadow-none'
                            }`}
                          >
                            <Check className={`w-3.5 h-3.5 stroke-[3] transition-transform ${task.completed ? 'scale-100' : 'scale-0'}`} />
                          </button>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-base font-medium truncate transition-all duration-300 ${
                              task.completed ? 'text-zinc-600 line-through' : 'text-zinc-200'
                            }`}>
                              {task.text}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              task.priority === '高' ? 'text-rose-500' : 
                              task.priority === '中' ? 'text-indigo-400' : 'text-zinc-500'
                            }`}>
                              優先度: {task.priority}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => openDecomposeModal(task, e)}
                            className="p-2 text-zinc-500 hover:text-amber-400 transition-colors"
                            title="タスクを25分単位に分解する"
                          >
                            <Sparkles className="w-5 h-5 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
                          </button>
                          <button
                            onClick={(e) => deleteTask(task.id, e)}
                            className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              {/* --- BREAK SETTINGS --- */}
              <div className="neu-inset rounded-2xl p-5 mb-6">
                <h4 className="text-sm font-bold text-zinc-400 mb-4 flex items-center">
                  <Coffee className="w-4 h-4 mr-2 text-emerald-400" />
                  休憩時間の設定
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: 'shortBreak' as const, label: '小休止', color: 'text-emerald-400' },
                    { key: 'midBreak' as const, label: '中休止', color: 'text-teal-400' },
                    { key: 'longBreak' as const, label: '長めの休憩', color: 'text-blue-400' },
                  ]).map(({ key, label, color }) => (
                    <div key={key} className="flex flex-col items-center space-y-2">
                      <span className={`text-xs font-bold ${color}`}>{label}</span>
                      <div className="flex items-center space-x-2">
                        <select
                          value={breakSettings[key]}
                          onChange={(e) => setBreakSettings(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                          className="neu-inset rounded-xl px-3 py-2 bg-transparent text-white text-sm font-bold outline-none cursor-pointer appearance-none text-center w-20"
                        >
                          {BREAK_OPTIONS.map(m => (
                            <option key={m} value={m} className="bg-zinc-800 text-white">{m}分</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startSession}
                disabled={tasks.length === 0}
                className="w-full flex items-center justify-center space-x-2 py-5 px-6 neu-flat animate-button-glow text-indigo-400 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span className="drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">自動スケジュールを開始</span>
                <ChevronRight className="w-5 h-5 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              </motion.button>
              
              <p className="text-center text-zinc-500 text-xs mt-6 font-medium px-4">
                タスクは現在の時間帯を優先し、次に優先度順（高 {'>'} 中 {'>'} 低）に並びます。<br/>
                <span className="text-zinc-600 inline-flex items-center mt-2 italic">
                  <Sparkles className="w-3 h-3 mr-1" />
                  タスクが重いと感じた時は、リスト右側の✨アイコンから「25分単位の小タスク」に手動分解できます。
                </span>
              </p>
            </div>
          </motion.div>
        )}

        {/* --- RUNNING SCREEN --- */}
        {appState === 'running' && (
          <motion.div 
            key="running"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 items-start relative z-10 pt-10"
          >
            {/* --- LEFT SIDE: TIMER --- */}
            <div className="w-full lg:w-[45%] flex flex-col gap-8">
              {/* Cycle Progress Indicator header */}
              <div className="flex items-center justify-between text-sm font-semibold mb-[-1rem]">
                <button 
                  onClick={returnToPlanning}
                  className="text-zinc-400 hover:text-white transition-colors flex items-center space-x-1 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span>タスクの編集に戻る</span>
                </button>
                <div className="flex space-x-1.5">
                  {POMODORO_SEQUENCE.map((seqMode, idx) => (
                    <div 
                      key={idx} 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        idx === sequenceIndex 
                          ? `w-6 ${MODES[seqMode].activeBtn.split(' ')[0]}` 
                          : idx < sequenceIndex 
                            ? 'w-2 bg-zinc-600' 
                            : 'w-2 bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="neu-flat rounded-[2rem] p-6 flex items-center space-x-5">
                 {mode === 'work' ? (
                   <>
                     <div className="p-3 neu-inset text-indigo-400 rounded-xl">
                       <Brain className="w-6 h-6 animate-pulse-glow" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="flex items-center space-x-2 mb-1">
                         <span className="text-xs text-zinc-500 font-bold tracking-wider">現在のタスク</span>
                         {currentActiveTask && (
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full neu-inset ${
                             currentActiveTask.priority === '高' ? 'text-rose-500' : 
                             currentActiveTask.priority === '中' ? 'text-indigo-400' : 'text-zinc-400'
                           }`}>
                             {currentActiveTask.priority}
                           </span>
                         )}
                       </p>
                       <p className="text-zinc-100 font-bold truncate text-lg">
                         {currentActiveTask ? currentActiveTask.text : "すべてのタスクが完了しました！🎉"}
                       </p>
                      </div>
                      {currentActiveTask && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={extendTimer}
                            className="p-2.5 neu-flat hover:neu-pressed text-zinc-400 hover:text-amber-400 rounded-xl transition-all"
                            title="タイマーを5分延長"
                          >
                            <Timer className="w-4 h-4" />
                            <span className="text-[9px] block font-bold mt-0.5">+5分</span>
                          </button>
                          <button
                            onClick={continueTaskNextPhase}
                            className="p-2.5 neu-flat hover:neu-pressed text-zinc-400 hover:text-teal-400 rounded-xl transition-all"
                            title="次のフェーズでもこのタスクを続ける"
                          >
                            <FastForward className="w-4 h-4" />
                            <span className="text-[9px] block font-bold mt-0.5">継続</span>
                          </button>
                          <button
                            onClick={() => completeCurrentActiveTask(currentActiveTask.id)}
                            className="p-3 neu-flat hover:neu-pressed text-zinc-400 hover:text-indigo-400 rounded-xl transition-all"
                            title="現在のタスクを完了にする"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                   </>
                 ) : (
                   <>
                     <div className={`p-3 rounded-xl neu-inset ${currentMode.color}`}>
                       <CurrentIcon className="w-6 h-6" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${currentMode.color}`}>
                         休憩時間
                       </p>
                       <p className="text-zinc-100 font-bold truncate text-lg">
                         {`${Math.floor(currentMode.time / 60)}分間の${currentMode.label}をとりましょう。`}
                       </p>
                     </div>
                     <button
                       onClick={() => {
                         const nextIndex = POMODORO_SEQUENCE.findIndex((m, i) => i > sequenceIndex && m === 'work');
                         const finalIndex = nextIndex !== -1 ? nextIndex : 0;
                         setSequenceIndex(finalIndex);
                         setMode('work'); // ← fix: explicitly switch mode so background/color transitions correctly
                         setTimeLeft(MODES['work'].time);
                         setIsActive(false); 
                       }}
                       className="p-3 neu-flat hover:neu-pressed text-zinc-400 hover:text-emerald-400 rounded-xl transition-all"
                       title="休憩を終了して作業に戻る"
                     >
                       <ChevronRight className="w-5 h-5" />
                     </button>
                   </>
                 )}
              </div>

              {/* Timer UI Card */}
              <motion.div 
                layout
                className="relative overflow-hidden flex flex-col items-center justify-center p-12 rounded-[3rem] neu-flat"
              >
                {/* Circular Progress Ring */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="absolute w-[340px] h-[340px] rounded-full neu-inset"></div>
                  <svg className="w-[380px] h-[380px] -rotate-90 transform drop-shadow-xl" viewBox="0 0 380 380">
                    <circle
                      cx="190" cy="190" r={radius}
                      stroke="currentColor" strokeWidth="6" fill="none"
                      className="text-zinc-800"
                    />
                    <motion.circle
                      cx="190" cy="190" r={radius}
                      stroke="currentColor" strokeWidth="8" fill="none"
                      strokeLinecap="round"
                      className={`${currentMode.color} drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]`}
                      initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 1, ease: 'linear' }}
                    />
                  </svg>
                </div>
                
                <motion.div 
                  key={mode}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className={`flex items-center space-x-2 mb-8 px-6 py-2.5 rounded-full neu-flat ${currentMode.color}`}
                >
                  <CurrentIcon className="w-5 h-5" />
                  <span className="font-bold tracking-widest text-xs uppercase">{currentMode.label}</span>
                </motion.div>

                <div className="relative font-mono font-bold text-7xl sm:text-8xl tracking-tighter tabular-nums text-zinc-100 mb-10 select-none drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  {formatTime(timeLeft)}
                </div>

                <div className="flex items-center justify-center space-x-8 relative z-10">
                  <button
                    onClick={resetTimer}
                    className="group flex items-center justify-center w-16 h-16 rounded-full neu-flat text-zinc-500 hover:text-zinc-300 transition-all active:neu-pressed"
                    aria-label="タイマーをリセット"
                  >
                    <RotateCcw className="w-5 h-5 group-hover:-rotate-90 transition-transform duration-300" />
                  </button>
                  
                  <button
                    onClick={toggleTimer}
                    className={`flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ${
                      isActive 
                        ? 'neu-pressed text-zinc-400' 
                        : `neu-flat ${currentMode.color} animate-button-glow`
                    }`}
                    aria-label={isActive ? "タイマーを一時停止" : "タイマーを開始"}
                  >
                    {isActive ? (
                      <Pause className="w-10 h-10 fill-current" />
                    ) : (
                      <Play className="w-10 h-10 fill-current ml-2 drop-shadow-[0_0_8px_currentColor]" />
                    )}
                  </button>
                </div>
              </motion.div>
            </div>

            {/* --- RIGHT SIDE: TASK FLOW --- */}
            <div className="w-full lg:w-[55%] neu-flat rounded-[2.5rem] p-6 sm:p-8 flex flex-col h-[600px] overflow-hidden">
              <h3 className="font-bold text-zinc-100 mb-2 flex items-center text-lg">
                <ListTodo className="w-5 h-5 mr-2 text-indigo-400" />
                本日のタスクフロー
              </h3>
              {(() => {
                const total = tasks.length;
                const done = tasks.filter(t => t.completed).length;
                const ratio = total > 0 ? done / total : 0;
                const msg = total === 0 ? '' :
                  done === 0 ? '💪 さあ、最初の一歩を踏み出そう！' :
                  ratio < 0.25 ? '🔥 いい調子！その勢いで進もう！' :
                  ratio < 0.5 ? '⚡ 順調！もう少しで折り返しだ！' :
                  ratio < 0.75 ? '🚀 半分以上クリア！ゴールが見えてきた！' :
                  ratio < 1 ? '✨ あと少し！最後まで駆け抜けよう！' :
                  '🎉 全タスク完了！素晴らしい一日だった！';
                return msg ? (
                  <div className="mb-4 p-3 rounded-xl neu-inset text-center">
                    <p className="text-sm font-bold text-zinc-300">{msg}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700" style={{ width: `${ratio * 100}%` }} />
                    </div>
                    <p className="text-xs text-zinc-500 mt-1.5 font-medium">{done} / {total} タスク完了</p>
                  </div>
                ) : null;
              })()}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {(() => {
                  const upcomingFlow = [];
                  let currentSeqIdx = sequenceIndex;
                  let taskIdx = 0;
                  const uncompletedTasks = tasks.filter(t => !t.completed);
                  
                  if (uncompletedTasks.length === 0) {
                     return <div className="text-zinc-500 text-center py-10 font-bold">すべてのタスクが完了しました🎉</div>;
                  }

                  let maxItems = 12; 
                  while (taskIdx < uncompletedTasks.length && maxItems > 0) {
                    const pMode = POMODORO_SEQUENCE[currentSeqIdx];
                    const isCurrent = upcomingFlow.length === 0; 
                    
                    if (pMode === 'work') {
                      upcomingFlow.push(
                        <div key={`flow-${taskIdx}`} className={`flex items-center p-4 rounded-2xl transition-all ${isCurrent ? 'neu-inset border border-indigo-500/30' : 'neu-flat opacity-70'}`}>
                          <div className={`p-2 rounded-xl mr-4 ${isCurrent ? 'neu-pressed text-indigo-400' : 'neu-inset text-zinc-500'}`}>
                            <Brain className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${isCurrent ? 'text-zinc-100' : 'text-zinc-400'}`}>{uncompletedTasks[taskIdx].text}</p>
                            <span className="text-xs text-zinc-500 tracking-wider font-bold">25分 集中</span>
                          </div>
                          {isCurrent && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />}
                        </div>
                      );
                      taskIdx++;
                    } else {
                      const breakMode = MODES[pMode];
                      const breakMins = Math.floor(breakMode.time / 60);
                      const isShort = pMode === 'shortBreak';
                      upcomingFlow.push(
                        <div key={`flow-break-${currentSeqIdx}-${taskIdx}`} className={`flex items-center p-3 rounded-2xl mx-4 transition-all ${isCurrent ? 'neu-inset border border-emerald-500/30' : 'opacity-60'}`}>
                          <div className={`p-1.5 rounded-lg mr-3 ${isCurrent ? 'neu-pressed text-emerald-400' : 'neu-inset text-zinc-600'}`}>
                            {isShort ? <Coffee className="w-4 h-4" /> : <BatteryCharging className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold ${isCurrent ? 'text-emerald-400' : 'text-zinc-500'}`}>
                              {`${breakMins}分 ${breakMode.label}`}
                            </p>
                          </div>
                          {isCurrent && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />}
                        </div>
                      );
                    }
                    currentSeqIdx = (currentSeqIdx + 1) % POMODORO_SEQUENCE.length;
                    maxItems--;
                  }
                  
                  return upcomingFlow;
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- WORK TIME GRAPH (visible in planning mode) --- */}
      {appState === 'planning' && Object.keys(workLog).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-5xl mx-auto relative z-10 mt-6 px-4"
        >
          <div className="neu-flat rounded-[2rem] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-zinc-100 flex items-center text-lg">
                <BarChart3 className="w-5 h-5 mr-2 text-indigo-400" />
                日別業務時間
              </h3>
              <span className="text-xs text-zinc-500 font-medium">過去7日間</span>
            </div>
            {(() => {
              const today = new Date();
              const days: string[] = [];
              for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                days.push(d.toISOString().split('T')[0]);
              }
              const maxSecs = Math.max(...days.map(d => (workLog[d] || []).reduce((a, b) => a + b, 0)), 1);
              return (
                <div className="space-y-3">
                  {days.map(day => {
                    const dayLog = workLog[day] || new Array(24).fill(0);
                    const totalSecs = dayLog.reduce((a: number, b: number) => a + b, 0);
                    const totalMins = Math.round(totalSecs / 60);
                    const hrs = Math.floor(totalMins / 60);
                    const mins = totalMins % 60;
                    const shortDay = day.slice(5);
                    return (
                      <div key={day} className="flex items-center space-x-3">
                        <span className="text-xs text-zinc-500 w-14 text-right font-mono">{shortDay}</span>
                        <div className="flex-1 h-6 rounded-full bg-zinc-800/50 overflow-hidden relative">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500" style={{ width: `${(totalSecs / maxSecs) * 100}%` }} />
                        </div>
                        <span className="text-xs text-zinc-400 w-16 font-bold">{hrs > 0 ? `${hrs}時間${mins}分` : `${mins}分`}</span>
                      </div>
                    );
                  })}
                  <p className="text-center text-sm font-bold mt-4 text-zinc-300">
                    {(() => {
                      const todayTotal = Math.round(((workLog[days[6]] || []).reduce((a: number, b: number) => a + b, 0)) / 60);
                      if (todayTotal === 0) return '💪 さあ、今日も集中を始めよう！';
                      if (todayTotal < 60) return '🔥 素晴らしいスタート！その調子で続けよう！';
                      if (todayTotal < 120) return '⚡ 1時間以上集中！素晴らしい集中力だ！';
                      if (todayTotal < 240) return '🚀 大きな成果を上げています！その勢い！';
                      return '🌟 今日は圧倒的な集中力だ！最高の一日！';
                    })()}
                  </p>
                </div>
              );
            })()}
          </div>
        </motion.div>
      )}

      {/* --- POMODORO HELP MODAL --- */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="neu-flat rounded-[2rem] p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 neu-inset rounded-xl text-indigo-400">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold">ポモドーロテクニックとは？</h2>
              </div>
              
              <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
                <p>
                  <strong className="text-indigo-400">ポモドーロテクニック</strong>は、1980年代にフランチェスコ・シリロが考案した時間管理法です。
                  トマト型のキッチンタイマー🍅（ポモドーロ）が名前の由来です。
                </p>
                
                <div className="neu-inset rounded-xl p-4 space-y-2">
                  <p className="font-bold text-zinc-100 mb-3">📋 本アプリのサイクル:</p>
                  <div className="space-y-1.5">
                    {[
                      { icon: '🧠', text: '25分 集中（作業）', color: 'text-indigo-400' },
                      { icon: '☕', text: `${breakSettings.shortBreak}分 小休止`, color: 'text-emerald-400' },
                      { icon: '🧠', text: '25分 集中（作業）', color: 'text-indigo-400' },
                      { icon: '☕', text: `${breakSettings.shortBreak}分 小休止`, color: 'text-emerald-400' },
                      { icon: '🧠', text: '25分 集中（作業）', color: 'text-indigo-400' },
                      { icon: '🍵', text: `${breakSettings.midBreak}分 中休止`, color: 'text-teal-400' },
                      { icon: '🔁', text: 'もう1サイクル繰り返し…', color: 'text-zinc-500' },
                      { icon: '🛋️', text: `${breakSettings.longBreak}分 長めの休憩`, color: 'text-blue-400' },
                    ].map((item, i) => (
                      <p key={i} className={`flex items-center space-x-2 ${item.color}`}>
                        <span>{item.icon}</span>
                        <span className="font-medium">{item.text}</span>
                      </p>
                    ))}
                  </div>
                </div>

                <p>
                  <strong className="text-amber-400">なぜ効果的なのか？</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-zinc-400">
                  <li>短い集中と休憩の繰り返しで<strong className="text-zinc-200">持続可能な集中力</strong>を維持</li>
                  <li>明確な時間制限が<strong className="text-zinc-200">先延ばしを防止</strong></li>
                  <li>小さなゴールの達成感が<strong className="text-zinc-200">モチベーション維持</strong>に寄与</li>
                  <li>定期的な休憩が<strong className="text-zinc-200">脳のリフレッシュ</strong>を促進</li>
                </ul>
              </div>
              
              <button
                onClick={() => setShowHelp(false)}
                className="w-full mt-6 py-3 neu-flat hover:neu-pressed text-indigo-400 rounded-xl font-bold transition-all"
              >
                閉じる
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- DECOMPOSITION MODAL --- */}
      <AnimatePresence>
        {decomposeTarget && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDecomposeTarget(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md neu-flat p-6 sm:p-8 rounded-3xl space-y-6 relative"
            >
              <h2 className="text-2xl font-bold flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-amber-400" />
                タスクを分解
              </h2>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-3">何個に分解しますか？ (25分単位)</label>
                <div className="flex items-center justify-center space-x-6">
                  <button
                    type="button"
                    onClick={() => handlePartsChange(decomposeParts - 1)}
                    disabled={decomposeParts <= 2}
                    className="w-14 h-14 text-2xl font-bold rounded-2xl neu-flat hover:neu-pressed text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                  >−</button>
                  <span className="text-4xl font-black text-indigo-400 w-16 text-center tabular-nums">{decomposeParts}</span>
                  <button
                    type="button"
                    onClick={() => handlePartsChange(decomposeParts + 1)}
                    disabled={decomposeParts >= 10}
                    className="w-14 h-14 text-2xl font-bold rounded-2xl neu-flat hover:neu-pressed text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                  >+</button>
                </div>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                <label className="block text-sm text-zinc-400 mb-1">内訳</label>
                {decomposeNames.map((name, i) => (
                  <input
                    key={i}
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(i, e.target.value)}
                    className="w-full p-3 neu-inset rounded-xl bg-transparent outline-none focus:ring-2 ring-indigo-500/50 text-sm text-white"
                  />
                ))}
              </div>

              <div className="flex space-x-3 pt-4">
                <button 
                  onClick={() => setDecomposeTarget(null)}
                  className="flex-1 p-3 neu-flat rounded-xl hover:text-zinc-300 transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  onClick={confirmDecompose}
                  className="flex-1 p-3 neu-pressed text-indigo-400 neon-glow-blue rounded-xl font-bold transition-all"
                >
                  分割する
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* --- HISTORY MODAL --- */}
      <AnimatePresence>
        {historyModalDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setHistoryModalDate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md neu-flat p-6 sm:p-8 rounded-3xl space-y-4 relative"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center text-zinc-100">
                  <CalendarDays className="w-5 h-5 mr-2 text-amber-400" />
                  {historyModalDate} のタスク履歴
                </h2>
                <button
                  onClick={() => setHistoryModalDate(null)}
                  className="p-2 neu-flat rounded-xl text-zinc-500 hover:text-zinc-300 transition-colors"
                >✕</button>
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                {(taskHistory[historyModalDate] ?? []).length === 0 ? (
                  <p className="text-zinc-500 text-center py-6">この日の履歴はありません</p>
                ) : (
                  (taskHistory[historyModalDate] ?? []).map((t) => (
                    <div key={t.id} className={`flex items-center space-x-3 p-3 rounded-2xl ${t.completed ? 'neu-inset opacity-60' : 'neu-flat'}`}>
                      <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                        t.priority === '高' ? 'bg-rose-500' : t.priority === '中' ? 'bg-indigo-500' : 'bg-emerald-600'
                      }`} />
                      <span className={`flex-1 text-sm font-medium ${t.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{t.text}</span>
                      <span className={`text-xs font-bold ${t.completed ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {t.completed ? '✅ 完了' : '⏸ 未完了'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}} />
    </div>
  );
}
