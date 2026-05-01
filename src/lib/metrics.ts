import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

// Precios estimados (USD por 1M tokens) para Gemini 2.5 Flash
const PRICING = {
  input: 0.10,  // $0.10 por millón de tokens
  output: 0.40, // $0.40 por millón de tokens
};

/**
 * Estima tokens y registra el uso de IA para auditoría de costos.
 */
export async function logAiUsage(
  firestore: Firestore,
  model: string,
  input: string,
  output: string,
  userId: string
) {
  try {
    // Estimación rápida: ~4 caracteres por token
    const inputTokens = Math.ceil(input.length / 4);
    const outputTokens = Math.ceil(output.length / 4);
    const totalTokens = inputTokens + outputTokens;

    const cost = ((inputTokens / 1000000) * PRICING.input) + ((outputTokens / 1000000) * PRICING.output);

    await addDoc(collection(firestore, 'system_metrics'), {
      type: 'ai_usage',
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost: cost,
      cost: cost,
      userId,
      timestamp: serverTimestamp()
    });
    
    return { totalTokens, estimatedCost: cost };
  } catch (error) {
    console.error('Error logging AI usage:', error);
    return null;
  }
}
