/**
 * Server-side Vehicle Intelligence handler.
 * Shared between Vercel Serverless Functions and Vite dev server middleware.
 */
export async function handleVehicleIntelligence({ query, vehicleContext, apiKey }) {
  console.log(`[Vehicle Intelligence] Query: "${query}", hasApiKey=${!!apiKey}`);

  if (!apiKey) {
    return {
      success: false,
      fallbackRequired: true,
      reason: 'No API key configured'
    };
  }

  const prompt = `You are CARMA's vehicle-history intelligence assistant.
Answer questions using ONLY the documented vehicle information provided in the context below.

CONTEXT:
${JSON.stringify(vehicleContext, null, 2)}

USER QUESTION:
"${query}"

CRITICAL GROUNDING AND ANTI-HALLUCINATION RULES:
1. Answer using ONLY the documented vehicle information provided in the context.
2. NEVER invent, extrapolate, or infer undocumented service events, mileage, costs, dates, components, repairs, replacements, or vehicle facts.
3. NEVER assume that the absence of a record means the event never occurred.
   - If a record or component history is not documented in the context, explicitly state that CARMA does not have a documented record of that.
   - Distinguish "not documented" from "never happened". (e.g. say "CARMA does not have a documented engine repair in the records available." NOT "The engine has never been repaired.")
4. When referring to documented service events, include the component name, date, mileage, and cost when available in the records.
5. If the user asks about replacements, summarize ONLY the components that have documented Replacement records.
6. If the user asks about spend or costs, use the documented figures.
7. Keep answers concise, direct, professional, and useful. Avoid conversational fluff, chatbot filler, or generic advice.
8. If the answer refers to or specifically answers about a known vehicle component from the records or components list, provide its componentId (e.g. "tyre-front-left", "tail-light", "headlight-right", "rear-glass", "steering", etc.) so CARMA can link to it in 3D.

Return ONLY a valid JSON object with this exact schema:
{
  "answer": string,
  "referencedComponentId": string | null,
  "referencedComponentName": string | null,
  "referencedRecordId": string | null
}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        })
      }
    );

    if (geminiRes.ok) {
      const geminiData = await geminiRes.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return {
          success: true,
          answer: parsed.answer,
          referencedComponentId: parsed.referencedComponentId || null,
          referencedComponentName: parsed.referencedComponentName || null,
          referencedRecordId: parsed.referencedRecordId || null,
          engine: 'gemini-1.5-flash'
        };
      }
    }

    const errText = await geminiRes.text();
    console.warn(`[Vehicle Intelligence] Gemini API call failed (${geminiRes.status}):`, errText);
    return {
      success: false,
      fallbackRequired: true,
      error: errText
    };
  } catch (err) {
    console.error('[Vehicle Intelligence] Server error:', err);
    return {
      success: false,
      fallbackRequired: true,
      error: err.message
    };
  }
}
