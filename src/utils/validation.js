/**
 * Comprehensive validation utilities for the Avatar Studio
 * Ensures all inputs are safe, valid, and beginner-friendly
 */

/**
 * Validates and sanitizes script text
 * @param {string} text - Raw input text
 * @returns {object} { isValid: bool, text: string, error: string }
 */
export const validateScript = (text) => {
    if (!text) return { isValid: false, text: '', error: 'Script cannot be empty' };
    
    const trimmed = text.trim();
    if (trimmed.length === 0) return { isValid: false, text: '', error: 'Script cannot be empty or whitespace only' };
    if (trimmed.length > 5000) return { isValid: false, text: trimmed, error: 'Script is too long (max 5000 characters)' };
    if (trimmed.split('\n').length > 100) return { isValid: false, text: trimmed, error: 'Script has too many lines (max 100)' };
    
    return { isValid: true, text: trimmed, error: null };
};

/**
 * Validates voice ID
 * @param {string} voiceId - Voice identifier
 * @returns {bool}
 */
export const isValidVoice = (voiceId) => {
    if (!voiceId || typeof voiceId !== 'string') return false;
    // Basic Azure voice ID format check
    return voiceId.includes('-') && voiceId.length > 5;
};

/**
 * Validates character object
 * @param {object} char - Character object
 * @returns {object} { isValid: bool, error: string }
 */
export const validateCharacter = (char) => {
    if (!char) return { isValid: false, error: 'Character is required' };
    if (!char.id) return { isValid: false, error: 'Character must have an ID' };
    if (!char.name) return { isValid: false, error: 'Character must have a name' };
    return { isValid: true, error: null };
};

/**
 * Validates aspect ratio
 * @param {string} ratio - Aspect ratio like "9:16" or "16:9"
 * @returns {bool}
 */
export const isValidAspectRatio = (ratio) => {
    return ['9:16', '16:9', '1:1'].includes(ratio);
};

/**
 * Validates emotion value
 * @param {string} emotion - Emotion type
 * @returns {bool}
 */
export const isValidEmotion = (emotion) => {
    return ['neutral', 'happy', 'sad', 'angry', 'surprised'].includes(emotion);
};

/**
 * Validates camera mode
 * @param {string} mode - Camera mode
 * @returns {bool}
 */
export const isValidCameraMode = (mode) => {
    return ['center', 'zoom', 'left', 'right'].includes(mode);
};

/**
 * Validates social media mode
 * @param {string} mode - Social mode
 * @returns {bool}
 */
export const isValidSocialMode = (mode) => {
    return ['clean', 'tiktok', 'instagram'].includes(mode);
};

export const isValidCaptionMode = (mode) => {
    return ['manual', 'auto', 'both', 'off'].includes(mode);
};

export const isValidCaptionTheme = (theme) => {
    return ['cinema', 'broadcast', 'minimal'].includes(theme);
};

export const isValidCaptionSize = (size) => {
    return ['sm', 'md', 'lg'].includes(size);
};

/**
 * Validates lighting mode
 * @param {string} mode - Lighting mode
 * @returns {bool}
 */
export const isValidLightingMode = (mode) => {
    return ['full', 'dim', 'off', 'party'].includes(mode);
};

/**
 * Validates URL (for audio, images)
 * @param {string} url - URL to validate
 * @returns {bool}
 */
export const isValidUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Validates audio blob URL (data URL or blob URL)
 * @param {string} url - URL to check
 * @returns {bool}
 */
export const isValidAudioUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('blob:') || url.startsWith('data:audio');
};

/**
 * Sanitizes text for safe display
 * Removes dangerous characters but preserves content
 * @param {string} text - Raw text
 * @returns {string}
 */
export const sanitizeText = (text) => {
    if (typeof text !== 'string') return '';
    // Remove null bytes and control characters but allow newlines
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
};

/**
 * Validates character name
 * @param {string} name - Character name
 * @returns {object} { isValid: bool, error: string }
 */
