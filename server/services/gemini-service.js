/**
 * Gemini Service — AI-powered match explanations and anomaly detection.
 *
 * CRITICAL RULES (Requirements 2 & 3):
 * - Gemini only EXPLAINS the pre-computed deterministic match data.
 * - Gemini must NEVER change the score, override hard gates, invent route overlap,
 *   invent timing compatibility, call a poor match a strong/great match, or recommend an invalid match.
 * - Match quality labels MUST correspond strictly to deterministic score thresholds:
 *     90–100: Excellent match
 *     80–89:  Strong match
 *     60–79:  Compatible commute
 *     40–59:  Weak compatibility
 *     0–39:   Not suitable (MUST state clearly it is not suitable)
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
 * Generate an honest, truthful match explanation using Gemini.
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

    const prompt = `You are a truthful, transparent mobility assistant for PO → PO (peer-to-peer existing commute sharing).
Analyze this deterministic match data and write a concise, strictly factual explanation of why these two commuters are or are not compatible.

CRITICAL RULES:
1. DO NOT exaggerate. DO NOT say "Great match", "Strong match", or "Excellent match" unless finalScore is 80 or above.
2. If finalScore is below 40, explicitly say it is "Not a suitable match" and explain the exact numerical deficiencies (detour, destination gap, or timing).
3. If finalScore is between 40 and 59, state it has "Weak compatibility".
4. If finalScore is between 60 and 79, describe it as a "Compatible commute".
5. Mention the exact numbers provided: route overlap (${matchData.routeOverlap}%), destination distance (${matchData.destinationDistanceKm || 0} km), and detour (${matchData.detourKm || 0} km).
6. Keep it under 60 words.

Deterministic Data:
${JSON.stringify(matchData, null, 2)}

Return your response strictly as JSON: {"explanation": "..."}`;

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
        maxOutputTokens: 150,
        temperature: 0.2, // Lower temperature for strict factual accuracy
      },
    });

    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (!parsed.explanation || typeof parsed.explanation !== 'string') {
      return generateFallbackExplanation(matchData);
    }

    return { explanation: parsed.explanation };
  } catch (err) {
    console.warn('[GEMINI] Explanation generation failed, using truthful fallback:', err.message);
    return generateFallbackExplanation(matchData);
  }
}

/**
 * Truthful, deterministic fallback explanation when Gemini is offline.
 * Never fabricates positivity for weak scores.
 */
function generateFallbackExplanation(matchData) {
  const score = Math.round(matchData.finalScore || 0);
  const routeOverlap = Math.round(matchData.routeOverlap || 0);
  const timeComp = Math.round(matchData.timeCompatibility || 0);
  const detour = matchData.detourKm !== undefined ? `${matchData.detourKm} km` : 'minimal';
  const destGap = matchData.destinationDistanceKm !== undefined ? `${matchData.destinationDistanceKm} km` : '0 km';

  if (score < 40) {
    return {
      explanation: `Not a suitable match. Route overlap is ${routeOverlap}%, timing compatibility is ${timeComp}%, destination gap is ${destGap} and estimated detour is ${detour}.`,
    };
  }

  if (score < 60) {
    return {
      explanation: `Weak compatibility (${score}%). Route overlap is ${routeOverlap}% with an estimated detour of ${detour} and ${destGap} destination gap.`,
    };
  }

  if (score < 80) {
    return {
      explanation: `Compatible commute (${score}%). Offers ${routeOverlap}% corridor overlap with an acceptable detour of ${detour}.`,
    };
  }

  if (score < 90) {
    return {
      explanation: `Strong match (${score}%). Strong route alignment with ${routeOverlap}% overlap, convenient timing (${timeComp}%), and only ${detour} detour.`,
    };
  }

  return {
    explanation: `Excellent match (${score}%). Near-identical commute route with ${routeOverlap}% overlap, matching schedule, and negligible detour.`,
  };
}

/**
 * Anomaly detection
 */
async function detectAnomalies(tripData) {
  const ai = getGenAI();
  if (!ai) {
    return { anomalies: [], riskLevel: 'low', note: 'Anomaly detection requires Gemini API' };
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `As a safety analyst for PO → PO commute sharing, analyze this trip data for anomalies: ${JSON.stringify(tripData)}. Return JSON with "anomalies" (array of strings) and "riskLevel" ("low"|"medium"|"high").`;
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 200,
        temperature: 0.1,
      },
    });
    return JSON.parse(result.response.text());
  } catch (err) {
    return { anomalies: [], riskLevel: 'low' };
  }
}

module.exports = { generateMatchExplanation, detectAnomalies, generateFallbackExplanation };
