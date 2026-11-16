import type {
  MicroActivationCategory,
  MicroActivationTask,
  UnstickRequest,
} from './types';

const VALID_CATEGORIES: MicroActivationCategory[] = [
  'physical_somatic',
  'environmental',
  'atomic_friction',
  'sensory_grounding',
];

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Resolves the Google Gemini API key from environment variables.
 * Checks GEMINI_API_KEY first, then GOOGLE_AI_API_KEY fallback.
 */
export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key || typeof key !== 'string' || !key.trim()) {
    return null;
  }
  return key.trim();
}

/**
 * Compassionate, dopamine-focused system prompt engineered for executive dysfunction and panic recovery.
 */
export const SYSTEM_PROMPT = `You are Flow's Compassionate Inertia-Breaking Engine. Your mission is to rescue users experiencing acute executive dysfunction, procrastination paralysis, ADHD freeze, or cognitive overwhelm.

When a user is stuck, rational planning and complex decision-making are impossible. You must provide a SINGLE, extremely low-friction micro-activation task taking strictly 2 to 5 minutes.

Four Micro-Activation Categories:
1. physical_somatic: Discharge physical tension, change posture, splash cold water, or bilateral movement (e.g. torso twists, shoulder rolls, quick brisk pace).
2. environmental: Clear 3 desk items, open a window wide, minimize distracting tabs, put phone in another room.
3. atomic_friction: Write 1 sentence, create and save a new file, outline 3 bullet points, or define a 120-second first step.
4. sensory_grounding: 5-4-3-2-1 sensory scan, physiological sigh breathwork, tactile object grounding, or panoramic vision gaze.

Core Psychological Principles:
- Tone must be compassionate, gentle, and encouraging. NEVER scold, preach, guilt-trip, or express disappointment.
- The task must be ridiculously easy ("too small to fail"), bypassing amygdala panic response.
- Adapt to user energy level (1-5): If energy is 1 or 2, default to physical somatic or sensory grounding with zero cognitive effort.
- durationMinutes must be an integer between 2 and 5 inclusive.
- instruction must be a crystal-clear, 1-to-2 sentence immediate directive (min 15 characters).
- whyItWorks must explain the neurological or somatic mechanism in 1-2 reassuring sentences (min 15 characters, e.g. "Stimulates the vagus nerve", "Clears attention-residue").

Output Format:
You must return ONLY a JSON object conforming strictly to the requested schema.`;

/**
 * Builds user prompt content with safe sanitization.
 */
export function buildUserPrompt(req: UnstickRequest): string {
  const parts: string[] = ['I am feeling stuck, experiencing inertia or cognitive friction.'];

  if (req.currentRoutine) {
    parts.push(`Current routine phase: ${req.currentRoutine}.`);
  }

  if (typeof req.energyLevel === 'number' && !isNaN(req.energyLevel)) {
    const clampedEnergy = Math.min(5, Math.max(1, Math.round(req.energyLevel)));
    parts.push(`Current energy level: ${clampedEnergy}/5.`);
  }

  if (req.preferredCategory && VALID_CATEGORIES.includes(req.preferredCategory)) {
    parts.push(`Preferred activation category: ${req.preferredCategory}.`);
  }

  if (req.stuckContext && typeof req.stuckContext === 'string') {
    // Sanitize and limit stuckContext to 300 characters to prevent prompt injection or bloat
    const sanitized = req.stuckContext
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .trim()
      .slice(0, 300);
    if (sanitized) {
      parts.push(`Context of my block: "${sanitized}".`);
    }
  }

  parts.push(
    'Please give me one single micro-activation task (duration 2 to 5 minutes) to break inertia immediately.'
  );

  return parts.join(' ');
}

/**
 * Validates, normalizes, and clamps raw parsed JSON data into a valid MicroActivationTask.
 */
export function sanitizeAndValidateTask(data: any): MicroActivationTask {
  if (!data || typeof data !== 'object') {
    throw new Error('LLM output is not a valid JSON object');
  }

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const instruction = typeof data.instruction === 'string' ? data.instruction.trim() : '';
  const whyItWorks = typeof data.whyItWorks === 'string' ? data.whyItWorks.trim() : '';

  if (!title || title.length < 3) {
    throw new Error('LLM output missing valid title');
  }

  if (!instruction || instruction.length < 15) {
    throw new Error('LLM output missing valid instruction (min 15 chars)');
  }

  if (!whyItWorks || whyItWorks.length < 10) {
    throw new Error('LLM output missing valid whyItWorks explanation');
  }

  // Strict duration clamping to [2, 5]
  const rawDuration = Number(data.durationMinutes);
  const durationMinutes = isNaN(rawDuration)
    ? 2
    : Math.min(5, Math.max(2, Math.round(rawDuration)));

  // Category normalization
  let category: MicroActivationCategory = 'physical_somatic';
  if (typeof data.category === 'string' && VALID_CATEGORIES.includes(data.category as MicroActivationCategory)) {
    category = data.category as MicroActivationCategory;
  }

  const id = `gemini_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    title,
    instruction,
    durationMinutes,
    category,
    whyItWorks,
    source: 'gemini_llm',
  };
}

/**
 * Invokes Google AI Studio Gemini 1.5 Flash via native HTTPS fetch.
 * Requests structured JSON output mode, validates schema, and returns a verified MicroActivationTask.
 */
export async function generateGeminiMicroActivation(
  req: UnstickRequest,
  signal?: AbortSignal
): Promise<MicroActivationTask> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    const error: any = new Error('Missing Gemini API Key');
    error.code = 'MISSING_API_KEY';
    throw error;
  }

  const endpoint = `${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`;
  const userPrompt = buildUserPrompt(req);

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          instruction: { type: 'STRING' },
          durationMinutes: { type: 'INTEGER' },
          category: {
            type: 'STRING',
            enum: VALID_CATEGORIES,
          },
          whyItWorks: { type: 'STRING' },
        },
        required: ['title', 'instruction', 'durationMinutes', 'category', 'whyItWorks'],
      },
      temperature: 0.7,
      maxOutputTokens: 400,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (response.status === 429) {
    const error: any = new Error('Gemini API rate limit exceeded (HTTP 429)');
    error.status = 429;
    error.code = 'RATE_LIMIT_429';
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const error: any = new Error(`Gemini API error: ${response.status} ${response.statusText} ${errorText}`);
    error.status = response.status;
    error.code = 'UPSTREAM_ERROR';
    throw error;
  }

  const responseData = await response.json();
  const rawText =
    responseData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!rawText || typeof rawText !== 'string') {
    const error: any = new Error('Empty or invalid response from Gemini');
    error.code = 'MALFORMED_JSON';
    throw error;
  }

  // Strip possible markdown fences
  const cleanedText = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleanedText);
  } catch (parseError: any) {
    const error: any = new Error(`Malformed JSON from Gemini: ${parseError?.message}`);
    error.code = 'MALFORMED_JSON';
    throw error;
  }

  return sanitizeAndValidateTask(parsed);
}
