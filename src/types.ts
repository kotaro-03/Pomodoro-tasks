import { Brain, Coffee, BatteryCharging } from 'lucide-react';

// ─── Time Slots ───
export type TimeSlot = '朝' | '昼' | '夜';
export function getCurrentTimeSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return '朝';
  if (h >= 10 && h < 18) return '昼';
  return '夜';
}

// ─── Priority ───
export type Priority = '高' | '中' | '低';

// ─── Task ───
export type Task = {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  timeSlot: TimeSlot;
  deadline?: string; // YYYY-MM-DD, optional
  addedDate?: string;
  scheduledDate?: string; // YYYY-MM-DD, the day this task is planned for
};

// ─── Work Log & History ───
export type WorkLog = Record<string, number[]>;
export type TaskHistory = Record<string, Task[]>;

// ─── Pomodoro ───
export const POMODORO_SEQUENCE = [
  'work', 'shortBreak', 'work', 'shortBreak', 'work', 'midBreak',
  'work', 'shortBreak', 'work', 'shortBreak', 'work', 'longBreak',
] as const;

export type ModeId = 'work' | 'shortBreak' | 'midBreak' | 'longBreak';

export type BreakSettings = {
  shortBreak: number;
  midBreak: number;
  longBreak: number;
};

export const DEFAULT_BREAK_SETTINGS: BreakSettings = {
  shortBreak: 5,
  midBreak: 15,
  longBreak: 25,
};

export const BREAK_OPTIONS = [5, 10, 15, 20, 25, 30];

export function buildModes(bs: BreakSettings) {
  return {
    work: { id: 'work' as const, label: '集中', time: 25 * 60, icon: Brain, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', activeBtn: 'bg-indigo-500 hover:bg-indigo-600' },
    shortBreak: { id: 'shortBreak' as const, label: '小休止', time: bs.shortBreak * 60, icon: Coffee, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', activeBtn: 'bg-emerald-500 hover:bg-emerald-600' },
    midBreak: { id: 'midBreak' as const, label: '中休止', time: bs.midBreak * 60, icon: Coffee, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', activeBtn: 'bg-teal-500 hover:bg-teal-600' },
    longBreak: { id: 'longBreak' as const, label: '長めの休憩', time: bs.longBreak * 60, icon: BatteryCharging, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', activeBtn: 'bg-blue-500 hover:bg-blue-600' },
  };
}
export type Modes = ReturnType<typeof buildModes>;

// ─── LocalStorage ───
export const LS_KEYS = {
  tasks: 'pomodoro_tasks',
  lastDate: 'pomodoro_lastDate',
  history: 'pomodoro_history',
  activeDays: 'harmonicRadiation_activeDays',
  breakSettings: 'pomodoro_breakSettings',
  workLog: 'pomodoro_workLog',
};

export function loadFromLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

// ─── Notification ───
export function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

// ─── Quotes ───
export const MOTIVATIONAL_QUOTES = [
  "「進み続けよ。決して立ち止まってはならない。」- スティーブ・ジョブズ",
  "「失敗は、より賢く再挑戦するための良い機会である。」- ヘンリー・フォード",
  "「未来を予測する最良の方法は、それを発明することだ。」- アラン・ケイ",
  "「小さいことを重ねることが、とんでもないところに行くただひとつの道だ。」- イチロー",
  "「私は失敗したことがない。ただ、1万通りのうまく行かない方法を見つけただけだ。」- エジソン",
  "「行動を起こさなければ、何も始まらない。」- アインシュタイン",
  "「準備しておこう。チャンスはいつか訪れるものだ。」- エイブラハム・リンカーン",
  "「成功とは、失敗から失敗へと情熱を失わずに進むことである。」- チャーチル",
  "「今日逃げたら、明日はもっと逃げたくなる。」- ゲーテ",
  "「限界を決めるのは、いつも自分の思い込みだ。」- 盛田昭夫",
  "「できると思えばできる、できないと思えばできない。」- ヘンリー・フォード",
  "「夢を見るから、人生は輝く。」- モーツァルト",
  "「何かを始めるのに、完璧である必要はない。」- ジグ・ジグラー",
  "「人生とは、今日一日のことである。」- カーネギー",
];

// ─── Placeholders ───
export const TASK_PLACEHOLDERS = [
  "例: 企画書を作成する...",
  "例: TOEIC リスニング対策...",
  "例: レポート第3章の執筆...",
  "例: プレゼン資料のデザイン...",
  "例: 旅行計画のリサーチ...",
  "例: コードレビューを完了...",
  "例: 資格試験の過去問演習...",
  "例: メール返信をまとめる...",
  "例: ポートフォリオ更新...",
  "例: 読書ノートを整理...",
];

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── App State ───
export type AppState = 'planning' | 'review' | 'running';
