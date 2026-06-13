import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  Award,
  BookOpen,
  Search,
  Moon,
  Sun,
  Play,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Star,
  Save,
  X,
  Sparkles,
  User,
  Info,
  Mic
} from 'lucide-react';
import { QUESTIONS, Question } from './data';
import { evaluateAnswer, EvaluationResult } from './utils/evaluation';
import { FeedbackCard } from './components/FeedbackCard';
import { getApiKey, setApiKey, ChatMessage } from './utils/ai';
import { ChatTrainingView } from './components/ChatTrainingView';
import { Settings } from 'lucide-react';

// --- Web Speech API Setup ---
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechSupported = !!SpeechRecognition;

// --- Local Storage Keys ---
const STORAGE_KEYS = {
  theme: 'casemind_theme_dark',
  history: 'casemind_user_history',
  activeSession: 'casemind_active_session'
};

// --- Interfaces ---
interface SessionState {
  questionId: string;
  mode: 'step' | 'chat';
  step: number;
  answers: string[];
  chatMessages: ChatMessage[];
}

interface QuestionProgress {
  questionId: string;
  status: 'in_progress' | 'completed';
  answers: string[];
  chatMessages?: ChatMessage[];
  score: number; // 1: Needs Work, 2: Good, 3: Excellent
  reflection: string;
  updatedAt: string;
}

type ViewType = 'dashboard' | 'training' | 'review' | 'chat_training';

