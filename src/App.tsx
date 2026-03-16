import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Task, TimeSlot, BreakSettings, ModeId, 
  POMODORO_SEQUENCE, DEFAULT_BREAK_SETTINGS, LS_KEYS,
  loadFromLS, buildModes, formatTime, sendNotification,
  MOTIVATIONAL_QUOTES, WorkLog, TaskHistory
} from './types';

// Components
import { InputView } from './InputView';
import { ReviewView } from './ReviewView';
import { TimerView } from './TimerView';
import { DecomposeModal } from './DecomposeModal';
import { HelpModal } from './HelpModal';
import { HistoryModal } from './HistoryModal';

export default function PomodoroApp() {
  // ─── Phase State ───
  const [appState, setAppState] = useState<'planning' | 'review' | 'running'>('planning');

  // ─── Core Data State ───
  const [tasks, setTasks] = useState<Task[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = loadFromLS<string>(LS_KEYS.lastDate, today);
    const savedTasks = loadFromLS<Task[]>(LS_KEYS.tasks, []);
    const savedHistory = loadFromLS<TaskHistory>(LS_KEYS.history, {});

    if (lastDate !== today && savedTasks.length > 0) {
      // Date Rollover Logic
      const completedYesterday = savedTasks.filter(t => t.completed);
      if (completedYesterday.length > 0) {
        const updatedHistory = { ...savedHistory, [lastDate]: completedYesterday };
        localStorage.setItem(LS_KEYS.history, JSON.stringify(updatedHistory));
      }
      // Carry over incomplete tasks
      const carryOver = savedTasks.filter(t => !t.completed).map(t => ({ ...t, addedDate: today }));
      localStorage.setItem(LS_KEYS.lastDate, today);
      localStorage.setItem(LS_KEYS.tasks, JSON.stringify(carryOver));
      return carryOver;
    }
    localStorage.setItem(LS_KEYS.lastDate, today);
    return savedTasks;
  });

  const [breakSettings, setBreakSettings] = useState<BreakSettings>(() =>
    loadFromLS<BreakSettings>(LS_KEYS.breakSettings, DEFAULT_BREAK_SETTINGS)
  );

  const [workLog, setWorkLog] = useState<WorkLog>(() =>
    loadFromLS<WorkLog>(LS_KEYS.workLog, {})
  );

  const [taskHistory, setTaskHistory] = useState<TaskHistory>(() =>
    loadFromLS<TaskHistory>(LS_KEYS.history, {})
  );

  const [activeDays, setActiveDays] = useState<string[]>(() =>
    loadFromLS<string[]>(LS_KEYS.activeDays, [])
  );

  // ─── Timer State ───
  const MODES = useMemo(() => buildModes(breakSettings), [breakSettings]);
  const [timeLeft, setTimeLeft] = useState(MODES['work'].time);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<ModeId>('work');
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [isContinuing, setIsContinuing] = useState(false);

  // ─── UI / Modal State ───
  const [quote, setQuote] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [historyDate, setHistoryDate] = useState<string | null>(null);
  const [decomposeTarget, setDecomposeTarget] = useState<Task | null>(null);
  const [decomposeParts, setDecomposeParts] = useState(2);
  const [decomposeNames, setDecomposeNames] = useState<string[]>([]);

  // ─── Effects: Persistence ───
  useEffect(() => { localStorage.setItem(LS_KEYS.tasks, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(LS_KEYS.activeDays, JSON.stringify(activeDays)); }, [activeDays]);
  useEffect(() => { localStorage.setItem(LS_KEYS.history, JSON.stringify(taskHistory)); }, [taskHistory]);
  useEffect(() => { localStorage.setItem(LS_KEYS.breakSettings, JSON.stringify(breakSettings)); }, [breakSettings]);
  useEffect(() => { localStorage.setItem(LS_KEYS.workLog, JSON.stringify(workLog)); }, [workLog]);

  // ─── Effect: Lifecycle ───
  useEffect(() => {
    setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  }, []);

  useEffect(() => {
    document.title = appState === 'running' ? `${formatTime(timeLeft)} - ${MODES[mode].label}` : 'Pomodoro';
  }, [timeLeft, mode, appState, MODES]);

  // ─── Effect: Timer Loop ───
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
      
      // Work log tracking (1s per tick)
      if (mode === 'work') {
        const today = new Date().toISOString().split('T')[0];
        const hour = new Date().getHours();
        setWorkLog(prev => {
          const dayLog = prev[today] ? [...prev[today]] : new Array(24).fill(0);
          dayLog[hour] = (dayLog[hour] || 0) + 1;
          return { ...prev, [today]: dayLog };
        });
      }
    } else if (timeLeft <= 0 && isActive) {
      // Loop Logic
      const nextIndex = (sequenceIndex + 1) % POMODORO_SEQUENCE.length;
      const nextModeId = POMODORO_SEQUENCE[nextIndex];
      
      setSequenceIndex(nextIndex);
      setMode(nextModeId);
      setTimeLeft(MODES[nextModeId].time);
      setIsActive(true);
      setIsContinuing(false); // Reset continuation flag on phase switch
      
      sendNotification('Pomodoro Update', `次のフェーズが始まりました: ${MODES[nextModeId].label}`);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, sequenceIndex, mode, MODES]);

  // ─── Handlers ───
  const handleStartReview = useCallback(() => {
    // Sort logic for today's tasks
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => !t.completed && (t.addedDate === today || !t.deadline || t.deadline <= today));
    
    const priorityWeight = { '高': 3, '中': 2, '低': 1 };
    const sorted = [...todayTasks].sort((a, b) => {
        if (a.timeSlot !== b.timeSlot) {
            const slots: TimeSlot[] = ['朝', '昼', '夜'];
            return slots.indexOf(a.timeSlot) - slots.indexOf(b.timeSlot);
        }
        return priorityWeight[b.priority] - priorityWeight[a.priority];
    });

    setTasks(prev => {
        const nonToday = prev.filter(t => !todayTasks.some(tr => tr.id === t.id));
        return [...nonToday, ...sorted];
    });

    setAppState('review');
  }, [tasks]);

  const handleStartSession = useCallback(() => {
    setSequenceIndex(0);
    setMode('work');
    setTimeLeft(MODES['work'].time);
    setIsActive(true);
    setAppState('running');
    
    // Log active day
    const todayStr = new Date().toISOString().split('T')[0];
    setActiveDays(prev => prev.includes(todayStr) ? prev : [...prev, todayStr]);
  }, [MODES]);

  const handleCompleteTask = useCallback((id: string) => {
    const today = new Date().toISOString().split('T')[0];
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
    
    // Archive to history
    const task = tasks.find(t => t.id === id);
    if (task) {
      setTaskHistory(prev => ({ 
        ...prev, 
        [today]: [...(prev[today] ?? []), { ...task, completed: true }] 
      }));
    }

    // Auto-advance to break
    const isNextBreak = POMODORO_SEQUENCE[(sequenceIndex + 1) % POMODORO_SEQUENCE.length] !== 'work';
    let nextIndex = sequenceIndex;
    if (isNextBreak) {
       nextIndex = (sequenceIndex + 1) % POMODORO_SEQUENCE.length;
    } else {
       const nextBreakIdx = POMODORO_SEQUENCE.findIndex((m, i) => i > sequenceIndex && m !== 'work');
       nextIndex = nextBreakIdx !== -1 ? nextBreakIdx : 1; 
    }
    
    setSequenceIndex(nextIndex);
    setMode(POMODORO_SEQUENCE[nextIndex]);
    setTimeLeft(MODES[POMODORO_SEQUENCE[nextIndex]].time);
    setIsActive(true);
    setIsContinuing(false);

    sendNotification('Task Completed 🎉', 'お疲れ様でした！休憩に入ります。');
  }, [sequenceIndex, MODES, tasks]);

  const handleSkipBreak = useCallback(() => {
    const nextIndex = (sequenceIndex + 1) % POMODORO_SEQUENCE.length;
    const nextModeId = POMODORO_SEQUENCE[nextIndex];
    
    setSequenceIndex(nextIndex);
    setMode(nextModeId);
    setTimeLeft(MODES[nextModeId].time);
    setIsActive(true);
  }, [sequenceIndex, MODES]);

  // View logic
  const today = new Date().toISOString().split('T')[0];
  const todayTasksForReview = useMemo(() => 
    tasks.filter(t => !t.completed && (t.addedDate === today || !t.deadline || t.deadline <= today)),
  [tasks, today]);

  return (
    <div className="min-h-screen bg-[#15171c] text-zinc-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden transition-colors duration-1000">
      
      {/* Background Glows Enhancement */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`organic-curve absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] transition-colors duration-[2000ms] blur-[120px] opacity-50 ${appState === 'running' && mode !== 'work' ? 'bg-emerald-500/30' : 'bg-indigo-600/30'}`} />
        <div className="organic-curve absolute top-[10%] -right-[20%] w-[80vw] h-[80vw] bg-violet-600/20 blur-[150px] opacity-40" style={{ animationDelay: '-4s', animationDuration: '25s' }} />
        <div className="organic-curve absolute -bottom-[30%] left-[10%] w-[60vw] h-[60vw] bg-blue-600/10 blur-[100px] opacity-30" style={{ animationDelay: '-8s', animationDuration: '30s' }} />
      </div>

      <AnimatePresence mode="wait">
        {appState === 'planning' && (
          <InputView 
            key="input"
            tasks={tasks}
            setTasks={setTasks}
            breakSettings={breakSettings}
            setBreakSettings={setBreakSettings}
            onStartReview={handleStartReview}
            onOpenHelp={() => setShowHelp(true)}
            activeDays={activeDays}
            workLog={workLog}
            onOpenHistory={setHistoryDate}
            quote={quote}
          />
        )}
        {appState === 'review' && (
          <ReviewView 
            key="review"
            tasks={todayTasksForReview}
            setTasks={(newTasks) => {
                // Careful here: we only want to update the order of today's tasks
                // but keep the rest of the tasks (backlog, completed) intact.
                const updatedTasks = [...tasks];
                // Remove today's tasks first
                const nonTodayTasks = updatedTasks.filter(t => !todayTasksForReview.some(tr => tr.id === t.id));
                // Add back the new ordered today's tasks (newTasks is a function if used with setTasks setter, 
                // but here we get the new value because ReviewView calls it with the new array)
                const orderedToday = Array.isArray(newTasks) ? newTasks : []; // Safety
                setTasks([...nonTodayTasks, ...orderedToday]);
            }}
            onBack={() => setAppState('planning')}
            onStart={handleStartSession}
          />
        )}
        {appState === 'running' && (
          <TimerView 
            key="timer"
            tasks={tasks}
            setTasks={setTasks}
            mode={mode}
            timeLeft={timeLeft}
            isActive={isActive}
            onToggle={() => setIsActive(!isActive)}
            onReset={() => setTimeLeft(MODES[mode].time)}
            onBack={() => setAppState('planning')}
            onComplete={handleCompleteTask}
            onExtend={() => setTimeLeft(t => t + 300)}
            onSetContinue={() => setIsContinuing(!isContinuing)}
            onSkipBreak={handleSkipBreak}
            sequenceIndex={sequenceIndex}
            MODES={MODES}
            isContinuing={isContinuing}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} breakSettings={breakSettings} />
      <HistoryModal date={historyDate} history={taskHistory} workLog={workLog} onClose={() => setHistoryDate(null)} />
      <DecomposeModal 
        target={decomposeTarget} 
        parts={decomposeParts} 
        names={decomposeNames}
        onPartsChange={(v) => {
            const p = Math.max(2, Math.min(10, v));
            setDecomposeParts(p);
            const newNames = Array.from({ length: p }, (_, i) => `${decomposeTarget?.text} (${i+1})`);
            setDecomposeNames(newNames);
        }}
        onNameChange={(i, v) => {
            const n = [...decomposeNames];
            n[i] = v;
            setDecomposeNames(n);
        }}
        onConfirm={() => {
            if (!decomposeTarget) return;
            const subTasks: Task[] = decomposeNames.map((name, i) => ({
                id: Date.now().toString() + '-' + i,
                text: name + ' [25分]',
                completed: false,
                priority: decomposeTarget.priority,
                timeSlot: decomposeTarget.timeSlot,
                addedDate: today
            }));
            setTasks(prev => {
                const idx = prev.findIndex(t => t.id === decomposeTarget.id);
                if (idx === -1) return prev;
                const next = [...prev];
                next.splice(idx, 1, ...subTasks);
                return next;
            });
            setDecomposeTarget(null);
        }}
        onClose={() => setDecomposeTarget(null)}
      />
    </div>
  );
}
