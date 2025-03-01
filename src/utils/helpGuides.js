/**
 * Inline Help & Tooltips for Beginner Guidance
 * Provides context-aware help text for all major features
 */

export const HELP_TEXTS = {
  // Script Editor
  SCRIPT: {
    title: "Enter your script",
    beginner: "Type what you want your character to say. For dialogue, use 1) Person 1 and 2) Person 2",
    example: "1) Hello!\n2) Hi! How are you?"
  },
  
  VOICE: {
    title: "Choose a voice",
    beginner: "Select language and gender. The voice will speak your script text.",
    pro: "Supports Azure Cognitive Services voices in 40+ languages"
  },
  
  EMOTION: {
    title: "Set emotion",
    beginner: "Changes how naturally the character speaks (happy, sad, angry, etc.)",
    subtle: "Affects tone of voice and facial expressions"
  },
  
  GENDER: {
    title: "Voice gender",
    beginner: "Choose male or female voice. Affects character appearance and voice tone.",
    note: "Independent from character visuals"
  },
  
  LANGUAGE: {
    title: "Select language",
    beginner: "Choose the language for text-to-speech synthesis",
    multilingual: "Supports 40+ languages and regional variants"
  },
  
  CAMERA_MODE: {
    title: "Camera angles",
    center: "📹 Center: Character centered in frame (default)",
    zoom: "🔍 Zoom: Smooth animated zoom for emphasis",
    left: "⬅️ Left: Character positioned on left side",
    right: "➡️ Right: Character positioned on right side"
  },
  
  LIGHTING: {
    title: "Lighting style",
    full: "☀️ Full: Bright professional lighting",
    dim: "🌙 Dim: Soft ambient lighting", 
    off: "⚫ Off: Minimal lighting, focus on character",
    party: "✨ Party: Colorful dynamic lighting"
  },
  
  ASPECT_RATIO: {
    title: "Video format",
    portrait: "📱 9:16 Portrait (Mobile, Stories, Shorts)",
    landscape: "🖥️ 16:9 Landscape (Desktop, YouTube)",
    square: "⬜ 1:1 Square (Instagram, TikTok)"
  },
  
  SOCIAL_MODE: {
    title: "Social media style",
    clean: "✨ Clean: Professional look",
    tiktok: "🎵 TikTok: Trendy styling with effects",
    instagram: "📸 Instagram: Photo-ready aesthetic"
  },
  
  CHARACTER: {
    title: "Select character",
    beginner: "Choose your AI character. You can upload custom photos.",
    upload: "Click '+' to upload your own face photo"
  },
  
  EXPORT: {
    title: "Download video",
    beginner: "Creates final video file and saves to your computer",
    formats: "Supports MP4, WebM with auto-codec detection"
  },
  
  RECORD: {
    title: "Screen recording",
    beginner: "Records your screen with audio - good for tutorials",
    note: "Captures everything on screen while playing animation"
  },
  
  UPLOAD_YT: {
    title: "YouTube upload workflow",
    beginner: "1. Download video | 2. Go to YouTube Studio | 3. Upload file",
    note: "No direct upload - manual YouTube upload ensures full control"
  }
};

/**
 * Help tooltip component wrapper
 * Usage: <HelpIcon text={HELP_TEXTS.SCRIPT.beginner} title={HELP_TEXTS.SCRIPT.title} />
 */
export function getHelpText(feature, level = 'beginner') {
  if (!HELP_TEXTS[feature]) return '';
  const help = HELP_TEXTS[feature];
  
  if (level === 'full') {
    return `${help.title}\n\n${help.beginner || help[level] || ''}`;
  }
  return help[level] || '';
}

/**
 * Quick start tips for beginners
 */
export const QUICK_START_TIPS = [
  {
    step: 1,
    title: "Select a Character",
    description: "Choose from presets or upload your own photo",
    actionText: "Pick a character on the left"
  },
  {
    step: 2,
    title: "Write Your Script",
    description: "Type what you want the character to say. For two characters, use 1) and 2) markers",
    actionText: "Enter script in the middle"
  },
  {
    step: 3,
    title: "Choose Voice & Language",
    description: "Select language, gender, and emotion for natural-sounding speech",
    actionText: "Set voice settings"
  },
  {
    step: 4,
    title: "Generate Audio",
    description: "Click the big blue button to generate AI voice from your script",
    actionText: "Generate voice"
  },
  {
    step: 5,
    title: "Customize Appearance",
    description: "Adjust camera angle, lighting, and outfit. Try different combinations",
    actionText: "Tweak settings while watching preview"
  },
  {
    step: 6,
    title: "Export or Record",
    description: "Download the final video or do a screen recording for tutorials",
    actionText: "Click Download or Record button"
  }
];

/**
 * Common beginner mistakes and solutions
 */
export const BEGINNER_MISTAKES = [
  {
    problem: "Character mouth not syncing with speech",
    solution: "This is normal during playback. Export and check in downloaded video for best sync."
  },
  {
    problem: "Voice generation takes too long",
    solution: "Long scripts take longer. Break into smaller parts (under 2 minutes each)."
  },
  {
    problem: "Downloaded video is corrupted",
    solution: "Try a different browser (Chrome, Firefox, Edge) or use the built-in recorder."
  },
  {
    problem: "Can't upload to YouTube",
    solution: "Download the video first, then upload manually to YouTube Studio. Gives you more control."
  },
  {
    problem: "Ambient noise in recording",
    solution: "Close other apps playing audio. Check browser volume/mute settings."
  },
  {
    problem: "Video quality looks blurry",
    solution: "Export at highest quality. For screen recording, work in full-screen mode."
  }
];

/**
 * Professional features guide
 */
export const PRO_FEATURES = [
  {
    feature: "Multi-segment generation",
    description: "Generate multiple voice segments and sync them with characters"
  },
  {
    feature: "Dual character mode",
    description: "Create conversations between two characters with automatic alternation"
  },
  {
    feature: "Emotion-based expression",
    description: "Characters automatically adjust facial expressions based on sentiment"
  },
  {
    feature: "Advanced camera angles",
    description: "Zoom, pan, and position characters for professional framing"
  },
  {
    feature: "Custom lighting modes",
    description: "Set mood with professional lighting studios"
  },
  {
    feature: "Media export",
    description: "Export with codec negotiation for maximum compatibility"
  },
  {
    feature: "Project auto-save",
    description: "All settings saved automatically - never lose your work"
  }
];
