/**
 * Mouth/Lips Animation System
 * Handles phoneme-based mouth shapes and lip-sync animation
 */

// Phoneme to mouth shape mapping
// Each phoneme defines: openness (0-1), width (0-1), roundness (0-1)
export const PHONEME_MAP = {
  // Vowels - Open mouth
  'A': { openness: 0.7, width: 0.8, roundness: 0.2 },  // "cat"
  'E': { openness: 0.4, width: 0.9, roundness: 0.1 },  // "bet"
  'I': { openness: 0.3, width: 0.85, roundness: 0.05 }, // "bit"
  'O': { openness: 0.6, width: 0.5, roundness: 0.8 },  // "hot"
  'U': { openness: 0.5, width: 0.4, roundness: 0.9 },  // "boot"

  // Consonants - Closed or specific shapes
  'M': { openness: 0.0, width: 0.6, roundness: 0.3 },  // "map" - lips closed
  'B': { openness: 0.0, width: 0.6, roundness: 0.4 },  // "bat" - lips closed
  'P': { openness: 0.05, width: 0.5, roundness: 0.5 }, // "pat" - lips barely open
  'F': { openness: 0.2, width: 0.7, roundness: 0.1 },  // "fun" - upper teeth on lower lip
  'V': { openness: 0.2, width: 0.7, roundness: 0.1 },  // "van" - upper teeth on lower lip
  'TH': { openness: 0.15, width: 0.6, roundness: 0.0 }, // "think" - tongue between teeth
  'CH': { openness: 0.3, width: 0.65, roundness: 0.3 }, // "chat"
  'SH': { openness: 0.25, width: 0.7, roundness: 0.2 }, // "ship"
  'S': { openness: 0.2, width: 0.75, roundness: 0.0 },  // "sun"
  'Z': { openness: 0.2, width: 0.75, roundness: 0.0 },  // "zoo"
  'T': { openness: 0.1, width: 0.5, roundness: 0.1 },   // "top" - tongue on teeth
  'D': { openness: 0.1, width: 0.5, roundness: 0.1 },   // "dog"
  'N': { openness: 0.05, width: 0.5, roundness: 0.2 },  // "not"
  'L': { openness: 0.2, width: 0.6, roundness: 0.15 },  // "let"
  'R': { openness: 0.3, width: 0.55, roundness: 0.4 },  // "red"
  'W': { openness: 0.4, width: 0.4, roundness: 0.85 },  // "wet"
  'Y': { openness: 0.35, width: 0.6, roundness: 0.3 },  // "yes"
  'G': { openness: 0.2, width: 0.5, roundness: 0.2 },   // "go"
  'K': { openness: 0.1, width: 0.45, roundness: 0.15 }, // "key"
  'NG': { openness: 0.0, width: 0.5, roundness: 0.25 }, // "ring"

  // Default for unknown
  'default': { openness: 0.3, width: 0.5, roundness: 0.2 }
};

/**
 * Convert text to phonemes (simple approach)
 * Returns array of phonemes for each character
 */
export function textToPhonemes(text) {
  if (!text || text.length === 0) return [];

  const phonemes = [];
  const lower = text.toLowerCase();

  // Simple mapping - can be improved with better linguistic analysis
  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    const nextChar = i < lower.length - 1 ? lower[i + 1] : '';
    const twoChar = char + nextChar;

    // Check two-character phonemes first
    if (['ch', 'sh', 'th', 'ng'].includes(twoChar)) {
      phonemes.push(twoChar.toUpperCase());
      i++; // Skip next character
      continue;
    }

    // Map to vowels
    if ('aeiou'.includes(char)) {
      phonemes.push(char.toUpperCase());
    } else if ('bcdfghjklmnpqrstvwxyz'.includes(char)) {
      // Consonant
      phonemes.push(char.toUpperCase());
    } else if (char === ' ') {
      // Silent/rest between words
      phonemes.push('SILENCE');
    }
  }

  return phonemes;
}

/**
 * Get mouth shape for a specific phoneme
 */
export function getPhonemeShape(phoneme) {
  const key = phoneme ? phoneme.toUpperCase() : 'default';
  return PHONEME_MAP[key] || PHONEME_MAP['default'];
}

/**
 * Calculate overall mouth shape from multiple phonemes with blending
 * Useful for smooth transitions between phonemes
 */
export function blendPhonemeShapes(phonemes, weights) {
  if (!phonemes || phonemes.length === 0) {
    return PHONEME_MAP['default'];
  }

  let totalOpenness = 0;
  let totalWidth = 0;
  let totalRoundness = 0;
  let totalWeight = 0;

  phonemes.forEach((phoneme, i) => {
    const weight = weights && weights[i] ? weights[i] : (1 / phonemes.length);
    const shape = getPhonemeShape(phoneme);

    totalOpenness += shape.openness * weight;
    totalWidth += shape.width * weight;
    totalRoundness += shape.roundness * weight;
    totalWeight += weight;
  });

  if (totalWeight === 0) return PHONEME_MAP['default'];

  return {
    openness: Math.min(1, totalOpenness / totalWeight),
    width: Math.min(1, totalWidth / totalWeight),
    roundness: Math.min(1, totalRoundness / totalWeight)
  };
}

