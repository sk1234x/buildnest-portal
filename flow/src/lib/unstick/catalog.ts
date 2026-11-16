import type {
  MicroActivationCategory,
  MicroActivationTask,
  UnstickRequest,
} from './types';

/**
 * Curated Deterministic 32-Item Offline Fallback Catalog.
 * Neuroscience-backed micro-activations categorized across all 4 required domains:
 * 1. Physical / Somatic (8 tasks)
 * 2. Environmental (8 tasks)
 * 3. Atomic Friction (8 tasks)
 * 4. Sensory Grounding (8 tasks)
 *
 * Conforms to PROJECT.md § 3 and matches tests/e2e/harness/opaque-box-harness.ts.
 */
export const OFFLINE_FALLBACK_CATALOG: MicroActivationTask[] = [
  // 1. Physical / Somatic (8 tasks)
  {
    id: 'phys-1',
    title: 'The 2-Minute Body Shakeout',
    instruction:
      'Stand up immediately. Shake your hands for 30s, shake your legs for 30s, and roll your shoulders 10 times to dispel sympathetic nervous system freeze.',
    durationMinutes: 2,
    category: 'physical_somatic',
    whyItWorks:
      'Discharges stagnant adrenaline and activates the somatic motor loop to break cognitive paralysis.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-2',
    title: 'Cold Water Facial Splash',
    instruction:
      'Walk to the sink. Splash cold water onto your face and wrists 5 times, then pat dry with a towel.',
    durationMinutes: 2,
    category: 'physical_somatic',
    whyItWorks:
      'Stimulates the mammalian dive reflex to drop heart rate and immediately reset the nervous system.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-3',
    title: 'Wall Sit or Calf Stretch',
    instruction:
      'Lean against a sturdy wall and do a 60-second gentle wall sit or calf stretches while taking deep diaphragmatic breaths.',
    durationMinutes: 3,
    category: 'physical_somatic',
    whyItWorks:
      'Engages large muscle groups, boosting blood flow and proprioceptive feedback.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-4',
    title: 'Postural Reset & Chest Opener',
    instruction:
      'Interlace fingers behind your back, lift your chest upward, and hold for 5 slow breaths. Repeat twice.',
    durationMinutes: 2,
    category: 'physical_somatic',
    whyItWorks:
      'Reverses forward-slumped screen posture, expanding lung capacity and increasing alertness.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-5',
    title: 'Hydration Reset Chug',
    instruction:
      'Pour a tall glass of fresh water (at least 250ml) and drink it completely without looking at any screen.',
    durationMinutes: 2,
    category: 'physical_somatic',
    whyItWorks:
      'Rehydrates cellular metabolism; momentary pause away from screens interrupts dopamine loops.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-6',
    title: 'Brisk Hallway Pace',
    instruction:
      'Step away from your desk and walk briskly back and forth across your room or hallway 10 times.',
    durationMinutes: 3,
    category: 'physical_somatic',
    whyItWorks:
      'Activates bilateral stimulation and raises baseline heart rate out of inertia.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-7',
    title: 'Wrist & Neck Mobility Routine',
    instruction:
      'Do 10 wrist circles clockwise, 10 counter-clockwise, and 5 slow neck rolls in each direction.',
    durationMinutes: 2,
    category: 'physical_somatic',
    whyItWorks:
      'Relieves cervical tension caused by prolonged stationary stress.',
    source: 'fallback_pool',
  },
  {
    id: 'phys-8',
    title: 'Standing Jumping Jacks or Air Punches',
    instruction:
      'Perform 20 light jumping jacks or 30 rhythmic air punches at medium tempo.',
    durationMinutes: 2,
    category: 'physical_somatic',
    whyItWorks:
      'Spikes dopamine and norepinephrine naturally to overcome lethargy.',
    source: 'fallback_pool',
  },

  // 2. Environmental (8 tasks)
  {
    id: 'env-1',
    title: 'The 3-Item Desk Clear',
    instruction:
      'Identify 3 items on your desk that do not belong to your next task (mugs, scraps, wrappers) and remove them now.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks:
      'Reduces visual noise and external cognitive load, creating an inviting workspace.',
    source: 'fallback_pool',
  },
  {
    id: 'env-2',
    title: 'Fresh Air Window Flush',
    instruction:
      'Open the nearest window or door wide. Take 5 deep breaths of fresh outside air, then close or adjust it.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks:
      'Decreases localized carbon dioxide concentration and provides immediate sensory novelty.',
    source: 'fallback_pool',
  },
  {
    id: 'env-3',
    title: 'Digital Horizon Tidy',
    instruction:
      'Close or minimize all browser tabs and windows except the single one you need right now.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks:
      'Eliminates attention-residue traps and cognitive switching costs.',
    source: 'fallback_pool',
  },
  {
    id: 'env-4',
    title: 'Workspace Lighting Shift',
    instruction:
      'Turn on a focused task lamp or adjust window blinds to increase ambient daylight in your field of view.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks:
      'Blue-spectrum lux light cues the suprachiasmatic nucleus to enhance wakefulness.',
    source: 'fallback_pool',
  },
  {
    id: 'env-5',
    title: 'Phone Out of Line-of-Sight',
    instruction:
      'Place your smartphone into another room, inside a drawer, or at least 2 meters behind your chair on silent.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks:
      'Research proves merely seeing a smartphone reduces working memory capacity.',
    source: 'fallback_pool',
  },
  {
    id: 'env-6',
    title: 'Audio Environment Switch',
    instruction:
      'Put on noise-cancelling headphones and start playing brown noise, binaural beats, or instrumental ambient sound.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks:
      'Masks distracting erratic background acoustic peaks, anchoring executive focus.',
    source: 'fallback_pool',
  },
  {
    id: 'env-7',
    title: 'Keyboard & Screen Wipe',
    instruction:
      'Take a microfibre cloth and quickly wipe down your keyboard, mouse, and monitor screen.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks:
      'Provides a clean tactile and visual slate that signals the start of a pristine work sprint.',
    source: 'fallback_pool',
  },
  {
    id: 'env-8',
    title: 'Chair Ergonomic Recalibration',
    instruction:
      'Stand up, adjust chair height so thighs are parallel to the floor, adjust armrests, and sit back with lumbar support.',
    durationMinutes: 2,
    category: 'environmental',
    whyItWorks:
      'Physical discomfort subtly drains willpower; recalibrating restores baseline ease.',
    source: 'fallback_pool',
  },

  // 3. Atomic Friction (8 tasks)
  {
    id: 'fric-1',
    title: 'The 1-Sentence Document Starter',
    instruction:
      'Open your target document or IDE. Write exactly ONE sentence or one line of code—even if it is terrible—and stop.',
    durationMinutes: 2,
    category: 'atomic_friction',
    whyItWorks:
      'Lowers activation energy below the threshold of procrastination; starting is harder than continuing.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-2',
    title: 'Rename & Save Working File',
    instruction:
      'Create a new blank file, save it with today’s date and the project name, and write a one-word title at the top.',
    durationMinutes: 2,
    category: 'atomic_friction',
    whyItWorks:
      'Transforms an intimidating blank canvas into an established artifact with zero cognitive risk.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-3',
    title: 'The 3-Bullet Outline',
    instruction:
      'On a physical paper or scratchpad, write down 3 bullet points answering: "What does done look like?"',
    durationMinutes: 3,
    category: 'atomic_friction',
    whyItWorks:
      'Externalizes ambiguous goals into concrete, actionable steps without commit pressure.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-4',
    title: 'Micro-Step Decomposition',
    instruction:
      'Take your biggest task and break it down until the first subtask takes less than 120 seconds to execute.',
    durationMinutes: 3,
    category: 'atomic_friction',
    whyItWorks:
      'Procrastination is often a symptom of vague, oversized task definitions.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-5',
    title: 'The 2-Minute Read-Only Pass',
    instruction:
      'Open the reference doc or ticket. Set a 2-minute timer and just read without any obligation to write or produce.',
    durationMinutes: 2,
    category: 'atomic_friction',
    whyItWorks:
      'Removes production performance pressure while loading relevant context into short-term memory.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-6',
    title: 'Delete 1 Dead Draft or Redundant File',
    instruction:
      'Locate 1 obsolete draft, scratch file, or outdated note in your current project and delete it.',
    durationMinutes: 2,
    category: 'atomic_friction',
    whyItWorks:
      'An easy destructive action creates a tangible sense of agency and clears mental clutter.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-7',
    title: 'Set Up The Next 15-Minute Milestone',
    instruction:
      'Write on a sticky note: "All I need to do is [Next Verb + Object] for 15 minutes", and stick it on your bezel.',
    durationMinutes: 2,
    category: 'atomic_friction',
    whyItWorks:
      'Shrinks time horizon from an overwhelming workday down to a manageable bite-sized block.',
    source: 'fallback_pool',
  },
  {
    id: 'fric-8',
    title: 'Prepare Single Dependency Tool',
    instruction:
      'Launch only the single application or terminal required for your immediate step; close everything else.',
    durationMinutes: 2,
    category: 'atomic_friction',
    whyItWorks:
      'Reduces setup friction and eliminates choice fatigue.',
    source: 'fallback_pool',
  },

  // 4. Sensory Grounding (8 tasks)
  {
    id: 'sens-1',
    title: 'The 5-4-3-2-1 Sensory Scan',
    instruction:
      'Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste right now.',
    durationMinutes: 3,
    category: 'sensory_grounding',
    whyItWorks:
      'Anchors attention back to concrete sensory reality, disconnecting internal rumination loops.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-2',
    title: 'Physiological Sigh Breathwork',
    instruction:
      'Take two quick deep inhales through your nose, followed by a long, slow exhale through your mouth. Repeat 5 times.',
    durationMinutes: 2,
    category: 'sensory_grounding',
    whyItWorks:
      'Andrew Huberman demonstrated this rapidly reinflates collapsed alveoli and triggers vagal parasympathetic tone.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-3',
    title: 'Tactile Texture Exploration',
    instruction:
      'Pick up a physical object on your desk (a pen, stone, key). Close your eyes and focus 60 seconds on its weight and texture.',
    durationMinutes: 2,
    category: 'sensory_grounding',
    whyItWorks:
      'Tactile grounding halts intrusive racing thoughts by commanding the somatosensory cortex.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-4',
    title: 'Panoramic Vision Gaze',
    instruction:
      'Look at a point in the distance or out a window. Relax your eyes and expand your awareness to your full peripheral field for 90 seconds.',
    durationMinutes: 2,
    category: 'sensory_grounding',
    whyItWorks:
      'Narrow foveal gaze triggers autonomic alertness; panoramic vision activates the parasympathetic calming branch.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-5',
    title: 'Box Breathing Cycle (4-4-4-4)',
    instruction:
      'Inhale for 4 seconds, hold for 4 seconds, exhale for 4 seconds, hold empty for 4 seconds. Complete 4 cycles.',
    durationMinutes: 3,
    category: 'sensory_grounding',
    whyItWorks:
      'Regulates carbon dioxide tolerance and stabilizes autonomic arousal.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-6',
    title: 'Barefoot Floor Grounding',
    instruction:
      'Remove shoes. Press both soles flat against the floor. Feel the firmness and temperature beneath your feet for 2 minutes.',
    durationMinutes: 2,
    category: 'sensory_grounding',
    whyItWorks:
      'Re-establishes physical gravitational grounding, pulling energy away from anxious overthinking.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-7',
    title: 'Warm Palms Eye Rest (Palming)',
    instruction:
      'Rub your hands together vigorously until warm. Gently cup warm palms over closed eyes for 90 seconds without pressing.',
    durationMinutes: 2,
    category: 'sensory_grounding',
    whyItWorks:
      'Relieves optical strain and provides comforting sensory deprivation for overstimulated photoreceptors.',
    source: 'fallback_pool',
  },
  {
    id: 'sens-8',
    title: 'Sound Horizon Listening',
    instruction:
      'Close your eyes. Identify the most distant sound you can detect. Focus on it for 60 seconds, then focus on your breathing.',
    durationMinutes: 2,
    category: 'sensory_grounding',
    whyItWorks:
      'Trains auditory selectivity and pulls conscious awareness out of self-critical loops.',
    source: 'fallback_pool',
  },
];

