import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

// Precios estimados (USD por 1M tokens) - Ajustar según modelo usado
const PRICING = {
  'gemini-1.5-pro': { input: 3.5, output: 10.5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'default': { input: 1.0, output: 3.0 }
};

export async function logAiUsage(model: string, inputTokens: number, outputTokens: number, userId: string) {
  try {
    const modelPricing = (PRICING as any)[model] || PRICING.default;
    const cost = ((inputTokens / 1000000) * modelPricing.input) + ((outputTokens / 1000000) * modelPricing.output);

    await addDoc(collection(db, 'system_metrics'), {
      type: 'ai_usage',
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost,
      userId,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error logging AI usage:', error);
  }
}