/**
 * Get mouth shape for a word based on its primary phonemes
 */
export function getWordMouthShape(word) {
  if (!word || word.length === 0) return PHONEME_MAP['default'];

  const phonemes = textToPhonemes(word);
  // Weight the first vowel more heavily
  const vowels = phonemes.filter((p) => 'AEIOURWY'.includes(p));

  if (vowels.length === 0) {
    // Word has no vowels, use first consonant
    return getPhonemeShape(phonemes[0] || 'default');
  }

  // Use primary vowel
  return getPhonemeShape(vowels[0]);
}

/**
 * Generate mouth keyframes for a sentence
 * Returns timing data for when to apply different mouth shapes
 */
export function generateMouthKeyframes(text, audioDuration) {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return [];
  }

  const keyframes = [];
  const timePerWord = audioDuration / words.length;

  words.forEach((word, index) => {
    const startTime = index * timePerWord;
    const endTime = (index + 1) * timePerWord;
    const shape = getWordMouthShape(word);

    keyframes.push({
      word,
      startTime,
      endTime,
      duration: endTime - startTime,
      shape,
      index
    });
  });

  return keyframes;
}

/**
 * Interpolate mouth shape between two keyframes
 * Smoothly transitions mouth shape as audio plays
 */
export function interpolateMouthShape(keyframes, currentTime) {
  if (!keyframes || keyframes.length === 0) {
    return PHONEME_MAP['default'];
  }

  // Find current and next keyframes
  let currentFrame = null;
  let nextFrame = null;

  for (let i = 0; i < keyframes.length; i++) {
    const frame = keyframes[i];
    if (currentTime >= frame.startTime && currentTime < frame.endTime) {
      currentFrame = frame;
      nextFrame = keyframes[i + 1];
      break;
    }
  }

  if (!currentFrame) {
    // Default to last frame or default shape
    return keyframes.length > 0 ? keyframes[keyframes.length - 1].shape : PHONEME_MAP['default'];
  }

  // If no next frame, just use current
  if (!nextFrame) {
    return currentFrame.shape;
  }

  // Interpolate between current and next frame
  const progress = (currentTime - currentFrame.startTime) / currentFrame.duration;
  const easeProgress = Math.min(1, Math.max(0, progress)); // Clamp 0-1

  const currentShape = currentFrame.shape;
  const nextShape = nextFrame.shape;

  return {
    openness: currentShape.openness + (nextShape.openness - currentShape.openness) * easeProgress,
    width: currentShape.width + (nextShape.width - currentShape.width) * easeProgress,
    roundness: currentShape.roundness + (nextShape.roundness - currentShape.roundness) * easeProgress
  };
}

/**
 * Calculate mouth position Y offset based on smile
 * Positive smile moves mouth up
 */
export function getMouthPositionOffset(smile) {
  return smile * 6;
}

/**
 * Enhanced mouth drawing configuration
 * Returns enhanced mouth parameters for better rendering
 */
export function getEnhancedMouthShape(baseShape, audioAmplitude, emotion) {
  const shape = { ...baseShape };

  // Audio drives overall openness
  shape.openness = Math.max(shape.openness, audioAmplitude * 0.8);

  // Emotion affects smile
  if (emotion === 'happy') {
    shape.smile = Math.max(shape.smile || 0, 0.5);
  } else if (emotion === 'sad') {
    shape.smile = Math.min(shape.smile || 0, -0.3);
  }

  // Ensure valid ranges
  shape.openness = Math.min(1, Math.max(0, shape.openness));
  shape.width = Math.min(1, Math.max(0.3, shape.width));
  shape.roundness = Math.min(1, Math.max(0, shape.roundness));

  return shape;
}

/**
 * Lip color based on gender and emotion
 */
export function getLipColor(isFemale, emotion) {
  if (isFemale) {
    if (emotion === 'sad') return '#a02040';
    if (emotion === 'angry') return '#8b0000';
    return '#c94060'; // Default pink
  } else {
    if (emotion === 'sad') return '#7a5550';
    if (emotion === 'angry') return '#704040';
    return '#b08070'; // Default neutral
  }
}

/**
 * Calculate smile amount based on emotion
 */
export function getSmileAmount(emotion) {
  switch (emotion) {
    case 'happy':
      return 0.8;
    case 'neutral':
      return 0.1;
    case 'sad':
      return -0.6;
    case 'angry':
      return -0.4;
    case 'surprised':
      return 0.3;
    default:
      return 0.1;
  }
}
