import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getGeminiApiKey,
  buildUserPrompt,
  sanitizeAndValidateTask,
  generateGeminiMicroActivation,
} from '@/lib/unstick/gemini-client';

describe('Gemini 1.5 Flash Client Unit Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('API Key Resolution', () => {
    it('returns null when neither GEMINI_API_KEY nor GOOGLE_AI_API_KEY is defined', () => {
      expect(getGeminiApiKey()).toBeNull();
    });

    it('resolves GEMINI_API_KEY when defined', () => {
      process.env.GEMINI_API_KEY = 'test_gemini_key_123';
      expect(getGeminiApiKey()).toBe('test_gemini_key_123');
    });

    it('falls back to GOOGLE_AI_API_KEY when GEMINI_API_KEY is not defined', () => {
      process.env.GOOGLE_AI_API_KEY = 'test_google_key_456';
      expect(getGeminiApiKey()).toBe('test_google_key_456');
    });

    it('prioritizes GEMINI_API_KEY over GOOGLE_AI_API_KEY', () => {
      process.env.GEMINI_API_KEY = 'primary_key';
      process.env.GOOGLE_AI_API_KEY = 'fallback_key';
      expect(getGeminiApiKey()).toBe('primary_key');
    });
  });

  describe('Prompt Builder & Sanitization', () => {
    it('constructs prompt with full contextual parameters', () => {
      const prompt = buildUserPrompt({
        currentRoutine: 'day_momentum',
        energyLevel: 3,
        preferredCategory: 'atomic_friction',
        stuckContext: 'Stuck on writing tests for authentication',
      });

      expect(prompt).toContain('Current routine phase: day_momentum');
      expect(prompt).toContain('Current energy level: 3/5');
      expect(prompt).toContain('Preferred activation category: atomic_friction');
      expect(prompt).toContain('Stuck on writing tests for authentication');
    });

    it('truncates stuckContext to 300 characters to prevent prompt injection and bloat', () => {
      const longContext = 'A'.repeat(500);
      const prompt = buildUserPrompt({
        stuckContext: longContext,
      });

      expect(prompt).toContain('A'.repeat(300));
      expect(prompt).not.toContain('A'.repeat(301));
    });

    it('clamps energyLevel to [1, 5] in prompt builder', () => {
      const promptHigh = buildUserPrompt({ energyLevel: 99 });
      expect(promptHigh).toContain('5/5');

      const promptLow = buildUserPrompt({ energyLevel: -10 });
      expect(promptLow).toContain('1/5');
    });
  });

  describe('Task Sanitization & Boundary Clamping', () => {
    it('sanitizes valid task and sets source to gemini_llm', () => {
      const raw = {
        title: 'Micro Torso Rotation',
        instruction: 'Stand up and gently twist your torso 15 times to activate circulation.',
        durationMinutes: 3,
        category: 'physical_somatic',
        whyItWorks: 'Engages proprioceptive spinal loops to break stationary lethargy.',
      };

      const task = sanitizeAndValidateTask(raw);
      expect(task.title).toBe(raw.title);
      expect(task.instruction).toBe(raw.instruction);
      expect(task.durationMinutes).toBe(3);
      expect(task.category).toBe('physical_somatic');
      expect(task.whyItWorks).toBe(raw.whyItWorks);
      expect(task.source).toBe('gemini_llm');
      expect(task.id).toMatch(/^gemini_\d+_[a-z0-9]+$/);
    });

    it('clamps durationMinutes < 2 to 2', () => {
      const raw = {
        title: 'Quick Shakeout',
        instruction: 'Shake your hands vigorously for 30 seconds to wake up motor circuits.',
        durationMinutes: 1,
        category: 'physical_somatic',
        whyItWorks: 'Stimulates peripheral blood flow.',
      };

      const task = sanitizeAndValidateTask(raw);
      expect(task.durationMinutes).toBe(2);
    });

    it('clamps durationMinutes > 5 to 5', () => {
      const raw = {
        title: 'Extended Stretch',
        instruction: 'Perform an extended whole-body yoga flow across your entire room.',
        durationMinutes: 12,
        category: 'physical_somatic',
        whyItWorks: 'Elongates contracted muscle fibers.',
      };

      const task = sanitizeAndValidateTask(raw);
      expect(task.durationMinutes).toBe(5);
    });

    it('rounds floating duration values to nearest integer within [2, 5]', () => {
      const raw = {
        title: 'Desk Clear',
        instruction: 'Clear three distracting loose papers and sticky notes off your desk.',
        durationMinutes: 3.7,
        category: 'environmental',
        whyItWorks: 'Reduces visual clutter and extraneous working memory load.',
      };

      const task = sanitizeAndValidateTask(raw);
      expect(task.durationMinutes).toBe(4);
    });

    it('normalizes invalid category to physical_somatic', () => {
      const raw = {
        title: 'Sensory Reset',
        instruction: 'Focus on 5 concrete sensory observations in your room right now.',
        durationMinutes: 2,
        category: 'unrecognized_magic_category',
        whyItWorks: 'Interrupts internal cognitive rumination loops.',
      };

      const task = sanitizeAndValidateTask(raw);
      expect(task.category).toBe('physical_somatic');
    });

    it('throws validation error when required fields are missing or empty', () => {
      expect(() => sanitizeAndValidateTask(null)).toThrow('not a valid JSON object');
      expect(() =>
        sanitizeAndValidateTask({
          title: '',
          instruction: 'Valid instruction longer than fifteen chars',
          whyItWorks: 'Valid why it works explanation',
        })
      ).toThrow('missing valid title');

      expect(() =>
        sanitizeAndValidateTask({
          title: 'Valid Title',
          instruction: 'Too short',
          whyItWorks: 'Valid why it works explanation',
        })
      ).toThrow('missing valid instruction');

      expect(() =>
        sanitizeAndValidateTask({
          title: 'Valid Title',
          instruction: 'Valid instruction longer than fifteen chars',
          whyItWorks: 'Short',
        })
      ).toThrow('missing valid whyItWorks');
    });
  });

  describe('generateGeminiMicroActivation Remote Calls (Mocked fetch)', () => {
    it('throws MISSING_API_KEY when no key is configured', async () => {
      await expect(generateGeminiMicroActivation({})).rejects.toMatchObject({
        code: 'MISSING_API_KEY',
      });
    });

    it('successfully calls Gemini endpoint and parses structured JSON output', async () => {
      process.env.GEMINI_API_KEY = 'valid_test_api_key';

      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'One-Sentence Starter',
                    instruction: 'Open your draft and type just one single imperfect sentence.',
                    durationMinutes: 2,
                    category: 'atomic_friction',
                    whyItWorks: 'Starting is harder than continuing; breaks the activation energy barrier.',
                  }),
                },
              ],
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockGeminiResponse,
      } as any);

      const task = await generateGeminiMicroActivation({
        currentRoutine: 'day_momentum',
      });

      expect(task.source).toBe('gemini_llm');
      expect(task.title).toBe('One-Sentence Starter');
      expect(task.durationMinutes).toBe(2);
      expect(task.category).toBe('atomic_friction');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall[0]).toContain('gemini-1.5-flash:generateContent?key=valid_test_api_key');
    });

    it('strips markdown code blocks (```json ... ```) gracefully', async () => {
      process.env.GEMINI_API_KEY = 'valid_test_api_key';

      const wrappedJson = '```json\n{\n  "title": "Cold Water Splash",\n  "instruction": "Splash cool water on your face and wrists to stimulate dive reflex.",\n  "durationMinutes": 2,\n  "category": "physical_somatic",\n  "whyItWorks": "Mammalian dive reflex slows heart rate and resets autonomic tone."\n}\n```';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: wrappedJson }] } }],
        }),
      } as any);

      const task = await generateGeminiMicroActivation({});
      expect(task.title).toBe('Cold Water Splash');
      expect(task.category).toBe('physical_somatic');
    });

    it('throws RATE_LIMIT_429 error when Gemini returns HTTP 429', async () => {
      process.env.GEMINI_API_KEY = 'valid_test_api_key';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded',
      } as any);

      await expect(generateGeminiMicroActivation({})).rejects.toMatchObject({
        code: 'RATE_LIMIT_429',
        status: 429,
      });
    });

    it('throws UPSTREAM_ERROR when Gemini returns HTTP 500/503', async () => {
      process.env.GEMINI_API_KEY = 'valid_test_api_key';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Google upstream outage',
      } as any);

      await expect(generateGeminiMicroActivation({})).rejects.toMatchObject({
        code: 'UPSTREAM_ERROR',
        status: 503,
      });
    });

    it('throws MALFORMED_JSON when Gemini returns invalid or corrupted text', async () => {
      process.env.GEMINI_API_KEY = 'valid_test_api_key';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '<html>Internal server error</html>' }] } }],
        }),
      } as any);

      await expect(generateGeminiMicroActivation({})).rejects.toMatchObject({
        code: 'MALFORMED_JSON',
      });
    });
  });
});
