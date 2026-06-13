import { Question } from '../data';

export interface EvaluationResult {
  scores: {
    logic: number;
    kpi: number;
    calculation: number;
    originality: number;
  };
  overallScore: number;
  feedback: {
    goodPoints: string[];
    improvementPoints: string[];
  };
  improvedAnswerExample: string;
}

/**
 * 疑似的なAI評価関数
 * 実際のLLM APIを呼び出さず、入力の長さやキーワード一致度に基づいて
 * 評価結果（JSON形式）を生成します。
 */
export async function evaluateAnswer(question: Question, userAnswers: string[]): Promise<EvaluationResult> {
  // 実際のAPI通信の代わりとなる擬似的な遅延（AIが思考しているように見せる）
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const allUserText = userAnswers.join('\n');
  const allModelText = Object.values(question.modelAnswer).join('\n');

  // 1. 論理性 (Logic) - 0~10
  // 文字数、改行や箇条書きの利用頻度から推測
  let logicScore = 4;
  if (allUserText.length > 200) logicScore += 2;
  if (allUserText.length > 400) logicScore += 2;
  if (allUserText.includes('・') || allUserText.includes('1.') || allUserText.includes('①')) logicScore += 2;
  logicScore = Math.min(10, logicScore);
  if (allUserText.length < 50) logicScore = Math.max(1, logicScore - 4);

  // 2. KPIの妥当性 (KPI) - 0~10
  // 模範解答に含まれる名詞キーワードがユーザーの回答にどれくらい含まれるか
  const keywords = extractKeywords(allModelText);
  const matchedKeywords = keywords.filter((kw) => allUserText.includes(kw));
  const matchRate = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;
  let kpiScore = Math.min(10, Math.floor(matchRate * 10) + 3);
  if (allUserText.length < 50) kpiScore = Math.max(1, kpiScore - 3);

  // 3. 計算力 (Calculation) - 0~10
  // 数字が含まれているか。フェルミ推定の場合は厳しめにチェック。
  const hasNumbers = /\d+/.test(allUserText);
  const hasUnits = /万|億|兆|円|人|個|倍|%/.test(allUserText);
  let calcScore = 5;
  if (hasNumbers) calcScore += 2;
  if (hasUnits) calcScore += 2;
  if (question.type === 'fermi') {
    if (!hasNumbers || !hasUnits) {
      calcScore = 2; // フェルミ推定で数字や単位がないのは致命的
    } else if (allUserText.length > 300) {
      calcScore = Math.min(10, calcScore + 2);
    }
  } else {
    // ケース問題の場合はそこまで重視しないが、数字があれば加点
    if (hasNumbers) calcScore = Math.min(10, calcScore + 1);
  }
  if (allUserText.length < 50) calcScore = Math.max(1, calcScore - 3);

  // 4. 独創性 (Originality) - 0~10
  // テキストの長さと、模範解答に含まれない独自の語彙が含まれているかを擬似的に評価
  let orgScore = Math.min(10, Math.floor(allUserText.length / 100) + 3);
  if (allUserText.length < 50) orgScore = Math.max(1, orgScore - 2);

  const overallScore = Math.round((logicScore + kpiScore + calcScore + orgScore) / 4);

  // フィードバック生成
  const goodPoints: string[] = [];
  const improvementPoints: string[] = [];

  if (logicScore >= 7) {
    goodPoints.push('構造化された論理展開ができており、MECEな分解が意識されています。');
  } else {
    improvementPoints.push('要素を分解する際に、箇条書きなどを活用して構造的に整理するとより説得力が増します。');
  }

  if (kpiScore >= 7) {
    goodPoints.push('課題の核心を突くKPIを設定できており、模範的なアプローチと方向性が合致しています。');
  } else {
    improvementPoints.push('目的達成のための変数が少しずれている可能性があります。どの指標を動かすべきか再考してみましょう。');
  }

  if (question.type === 'fermi') {
    if (calcScore >= 8) {
      goodPoints.push('現実的な数値感と単位を用いて、妥当な概算ロジックが組み立てられています。');
    } else {
      improvementPoints.push('フェルミ推定としての数値検証が不足しています。各変数の仮定値を明記し、計算過程を示しましょう。');
    }
  } else {
    if (orgScore >= 7) {
      goodPoints.push('一般的な枠組みにとらわれない、柔軟で多角的な視点からの施策が提案されています。');
    } else {
      improvementPoints.push('施策がやや一般的です。自社の強みや競合との差別化要素を意識した独自性のあるアイデアを加えてみましょう。');
    }
  }

  // 総合的なフォローバック
  if (overallScore >= 8) {
    goodPoints.push('全体的に非常にレベルの高い回答です。コンサルティング面接でも高く評価される水準です。');
  } else if (overallScore <= 4) {
    improvementPoints.push('まずは模範解答の解説を読み込み、フレームワーク（3C, 4Pなど）の基本的な使い方を練習しましょう。');
  }

  return {
    scores: {
      logic: logicScore,
      kpi: kpiScore,
      calculation: calcScore,
      originality: orgScore,
    },
    overallScore,
    feedback: {
      goodPoints,
      improvementPoints,
    },
    improvedAnswerExample: `【AIによる改善案アプローチ】\n${question.modelAnswer.summary}\n\nあなたの回答の方向性は概ね良いですが、上記のポイントを意識して論理を組み立てると、さらに説得力のある回答になります。特にKPIの設定や、課題のボトルネック特定において「なぜその指標が重要なのか」を深堀りしてみてください。`,
  };
}

/**
 * 簡易的なキーワード抽出（名詞っぽいものを抽出する疑似ロジック）
 */
function extractKeywords(text: string): string[] {
  // 非常に簡易的な抽出。カタカナ語、漢字2文字以上の熟語を抽出
  const matches = text.match(/[一-龯]{2,}|[ァ-ンヴー]{2,}/g);
  if (!matches) return [];
  // 重複排除して返す（上位の重要なものに絞るため長めの単語を優先しても良いが、ここでは単純にユニーク化）
  return Array.from(new Set(matches)).filter(kw => kw.length >= 2 && kw.length <= 6);
}
