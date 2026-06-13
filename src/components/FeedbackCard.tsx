import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, TrendingUp, Lightbulb, Calculator, GitMerge, Award } from 'lucide-react';
import { EvaluationResult } from '../utils/evaluation';

interface FeedbackCardProps {
  result: EvaluationResult;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({ result }) => {
  const scoreConfig = [
    { key: 'logic', label: '論理性 (MECE)', icon: GitMerge, color: 'text-blue-500', bg: 'bg-blue-500' },
    { key: 'kpi', label: 'KPIの妥当性', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500' },
    { key: 'calculation', label: '計算力・概算', icon: Calculator, color: 'text-amber-500', bg: 'bg-amber-500' },
    { key: 'originality', label: '独創性・視点', icon: Lightbulb, color: 'text-purple-500', bg: 'bg-purple-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border dark:border-slate-800/80 dark:bg-slate-900/15 bg-white border-slate-200 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent p-6 border-b dark:border-slate-800 border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">AI評価フィードバック</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">あなたの回答に対する多角的な分析</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black font-display bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            {result.overallScore} <span className="text-sm font-medium text-slate-400">/ 10</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">総合スコア</div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Scores Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scoreConfig.map(({ key, label, icon: Icon, color, bg }) => {
            const score = result.scores[key as keyof typeof result.scores];
            return (
              <div key={key} className="rounded-xl border p-4 dark:border-slate-800 dark:bg-slate-900/30 bg-slate-50 flex flex-col items-center text-center space-y-3">
                <Icon className={`h-6 w-6 ${color}`} />
                <div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{label}</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">{score}<span className="text-xs text-slate-400 font-normal">/10</span></div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(score / 10) * 100}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`h-full ${bg} rounded-full`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Feedback Points */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              良かった点 (Good)
            </h4>
            <ul className="space-y-2">
              {result.feedback.goodPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 p-3 rounded-lg leading-relaxed">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              改善点 (Needs Improvement)
            </h4>
            <ul className="space-y-2">
              {result.feedback.improvementPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 p-3 rounded-lg leading-relaxed">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* AI Improved Answer Example */}
        <div className="mt-4 p-5 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
            <Lightbulb className="h-4 w-4" />
            AIからのアドバイス・回答の方向性
          </h4>
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {result.improvedAnswerExample}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
