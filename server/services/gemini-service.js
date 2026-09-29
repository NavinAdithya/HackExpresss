/**
 * Gemini Service — AI-powered match explanations and anomaly detection.
 *
 * Gemini is NOT the primary matching engine.
 * The backend first computes deterministic data, then Gemini
 * receives structured data and returns a JSON explanation.
 *
 * Falls back to template-based explanations if GEMINI_API_KEY is not set.
 */

let genAI = null;

function getGenAI() {
  if (genAI) return genAI;
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI;
  } catch (err) {
    console.warn('[GEMINI] Failed to initialize:', err.message);
    return null;
  }
}

/**
 * Generate a human-readable match explanation using Gemini.
 * @param {Object} matchData - Pre-computed deterministic match data
 * @returns {{ explanation: string }}
 */
async function generateMatchExplanation(matchData) {
  const ai = getGenAI();

  if (!ai) {
    return generateFallbackExplanation(matchData);
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a ride-sharing match assistant for PO → PO. 
Given this deterministic match data, write a brief, friendly, one-paragraph explanation 
of why these two riders are compatible. Be specific about the numbers. Keep it under 100 words.

Match data: ${JSON.stringify(matchData)}

Return your response as a JSON object with a single "explanation" field.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            explanation: { type: 'STRING' },
          },
          required: ['explanation'],
        },
        maxOutputTokens: 200,
        temperature: 0.7,
      },
    });

    const text = result.response.text();
    const parsed = JSON.parse(text);

    // Validate response structure
    if (!parsed.explanation || typeof parsed.explanation !== 'string') {
      return generateFallbackExplanation(matchData);
    }

    return { explanation: parsed.explanation };
  } catch (err) {
    console.warn('[GEMINI] Explanation generation failed:', err.message);
    return generateFallbackExplanation(matchData);
  }
}

/**
 * Generate anomaly detection insights using Gemini (PRO feature).
 * @param {Object} tripData - Trip and user behavior data
 * @returns {{ anomalies: Array, riskLevel: string }}
 */
async function detectAnomalies(tripData) {
  const ai = getGenAI();

  if (!ai) {
    return { anomalies: [], riskLevel: 'low', note: 'Anomaly detection requires Gemini API' };
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `As a safety analyst for a ride-sharing platform, analyze this trip data 
for any anomalies or safety concerns. Return a JSON object with "anomalies" (array of strings) 
and "riskLevel" (low/medium/high).

Trip data: ${JSON.stringify(tripData)}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            anomalies: { type: 'ARRAY', items: { type: 'STRING' } },
            riskLevel: { type: 'STRING' },
          },
          required: ['anomalies', 'riskLevel'],
        },
        maxOutputTokens: 300,
        temperature: 0.3,
      },
    });

    return JSON.parse(result.response.text());
  } catch (err) {
    console.warn('[GEMINI] Anomaly detection failed:', err.message);
    return { anomalies: [], riskLevel: 'low' };
  }
}

/**
 * Fallback explanation when Gemini is unavailable.
 */
function generateFallbackExplanation(matchData) {
  const parts = [];

  if (matchData.routeOverlap !== undefined) {
    parts.push(`${matchData.routeOverlap}% route overlap`);
  }
  if (matchData.timeCompatibility !== undefined) {
    parts.push(`${matchData.timeCompatibility}% timing compatibility`);
  }
  if (matchData.capacityCompatible) {
    parts.push('seats available');
  }
  if (matchData.budgetCompatible) {
    parts.push('budget compatible');
  }

  const explanation = parts.length > 0
    ? `Great match! ${parts.join(', ')}. This ride offers a strong combination of route alignment and scheduling flexibility.`
    : 'Compatible ride based on your preferences.';

  return { explanation };
}

module.exports = { generateMatchExplanation, detectAnomalies, generateFallbackExplanation };