export const validateCharacterName = (name) => {
    if (!name || typeof name !== 'string') return { isValid: false, error: 'Name is required' };
    const trimmed = name.trim();
    if (trimmed.length === 0) return { isValid: false, error: 'Name cannot be empty' };
    if (trimmed.length > 50) return { isValid: false, error: 'Name is too long (max 50 characters)' };
    return { isValid: true, error: null };
};

/**
 * Validates image file
 * @param {File} file - Image file
 * @returns {object} { isValid: bool, error: string }
 */
export const validateImageFile = (file) => {
    if (!file) return { isValid: false, error: 'No file selected' };
    
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) return { isValid: false, error: 'Image must be under 5MB' };
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) return { isValid: false, error: 'Only JPG, PNG, WebP, GIF allowed' };
    
    return { isValid: true, error: null };
};

/**
 * Validates video recording parameters
 * @param {number} duration - Recording duration in milliseconds
 * @returns {object} { isValid: bool, error: string }
 */
export const validateRecording = (duration) => {
    if (duration < 1000) return { isValid: false, error: 'Recording too short (minimum 1 second)' };
    if (duration > 600000) return { isValid: false, error: 'Recording too long (maximum 10 minutes)' };
    return { isValid: true, error: null };
};

/**
 * Safe JSON parse with fallback
 * @param {string} json - JSON string
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any}
 */
export const safeJsonParse = (json, fallback = null) => {
    try {
        return JSON.parse(json);
    } catch (e) {
        console.warn('JSON parse failed:', e);
        return fallback;
    }
};

/**
 * Validates project state structure
 * @param {object} state - Project state object
 * @returns {object} Cleaned/validated state
 */
export const validateProjectState = (state) => {
    if (!state || typeof state !== 'object') return null;
    
    return {
        selectedCharId: state.selectedCharId || null,
        scriptText: sanitizeText(state.scriptText || ''),
        selectedVoice: isValidVoice(state.selectedVoice) ? state.selectedVoice : 'en-US-AndrewNeural',
        secondaryCharId: state.secondaryCharId || null,
        selectedVoice2: isValidVoice(state.selectedVoice2) ? state.selectedVoice2 : 'en-US-AvaNeural',
        cameraMode: isValidCameraMode(state.cameraMode) ? state.cameraMode : 'center',
        emotion: isValidEmotion(state.emotion) ? state.emotion : 'neutral',
        previewText: sanitizeText(state.previewText || ''),
        previewTextPos: ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(state.previewTextPos) ? state.previewTextPos : 'top-right',
        captionMode: isValidCaptionMode(state.captionMode) ? state.captionMode : 'both',
        captionTheme: isValidCaptionTheme(state.captionTheme) ? state.captionTheme : 'cinema',
        captionSize: isValidCaptionSize(state.captionSize) ? state.captionSize : 'md',
        aspectRatio: isValidAspectRatio(state.aspectRatio) ? state.aspectRatio : '9:16',
        socialMode: isValidSocialMode(state.socialMode) ? state.socialMode : 'clean'
    };
};

/**
 * Checks if browser has required APIs
 * @returns {object} { videoRecording: bool, audioAPI: bool, localStorage: bool }
 */
export const checkBrowserCapabilities = () => {
    return {
        videoRecording: !!window.MediaRecorder,
        audioAPI: !!window.AudioContext || !!window.webkitAudioContext,
        localStorage: !!window.localStorage,
        canvas: !!(typeof HTMLCanvasElement !== 'undefined'),
        fetch: !!window.fetch,
        blob: !!window.Blob,
        url: !!window.URL
    };
};

/**
 * Validates browser compatibility
 * @returns {object} { compatible: bool, issues: string[] }
 */
export const validateBrowserCompatibility = () => {
    const caps = checkBrowserCapabilities();
    const issues = [];
    
    if (!caps.videoRecording) issues.push('MediaRecorder not supported');
    if (!caps.audioAPI) issues.push('Web Audio API not supported');
    if (!caps.localStorage) issues.push('LocalStorage not available');
    if (!caps.canvas) issues.push('Canvas not supported');
    if (!caps.fetch) issues.push('Fetch API not available');
    
    return {
        compatible: issues.length === 0,
        issues
    };
};
