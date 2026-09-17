import { env, geminiEnabled } from '../../config/env.js';
import { BadRequestError, AppError } from '../../shared/errors/AppError.js';
import { ErrorCode, HttpStatus } from '../../shared/errors/errorCodes.js';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Strip markdown code fences a model sometimes wraps JSON in. */
function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

/**
 * Call Gemini and parse the response as structured JSON. We request
 * `responseMimeType: application/json` so the model returns valid JSON, then
 * defensively strip fences before parsing.
 */
export async function generateJson<T>(prompt: string, temperature = 0.4): Promise<T> {
  if (!geminiEnabled) {
    throw new BadRequestError('AI features are not configured on this server (missing GEMINI_API_KEY).');
  }

  const url = `${BASE_URL}/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, responseMimeType: 'application/json' },
      }),
    });
  } catch {
    throw new AppError('Failed to reach the AI service', HttpStatus.INTERNAL, ErrorCode.INTERNAL);
  }

  if (!res.ok) {
    throw new AppError(`AI service error (${res.status})`, HttpStatus.INTERNAL, ErrorCode.INTERNAL);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new AppError('AI service returned an empty response', HttpStatus.INTERNAL, ErrorCode.INTERNAL);

  try {
    return JSON.parse(stripFences(text)) as T;
  } catch {
    throw new AppError('AI service returned malformed JSON', HttpStatus.INTERNAL, ErrorCode.INTERNAL);
  }
}
