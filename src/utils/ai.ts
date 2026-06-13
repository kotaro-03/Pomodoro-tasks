import OpenAI from 'openai';
import { Question } from '../data';

const STORAGE_KEY = 'casemind_openai_api_key';

export const getApiKey = () => localStorage.getItem(STORAGE_KEY) || '';
export const setApiKey = (key: string) => localStorage.setItem(STORAGE_KEY, key);

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const getSystemPrompt = (question: Question): string => {
  return `
# あなたの役割
あなたはトップティアの戦略コンサルタントであり、ケース面接の厳しい面接官です。ユーザーとケース問題を解くための「議論」を行ってください。

# 取り組むケース問題
【問題タイトル】: ${question.title}
【問題概要】: ${question.description}
【カテゴリ】: ${question.category}

# 対話ルール
1. 【深掘り】ユーザーの回答に対し、まずは「なぜその数値（変数）を用いたのか？」「他に考慮すべき要因はないか？」と問いかけ、論理の穴を突いてください。
2. 【議論の誘導】単に正解を教えるのではなく、ユーザー自身に気づきを促すようなヒント（「もしターゲット層をXXに変えたら、売上はどう変動する？」など）を出してください。
3. 【構造の提示】議論が発散したら、適宜「ここまでで、XXという前提とYYという変数で整理できましたね。次はコスト面について考えましょう」と議論をまとめ上げてください。
4. 【評価基準】
   - MECE（漏れなくダブリなく）であるか
   - 仮説の説得力
   - 具体性（数値への落とし込み）

# ユーザーへの対応手順
- ユーザーが回答を送信するたびに、以下の3段階で返信してください。
  1. フィードバック：論理の強みと弱みを指摘（厳しく！）
  2. 深掘りの問い：次のステップを促す質問
  3. 議論のヒント：必要であれば、適切なフレームワークを一つだけ提案

# 禁止事項
- 一度の返信で、問題のすべての答えを教えないこと。あくまで「壁打ち相手」として議論をリードすること。
- マークダウンを多用しすぎず、読みやすいテキストを心がけること。
`;
};

export const chatWithAI = async (
  apiKey: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void
): Promise<string> => {
  if (!apiKey) {
    throw new Error('API Key is missing');
  }

  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true // This is required for client-side API calls
  });

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      onChunk(fullResponse);
    }

    return fullResponse;
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    throw new Error(error.message || 'API通信中にエラーが発生しました。');
  }
};