export default function App() {
  // --- States ---
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    return saved ? JSON.parse(saved) : false;
  });

  const [history, setHistory] = useState<Record<string, QuestionProgress>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.history);
    return saved ? JSON.parse(saved) : {};
  });

  const [activeSession, setActiveSession] = useState<SessionState | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.activeSession);
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState<ViewType>(() => {
    const savedSession = localStorage.getItem(STORAGE_KEYS.activeSession);
    return savedSession ? 'training' : 'dashboard';
  });

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'case' | 'fermi'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unstarted' | 'in_progress' | 'completed'>('all');

  // Active training state
  const [currentInput, setCurrentInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [reviewTab, setReviewTab] = useState<'ai_feedback' | 'compare' | 'overall'>('ai_feedback');

  // Review screen states
  const [rating, setRating] = useState<number>(3); // Default to 3 stars (Excellent)
  const [reflectionInput, setReflectionInput] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Settings states
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const apiKey = getApiKey();

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Speech Recognition Setup
  useEffect(() => {
    if (!isSpeechSupported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'ja-JP';

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setCurrentInput(prev => {
        const separator = prev.trim() ? '\n' : '';
        return prev + separator + transcript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start recognition', e);
      }
    }
  };

  // Stop listening when changing step or view
  useEffect(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [activeSession?.step, activeSession?.questionId, view]);

  // Sync dark mode class
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Save history to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  }, [history]);

  // Save active session to local storage
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify(activeSession));
    } else {
      localStorage.removeItem(STORAGE_KEYS.activeSession);
    }
  }, [activeSession]);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [currentInput, activeSession?.step]);

  // Load active session input when step changes
  useEffect(() => {
    if (activeSession) {
      const savedAnswer = activeSession.answers[activeSession.step] || '';
      setCurrentInput(savedAnswer);
      setShowHint(false);
    }
  }, [activeSession?.step, activeSession?.questionId]);

  // --- Handlers ---
  const handleStartQuestion = (question: Question, mode: 'step' | 'chat' = 'step') => {
    const existingProgress = history[question.id];
    
    const newSession: SessionState = {
      questionId: question.id,
      mode,
      step: 0,
      answers: existingProgress ? [...existingProgress.answers] : ['', '', '', ''],
      chatMessages: existingProgress?.chatMessages ? [...existingProgress.chatMessages] : []
    };
    
    setActiveSession(newSession);
    setView(mode === 'chat' ? 'chat_training' : 'training');
  };

  const handleNextStep = () => {
    if (!activeSession) return;

    const updatedAnswers = [...activeSession.answers];
    updatedAnswers[activeSession.step] = currentInput;

    const nextStep = activeSession.step + 1;

    // Save intermediate progress to history as in_progress
    const updatedHistory: QuestionProgress = {
      questionId: activeSession.questionId,
      status: 'in_progress',
      answers: updatedAnswers,
      score: history[activeSession.questionId]?.score || 0,
      reflection: history[activeSession.questionId]?.reflection || '',
      updatedAt: new Date().toISOString()
    };

    setHistory(prev => ({ ...prev, [activeSession.questionId]: updatedHistory }));

    if (nextStep < 4) {
      setActiveSession({
        ...activeSession,
        step: nextStep,
        answers: updatedAnswers
      });
    } else {
      // Completed all 4 steps, move to review view
      const prevProgress = history[activeSession.questionId];
      setRating(prevProgress?.score || 3);
      setReflectionInput(prevProgress?.reflection || '');
      setReviewTab('ai_feedback');
      setView('review');

      // Trigger evaluation
      setIsEvaluating(true);
      setEvaluationResult(null);
      const activeQuestion = QUESTIONS.find(q => q.id === activeSession.questionId);
      if (activeQuestion) {
        evaluateAnswer(activeQuestion, updatedAnswers).then(result => {
          setEvaluationResult(result);
          setIsEvaluating(false);
        });
      } else {
        setIsEvaluating(false);
      }
    }
  };

  const handlePrevStep = () => {
    if (!activeSession || activeSession.step === 0) return;

    const updatedAnswers = [...activeSession.answers];
    updatedAnswers[activeSession.step] = currentInput;

    setActiveSession({
      ...activeSession,
      step: activeSession.step - 1,
      answers: updatedAnswers
    });
  };

  const handleSaveAndExit = (chatMessages?: ChatMessage[]) => {
    if (!activeSession) return;
    
    // Save current step's input before exiting
    const updatedAnswers = [...activeSession.answers];
    if (activeSession.mode === 'step') {
      updatedAnswers[activeSession.step] = currentInput;
    }

    const updatedHistory: QuestionProgress = {
      questionId: activeSession.questionId,
      status: 'in_progress',
      answers: updatedAnswers,
      chatMessages: chatMessages || activeSession.chatMessages,
      score: history[activeSession.questionId]?.score || 0,
      reflection: history[activeSession.questionId]?.reflection || '',
      updatedAt: new Date().toISOString()
    };

    setHistory(prev => ({ ...prev, [activeSession.questionId]: updatedHistory }));
    setActiveSession(null);
    setView('dashboard');
  };

  const handleCompleteReview = () => {
    if (!activeSession) return;

    const finalHistory: QuestionProgress = {
      questionId: activeSession.questionId,
      status: 'completed',
      answers: activeSession.answers,
      chatMessages: activeSession.chatMessages,
      score: rating,
      reflection: reflectionInput,
      updatedAt: new Date().toISOString()
    };

    setHistory(prev => ({ ...prev, [activeSession.questionId]: finalHistory }));
    setActiveSession(null);
    setView('dashboard');
  };

  const handleResetProgress = () => {
    if (window.confirm('これまでの学習進捗、回答履歴、および自己評価をすべて削除します。よろしいですか？')) {
      setHistory({});
      setActiveSession(null);
      localStorage.removeItem(STORAGE_KEYS.history);
      localStorage.removeItem(STORAGE_KEYS.activeSession);
      setView('dashboard');
    }
  };

  // --- Helpers ---
  const activeQ = activeSession ? QUESTIONS.find(q => q.id === activeSession.questionId) : null;

  // Stats calculations
  const stats = {
    total: QUESTIONS.length,
    completed: Object.values(history).filter(h => h.status === 'completed').length,
    caseTotal: QUESTIONS.filter(q => q.type === 'case').length,
    caseCompleted: QUESTIONS.filter(q => q.type === 'case' && history[q.id]?.status === 'completed').length,
    fermiTotal: QUESTIONS.filter(q => q.type === 'fermi').length,
    fermiCompleted: QUESTIONS.filter(q => q.type === 'fermi' && history[q.id]?.status === 'completed').length,
    inProgress: Object.values(history).filter(h => h.status === 'in_progress').length,
    averageScore: (() => {
      const completedList = Object.values(history).filter(h => h.status === 'completed' && h.score > 0);
      if (completedList.length === 0) return 0;
      const sum = completedList.reduce((acc, h) => acc + h.score, 0);
      return (sum / completedList.length).toFixed(1);
    })()
  };

  // Filtered questions
  const filteredQuestions = QUESTIONS.filter(q => {
    const matchesSearch = 
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      q.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'all' || q.type === selectedType;
    const matchesDifficulty = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
    
    let matchesStatus = true;
    const progress = history[q.id];
    if (selectedStatus === 'unstarted') {
      matchesStatus = !progress;
    } else if (selectedStatus === 'in_progress') {
      matchesStatus = progress?.status === 'in_progress';
    } else if (selectedStatus === 'completed') {
      matchesStatus = progress?.status === 'completed';
    }

    return matchesSearch && matchesType && matchesDifficulty && matchesStatus;
  });

  return (
    <div className={`min-h-screen font-display transition-colors duration-300 ${darkMode ? 'dark bg-[#090d16] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* --- Header --- */}
      <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-300 dark:border-slate-800/80 dark:bg-[#090d16]/80 bg-white/80 border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { if (view === 'dashboard') window.scrollTo({top: 0, behavior: 'smooth'}); else if (window.confirm('編集内容は自動保存されます。ダッシュボードに戻りますか？')) { handleSaveAndExit(); } }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-500 text-white shadow-lg shadow-indigo-500/20">
              <Brain className="h-6 w-6 animate-pulse-glow" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-400 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-300">
                CaseMind
              </h1>
              <p className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 sm:block">
                対話型ケース面接・フェルミ推定コーチ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSettings(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Reset Settings */}
            <button
              onClick={handleResetProgress}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200/50 bg-red-50/10 text-red-500 transition-all hover:bg-red-50/30 dark:border-red-950/30 dark:bg-red-950/10 dark:text-red-400 dark:hover:bg-red-950/30"
              title="データをリセット"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* ==================== VIEW 1: DASHBOARD ==================== */}
        {view === 'dashboard' && (
          <div className="space-y-8 fade-in">
            
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-500/10 bg-gradient-to-br from-indigo-50/80 via-slate-50/80 to-indigo-100/30 dark:from-indigo-900/20 dark:via-slate-900/30 dark:to-slate-900/50 p-6 md:p-8 dark:glass-panel">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                    <Sparkles className="h-3 w-3" />
                    AI思考フレームワーク搭載
                  </span>
                  <h2 className="text-2xl font-bold sm:text-3xl font-display tracking-tight text-slate-800 dark:text-slate-100">
                    思考の限界に挑み、論理力を覚醒させよう。
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    厳選されたケース問題40問、フェルミ推定40問（計80問）を通じて、トップファームのコンサルティング面接や事業開発で求められる「構造化能力」と「計算力」を音声入力等を交えて徹底的にトレーニングできます。
                  </p>
                </div>
                <div className="flex gap-4 self-start md:self-auto">
                  <button
                    onClick={() => {
                      const unstarted = QUESTIONS.find(q => !history[q.id]);
                      if (unstarted) handleStartQuestion(unstarted);
                      else handleStartQuestion(QUESTIONS[0]);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30 active:scale-95"
                  >
                    <Play className="h-4 w-4" />
                    クイックスタート
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border p-5 transition-all dark:border-slate-800/80 dark:bg-slate-900/20 bg-white border-slate-200">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-sm font-medium">全体の完了状況</span>
                  <Award className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold font-display">{stats.completed}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">/ {stats.total} 問</span>
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500" 
                    style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border p-5 transition-all dark:border-slate-800/80 dark:bg-slate-900/20 bg-white border-slate-200">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-sm font-medium">ケース面接 (Case)</span>
                  <BookOpen className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold font-display">{stats.caseCompleted}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">/ {stats.caseTotal} 問</span>
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-500" 
                    style={{ width: `${(stats.caseCompleted / stats.caseTotal) * 100}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border p-5 transition-all dark:border-slate-800/80 dark:bg-slate-900/20 bg-white border-slate-200">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-sm font-medium">フェルミ推定 (Fermi)</span>
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold font-display">{stats.fermiCompleted}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">/ {stats.fermiTotal} 問</span>
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-500" 
                    style={{ width: `${(stats.fermiCompleted / stats.fermiTotal) * 100}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border p-5 transition-all dark:border-slate-800/80 dark:bg-slate-900/20 bg-white border-slate-200 col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-sm font-medium">平均自己評価スコア</span>
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold font-display">{Number(stats.averageScore) > 0 ? stats.averageScore : '—'}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">/ 3.0 星</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  {stats.completed > 0 ? `${stats.completed}個の完了済みセッションに基づく` : 'まだ完了した問題はありません'}
                </p>
              </div>
            </div>

            {/* Filter controls */}
            <div className="space-y-4 rounded-2xl border p-4 dark:border-slate-800/60 dark:bg-slate-900/10 bg-slate-100/50 border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                
                {/* Search input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="問題タイトル、説明、カテゴリから検索..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-500 focus:border-indigo-500 bg-white"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Type filter */}
                  <div className="flex rounded-lg border p-1 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <button
                      onClick={() => setSelectedType('all')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${selectedType === 'all' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      すべて
                    </button>
                    <button
                      onClick={() => setSelectedType('case')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${selectedType === 'case' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      ケース
                    </button>
                    <button
                      onClick={() => setSelectedType('fermi')}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${selectedType === 'fermi' ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      フェルミ
                    </button>
                  </div>

                  {/* Difficulty Filter */}
                  <select
                    value={selectedDifficulty}
                    onChange={(e: any) => setSelectedDifficulty(e.target.value)}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 focus:border-indigo-500 bg-white border-slate-200"
                  >
                    <option value="all">難易度: すべて</option>
                    <option value="easy">初級 (Easy)</option>
                    <option value="medium">中級 (Medium)</option>
                    <option value="hard">上級 (Hard)</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={selectedStatus}
                    onChange={(e: any) => setSelectedStatus(e.target.value)}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 focus:border-indigo-500 bg-white border-slate-200"
                  >
                    <option value="all">進捗: すべて</option>
                    <option value="unstarted">未着手</option>
                    <option value="in_progress">進行中</option>
                    <option value="completed">完了</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Question Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredQuestions.map((q) => {
                  const progress = history[q.id];
                  const isCompleted = progress?.status === 'completed';
                  const isInProgress = progress?.status === 'in_progress';
                  
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                      key={q.id}
                      className="group flex flex-col justify-between rounded-2xl border p-6 transition-all hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-900/10 dark:hover:border-slate-700/80 dark:hover:bg-slate-900/20 bg-white border-slate-200 hover:border-slate-300"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            q.type === 'case' 
                              ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20' 
                              : 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20'
                          }`}>
                            {q.type === 'case' ? 'ケース面接' : 'フェルミ推定'}
                          </span>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {q.category}
                            </span>
                            <span className="text-slate-300 dark:text-slate-800">•</span>
                            <span className={`text-xs font-bold ${
                              q.difficulty === 'easy' ? 'text-emerald-500' :
                              q.difficulty === 'medium' ? 'text-amber-500' : 'text-rose-500'
                            }`}>
                              {q.difficulty === 'easy' ? '初級' :
                               q.difficulty === 'medium' ? '中級' : '上級'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                            {q.title}
                          </h3>
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {q.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between pt-4 border-t dark:border-slate-800/80 border-slate-100">
                        {/* Progress label */}
                        <div>
                          {isCompleted ? (
                            <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-semibold">
                              <CheckCircle2 className="h-4 w-4" />
                              完了 (自己評価: {Array(progress.score).fill('★').join('')})
                            </div>
                          ) : isInProgress ? (
                            <div className="flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400 text-xs font-semibold">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                              </span>
                              進行中 (再開可能)
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">未着手</span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartQuestion(q, 'step')}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-all ${
                              isCompleted 
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:text-slate-300' 
                                : isInProgress
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:text-slate-300'
                                  : 'bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            ステップ
                            <ChevronRight className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleStartQuestion(q, 'chat')}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all"
                          >
                            <Brain className="h-3 w-3" />
                            AIチャット
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {filteredQuestions.length === 0 && (
                <div className="col-span-full py-16 text-center rounded-2xl border border-dashed dark:border-slate-800 border-slate-300">
                  <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                    該当する問題が見つかりません
                  </h3>
                  <p className="mt-2 text-xs text-slate-400">
                    検索キーワードやフィルターを変更してください。
                  </p>
                  <button 
                    onClick={() => { setSearchQuery(''); setSelectedType('all'); setSelectedDifficulty('all'); setSelectedStatus('all'); }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/10 px-3.5 py-2 text-xs font-semibold text-indigo-500 hover:bg-indigo-600/20 dark:text-indigo-400"
                  >
                    フィルターをクリア
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== VIEW 4: CHAT TRAINING ==================== */}
        {view === 'chat_training' && activeSession && activeQ && (
          <div className="max-w-4xl mx-auto space-y-8 slide-up">
            <ChatTrainingView
              question={activeQ}
              apiKey={apiKey}
              initialMessages={activeSession.chatMessages || []}
              onExit={(messages) => handleSaveAndExit(messages)}
              onComplete={(messages) => {
                const updatedAnswers = [...activeSession.answers];
                const userText = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
                updatedAnswers[0] = userText;
                
                setActiveSession({
                  ...activeSession,
                  answers: updatedAnswers,
                  chatMessages: messages,
                  step: 3
                });
                
                const updatedHistory: QuestionProgress = {
                  questionId: activeSession.questionId,
                  status: 'in_progress',
                  answers: updatedAnswers,
                  chatMessages: messages,
                  score: history[activeSession.questionId]?.score || 0,
                  reflection: history[activeSession.questionId]?.reflection || '',
                  updatedAt: new Date().toISOString()
                };
                setHistory(prev => ({ ...prev, [activeSession.questionId]: updatedHistory }));
                
                setReviewTab('ai_feedback');
                setView('review');
                setIsEvaluating(true);
                setEvaluationResult(null);
                evaluateAnswer(activeQ, updatedAnswers).then(result => {
                  setEvaluationResult(result);
                  setIsEvaluating(false);
                });
              }}
            />
          </div>
        )}

        {/* ==================== VIEW 2: INTERACTIVE DIALOGUE TRAINING ==================== */}
        {view === 'training' && activeSession && activeQ && (
          <div className="max-w-4xl mx-auto space-y-8 slide-up">
            
            {/* Top Progress bar and Navigation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleSaveAndExit()}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  保存してダッシュボードに戻る
                </button>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    activeQ.type === 'case' 
                      ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20' 
                      : 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20'
                  }`}>
                    {activeQ.type === 'case' ? 'ケース面接' : 'フェルミ推定'}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {activeQ.category}
                  </span>
                </div>
              </div>

              {/* Step indicator */}
              <div className="relative">
                {/* Connector line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-slate-200 dark:bg-slate-800 z-0" />
                <div 
                  className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-indigo-500 transition-all duration-300 z-0" 
                  style={{ width: `${(activeSession.step / 3) * 100}%` }}
                />
                
                {/* Dots */}
                <div className="relative flex justify-between z-10">
                  {activeQ.steps.map((step, idx) => {
                    const isPassed = idx < activeSession.step;
                    const isActive = idx === activeSession.step;
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <button
                          onClick={() => {
                            if (idx < activeSession.step || activeSession.answers[idx]) {
                              setActiveSession({
                                ...activeSession,
                                step: idx
                              });
                            }
                          }}
                          disabled={idx > activeSession.step && !activeSession.answers[idx]}
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border transition-all ${
                            isPassed 
                              ? 'bg-indigo-500 border-indigo-500 text-white' 
                              : isActive
                                ? 'bg-[#090d16] border-indigo-500 text-indigo-400 ring-4 ring-indigo-500/15'
                                : 'bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-500'
                          }`}
                        >
                          {isPassed ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                        </button>
                        <span className={`hidden sm:block mt-2 text-[10px] font-semibold ${
                          isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-500'
                        }`}>
                          {step.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Question Prompt Card */}
            <div className="rounded-2xl border p-6 dark:border-slate-800/80 dark:bg-slate-900/15 bg-white border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {activeQ.title}
              </h2>
              <div className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border dark:border-slate-800/50 border-slate-200">
                {activeQ.description}
              </div>
            </div>

            {/* Active Dialogue Step */}
            <div className="space-y-6">
              
              {/* Chat-style Assistant Instruction */}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Brain className="h-5 w-5" />
                </div>
                <div className="rounded-2xl border p-5 dark:border-slate-800 dark:bg-slate-900/5 bg-slate-100 border-slate-200 shadow-sm flex-1">
                  <h4 className="text-xs font-bold text-indigo-500 dark:text-indigo-400 tracking-wider uppercase">
                    STEP {activeSession.step + 1}: {activeQ.steps[activeSession.step].title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-300 whitespace-pre-wrap">
                    {activeQ.steps[activeSession.step].prompt}
                  </p>
                </div>
              </div>

              {/* User Input Text Area */}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border dark:border-slate-700/50 border-slate-300">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder={`${activeQ.steps[activeSession.step].title}についての思考・記述を入力してください...`}
                      rows={5}
                      className="w-full rounded-2xl border p-4 pr-12 text-sm leading-relaxed outline-none transition-all resize-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-500 focus:border-indigo-500 bg-white border-slate-200"
                    />
                    {isSpeechSupported && (
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`absolute right-3 top-3 p-2 rounded-xl border transition-all ${
                          isListening
                            ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                        title={isListening ? '音声入力を停止' : '音声入力を開始 (マイク)'}
                      >
                        {isListening ? (
                          <span className="relative flex h-5 w-5 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-300 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                        ) : (
                          <Mic className="h-5 w-5" />
                        )}
                      </button>
                    )}
                    <div className="absolute right-3 bottom-3 text-xs text-slate-400 font-mono">
                      {currentInput.length} 文字
                    </div>
                  </div>
                  {isListening && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      音声聞き取り中... お話しください。（もう一度マイクボタンを押すと停止します）
                    </div>
                  )}

                  {/* Hint Accordion */}
                  <div className="rounded-xl border dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/20 border-slate-200">
                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Lightbulb className="h-4 w-4" />
                        ヒントを表示 (アプローチやフレームワークのヒント)
                      </span>
                      <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${showHint ? 'rotate-90' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {showHint && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t dark:border-slate-800 border-slate-200"
                        >
                          <div className="p-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950/30 whitespace-pre-wrap">
                            {activeQ.steps[activeSession.step].hint}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t dark:border-slate-800 border-slate-200 pt-6">
              <button
                onClick={handlePrevStep}
                disabled={activeSession.step === 0}
                className="flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-400 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                前へ
              </button>

              <button
                onClick={handleNextStep}
                disabled={!currentInput.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95"
              >
                {activeSession.step === 3 ? '回答を完了して解説へ' : '次のステップへ'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* History Logs from Previous Steps (If any) */}
            {activeSession.step > 0 && (
              <div className="mt-8 border-t dark:border-slate-800/80 border-slate-200 pt-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                  ここまでのあなたの回答ログ
                </h3>
                <div className="space-y-4">
                  {activeQ.steps.slice(0, activeSession.step).map((step, idx) => (
                    <div key={idx} className="rounded-xl border p-4 text-xs dark:border-slate-800/50 dark:bg-slate-900/5 bg-slate-50 border-slate-200/50">
                      <span className="font-bold text-slate-400 dark:text-slate-400">
                        STEP {idx + 1}: {step.title}
                      </span>
                      <p className="mt-1.5 text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                        {activeSession.answers[idx]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== VIEW 3: MODEL ANSWER & SELF REFLECTION ==================== */}
        {view === 'review' && activeSession && activeQ && (
          <div className="max-w-4xl mx-auto space-y-8 slide-up">
            
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 tracking-wider uppercase">
                  学習の振り返り & 自己評価
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                  {activeQ.title}
                </h2>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                activeQ.type === 'case' 
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                  : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
              }`}>
                {activeQ.type === 'case' ? 'ケース面接' : 'フェルミ推定'}
              </span>
            </div>

            {/* Tabs */}
            <div className="flex border-b dark:border-slate-800 border-slate-200 overflow-x-auto">
              <button
                onClick={() => setReviewTab('ai_feedback')}
                className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap ${reviewTab === 'ai_feedback' ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                AIフィードバック
              </button>
              <button
                onClick={() => setReviewTab('compare')}
                className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap ${reviewTab === 'compare' ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                ステップ別回答比較
              </button>
              <button
                onClick={() => setReviewTab('overall')}
                className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-all whitespace-nowrap ${reviewTab === 'overall' ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                全体解説まとめ
              </button>
            </div>

            {/* Tab 0: AI Feedback */}
            {reviewTab === 'ai_feedback' && (
              <div className="space-y-6 slide-up">
                {isEvaluating ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400 space-y-4">
                    <div className="relative flex h-12 w-12 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-20"></span>
                      <Brain className="h-8 w-8 text-indigo-500 animate-pulse" />
                    </div>
                    <p className="text-sm font-bold animate-pulse">AIがあなたの回答を分析中...</p>
                  </div>
                ) : evaluationResult ? (
                  <FeedbackCard result={evaluationResult} />
                ) : (
                  <div className="text-center p-8 text-sm text-slate-500">評価結果を取得できませんでした。</div>
                )}
              </div>
            )}

            {/* Tab 1: Compare answers */}
            {reviewTab === 'compare' && (
              <div className="space-y-6">
                {activeQ.steps.map((step, idx) => {
                  const modelAnswerKey = `step${idx + 1}` as keyof typeof activeQ.modelAnswer;
                  
                  return (
                    <div key={idx} className="rounded-2xl border p-6 dark:border-slate-800/80 dark:bg-slate-900/10 bg-white border-slate-200 space-y-4 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b dark:border-slate-800 border-slate-100 pb-2">
                        STEP {idx + 1}: {step.title}
                      </h3>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* User Answer */}
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 dark:text-indigo-400">
                            <User className="h-3 w-3" />
                            あなたの回答
                          </span>
                          <div className="p-4 rounded-xl text-sm leading-relaxed dark:bg-slate-950/40 text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 border border-slate-100 dark:border-slate-900 min-h-[120px]">
                            {activeSession.answers[idx]}
                          </div>
                        </div>

                        {/* Model Answer */}
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
                            <Brain className="h-3 w-3" />
                            模範解説
                          </span>
                          <div className="p-4 rounded-xl text-sm leading-relaxed bg-emerald-50/40 text-emerald-800 border-emerald-200/50 dark:bg-emerald-500/5 dark:text-emerald-400/90 whitespace-pre-wrap border dark:border-emerald-500/10 min-h-[120px]">
                            {activeQ.modelAnswer[modelAnswerKey]}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Overall Summary */}
            {reviewTab === 'overall' && (
              <div className="rounded-2xl border p-6 dark:border-slate-800/80 dark:bg-slate-900/10 bg-white border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                  <Sparkles className="h-5 w-5" />
                  解説総括
                </div>
                <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/30 p-6 rounded-xl border dark:border-slate-800 border-slate-200">
                  {activeQ.modelAnswer.summary}
                </div>
                
                {activeQ.type === 'fermi' && (
                  <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-4 text-xs leading-relaxed text-indigo-400">
                    <h4 className="font-bold flex items-center gap-1 text-indigo-500 dark:text-indigo-400 mb-1">
                      <Info className="h-4 w-4" />
                      フェルミ推定の振り返りポイント
                    </h4>
                    フェルミ推定では数値が合っているかどうか以上に、「分解のロジックがMECE（漏れなく重複なく）であるか」「前提の仮定が実社会の感覚値と一致しているか」「誤差の検証が論理的にできているか」が重視されます。
                  </div>
                )}
              </div>
            )}

            {/* Self Evaluation & Reflection Card */}
            <div className="rounded-2xl border p-6 dark:border-slate-800/80 dark:bg-slate-900/15 bg-slate-100 border-slate-200 shadow-sm space-y-6">
              
              {/* Rating selection */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  この問題の自己評価
                </label>
                <div className="flex gap-4">
                  {[
                    { label: '要改善 (Needs Work)', score: 1, color: 'text-red-500 bg-red-500/10 border-red-500/20' },
                    { label: '合格レベル (Good)', score: 2, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
                    { label: '大変良くできた (Excellent)', score: 3, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }
                  ].map((item) => {
                    const isSelected = rating === item.score;
                    return (
                      <button
                        key={item.score}
                        onClick={() => setRating(item.score)}
                        className={`flex-1 rounded-xl border p-3 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
                          isSelected 
                            ? `${item.color} ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-indigo-500` 
                            : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex gap-0.5">
                          {Array(item.score).fill(0).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${isSelected ? 'fill-current' : 'text-slate-400'}`} />
                          ))}
                        </div>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reflection Memo */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  振り返りメモ・思考ログ (任意)
                </label>
                <textarea
                  value={reflectionInput}
                  onChange={(e) => setReflectionInput(e.target.value)}
                  placeholder="模範解答との差分、次回から気をつけるべき論理のポイントなどをメモしておきましょう..."
                  rows={4}
                  className="w-full rounded-xl border p-4 text-sm leading-relaxed outline-none transition-all resize-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-500 focus:border-indigo-500 bg-white border-slate-200"
                />
              </div>

              {/* Complete button */}
              <button
                onClick={handleCompleteReview}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-98"
              >
                <Save className="h-5 w-5" />
                評価と振り返りを保存して完了
              </button>
            </div>
          </div>
        )}
      </main>

      {/* --- Footer --- */}
      <footer className="mt-auto border-t dark:border-slate-800/80 border-slate-200 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p>© 2026 CaseMind. Built with React & Tailwind CSS.</p>
        </div>
      </footer>

      {/* --- Settings Modal --- */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-indigo-500" />
                  設定
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    OpenAI APIキー
                  </label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-..."
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 focus:border-indigo-500"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    入力されたキーはブラウザのローカルストレージにのみ保存され、外部サーバーには送信されません。
                  </p>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    setApiKey(apiKeyInput);
                    setShowSettings(false);
                    window.location.reload();
                  }}
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
                >
                  保存して適用
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