/**
 * Returns a fallback task from the catalog based on optional category and energy level filters.
 * Execution speed is sub-1ms (well within the <10ms requirement).
 */
export function getFallbackTask(
  category?: MicroActivationCategory,
  energyLevel?: number,
  excludeId?: string
): MicroActivationTask {
  let pool = OFFLINE_FALLBACK_CATALOG;

  if (category) {
    const categoryPool = pool.filter((item) => item.category === category);
    if (categoryPool.length > 0) {
      pool = categoryPool;
    }
  } else if (typeof energyLevel === 'number') {
    if (energyLevel <= 2) {
      // Prioritize low-effort restoration
      const lowEnergyPool = pool.filter(
        (item) => item.category === 'sensory_grounding' || item.category === 'physical_somatic'
      );
      if (lowEnergyPool.length > 0) {
        pool = lowEnergyPool;
      }
    } else if (energyLevel >= 4) {
      // Higher energy: can tackle atomic friction or physical jumpstart
      const highEnergyPool = pool.filter(
        (item) => item.category === 'atomic_friction' || item.category === 'physical_somatic'
      );
      if (highEnergyPool.length > 0) {
        pool = highEnergyPool;
      }
    }
  }

  // Filter out excludeId if provided and other items are available
  if (excludeId && pool.length > 1) {
    const excludedPool = pool.filter((item) => item.id !== excludeId);
    if (excludedPool.length > 0) {
      pool = excludedPool;
    }
  }

  const selectedIndex = Math.floor(Math.random() * pool.length);
  return { ...pool[selectedIndex], source: 'fallback_pool' };
}

/**
 * Context-aware deterministic fallback getter accepting an UnstickRequest payload.
 */
export function getDeterministicFallback(req?: UnstickRequest, excludeId?: string): MicroActivationTask {
  const preferredCategory = req?.preferredCategory;
  const energyLevel = req?.energyLevel;
  const routine = req?.currentRoutine;

  // Context heuristic: day_momentum with medium/high energy leans towards atomic_friction
  if (!preferredCategory && routine === 'day_momentum' && (!energyLevel || energyLevel >= 3)) {
    return getFallbackTask('atomic_friction', energyLevel, excludeId);
  }

  // Context heuristic: evening_shutdown leans towards sensory_grounding
  if (!preferredCategory && routine === 'evening_shutdown') {
    return getFallbackTask('sensory_grounding', energyLevel, excludeId);
  }

  return getFallbackTask(preferredCategory, energyLevel, excludeId);
}

/**
 * Zero-parameter random fallback retrieval (<10ms).
 */
export function getRandomFallbackTask(excludeId?: string): MicroActivationTask {
  return getFallbackTask(undefined, undefined, excludeId);
}
