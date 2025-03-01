
import React, { useRef, useEffect, useState } from 'react';
import { drawFullHuman, drawFullAnimal, drawFullRobot } from '@/draw';
import { Play, Pause, Download, Volume2, Mic, Film, Image as ImageIcon, Upload } from 'lucide-react';
import { textToPhonemes, generateMouthKeyframes, interpolateMouthShape, getSmileAmount, getEnhancedMouthShape } from '@/utils/mouthAnimation';

const defaultFace = {
    leftEye: { x: 0, y: 0, openness: 1 },
    rightEye: { x: 0, y: 0, openness: 1 },
    mouth: { openness: 0, width: 0.5, smile: 0.3 },
    head: { yaw: 0, pitch: 0, roll: 0 },
    leftEyebrow: 0.5,
    rightEyebrow: 0.5,
    nosePosition: { x: 0.5, y: 0.5 },
    detected: true,
};

// --- SENTIMENT ANALYSIS ENGINE ---
const analyzeSentiment = (text) => {
    if (!text) return 'neutral';
    const lower = text.toLowerCase();

    const happyWords = ['success', 'win', 'great', 'amazing', 'power', 'future', 'dream', 'achieve', 'happy', 'joy', 'excited', 'love', 'confident', 'strong', 'best', 'growth', 'profit', 'excellent'];
    const sadWords = ['fail', 'lose', 'sad', 'sorry', 'hard', 'difficult', 'struggle', 'pain', 'wrong', 'bad', 'worry', 'fear', 'anxious', 'loss', 'decline', 'poor'];
    const angryWords = ['angry', 'mad', 'hate', 'serious', 'critical', 'urgent', 'warning', 'stop', 'never', 'error', 'crisis', 'danger'];

    let score = 0;
    happyWords.forEach(w => { if (lower.includes(w)) score += 1; });
    sadWords.forEach(w => { if (lower.includes(w)) score -= 1; });
    angryWords.forEach(w => { if (lower.includes(w)) score -= 1.5; }); // Angry is heavier

    if (score > 0) return 'happy';
    if (score < -1) return 'sad'; // Threshold for sad
    // Check specific angry/serious trigger
    if (angryWords.some(w => lower.includes(w)) && score < 0) return 'angry';

    return 'neutral';
};

export function PreviewPlayer({ character, audioUrl, isPlaying, onTogglePlay, cameraMode = 'center', setCameraMode, emotion = 'neutral', previewText, previewTextPos = 'top-right', captionMode = 'both', captionTheme = 'cinema', captionSize = 'md', secondaryChar, audioPlaylist = [], setAudioPlaylist, lightingMode = 'full', aspectRatio = '9:16', socialMode = 'clean' }) {
    const canvasRef = useRef(null);
    const audioRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const audioDestRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    // Refs for real-time updates without loop restart
    const previewTextRef = useRef(previewText);
    const previewTextPosRef = useRef(previewTextPos);
    const captionModeRef = useRef(captionMode);
    const captionThemeRef = useRef(captionTheme);
    const captionSizeRef = useRef(captionSize);
    const emotionRef = useRef(emotion);

    useEffect(() => { previewTextRef.current = previewText; }, [previewText]);
    useEffect(() => { previewTextPosRef.current = previewTextPos; }, [previewTextPos]);
    useEffect(() => { captionModeRef.current = captionMode; }, [captionMode]);
    useEffect(() => { captionThemeRef.current = captionTheme; }, [captionTheme]);
    useEffect(() => { captionSizeRef.current = captionSize; }, [captionSize]);
    useEffect(() => { emotionRef.current = emotion; }, [emotion]);

    const [isRecording, setIsRecording] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

    // === DIRECTOR MODE STATE ===
    const [gesture, setGesture] = useState({ type: null, active: false });

    const triggerGesture = (type) => {
        setGesture({ type, active: true });
        // Auto-reset after animation duration (approx 2s)
        setTimeout(() => setGesture({ type: null, active: false }), 2000);
    };

    // Presentation Mode State
    const [presentationImage, setPresentationImage] = useState(null);
    const fileInputRef = useRef(null);

    const animationRef = useRef(null);
    const faceRef = useRef({ ...defaultFace });
    const faceRef2 = useRef({ ...defaultFace }); // Secondary Character Face

    const timeRef = useRef(0);
    const amplitudeRef = useRef(0); // Persistent amplitude state for smoothing

    // === MULTI-BAND LIP SYNC REFS ===
    const lowBandRef = useRef(0);   // Bass: jaw openness (vowels)
    const midBandRef = useRef(0);   // Mids: mouth width (consonants)
    const highBandRef = useRef(0);  // Highs: lip tightness (sibilants)
    const silenceFramesRef = useRef(0); // Consecutive silent frames
    const smoothingFactor = useRef(0.08); // Enhanced smoothing for realistic mouth movement (slower = more realistic)

    // === WORD-SYNCED CAPTION REFS ===
    const wordCursorRef = useRef(0);       // Current word index in caption
    const lastAmplitudeRef = useRef(0);    // For detecting speech bursts
    const burstActiveRef = useRef(false);  // Whether currently in a speech burst
    const lastTrackIndexRef = useRef(-1);  // Track when track changes to reset cursor

    // === MOUTH ANIMATION REFS ===
    const mouthKeyframesRef = useRef([]);  // Pre-calculated mouth keyframes for text
    const currentSubtitleRef = useRef(''); // Track current subtitle text
    const phonemeShapeRef = useRef(null);  // Current phoneme-based mouth shape

    // Load character images
    const faceImgRef = useRef(null);
    const faceImgRef2 = useRef(null);
    const secondaryCharRef = useRef(null); // Keep for bubble legacy, but mainly used for Dual Mode now

    useEffect(() => {
        if (character?.photoUrl) {
            const img = new Image();
            img.src = character.photoUrl;
            img.crossOrigin = "anonymous";
            img.onload = () => { faceImgRef.current = img; };
        } else {
            faceImgRef.current = null;
        }

        // Check if there is an uploaded "Interviewer" character stored in localStorage
        // This is a simple way to enable the dual-camera shot requested
        try {
            const stored = localStorage.getItem('avatarcam_chars_v2');
            if (stored) {
                const chars = JSON.parse(stored);
                // logic: if I am selecting a preset, and I have a custom char, use the first custom char as interviewer
                // or if I am a custom char, use the last preset.
                // For now, let's just pick the OTHER character if available to simulate interview
                // This is a "hidden feature" triggered when multiple chars exist.
                /* 
                   Simplified Implementation for "Bubble" request: 
                   User asked for "uploaded character as the bubble to the character a side like that two are talking"
                */
                if (chars.length > 0 && character.category !== 'user') {
                    const img2 = new Image();
                    img2.src = chars[0].photoUrl;
                    img2.crossOrigin = "anonymous";
                    img2.onload = () => { secondaryCharRef.current = img2; };
                } else {
                    secondaryCharRef.current = null;
                }
            }
        } catch (e) { }

    }, [character]);

    // Load Secondary Character Image for Dual Mode
    useEffect(() => {
        // Clear previous image immediately to avoid mismatched body/face
        faceImgRef2.current = null;

        if (secondaryChar?.photoUrl) {
            const img = new Image();
            img.src = secondaryChar.photoUrl;
            img.crossOrigin = "anonymous";
            img.onload = () => { faceImgRef2.current = img; };
        }
    }, [secondaryChar?.id, secondaryChar?.photoUrl]);

    useEffect(() => {
        // Reset track index whenever a new playlist is generated
        setCurrentTrackIndex(0);
    }, [audioPlaylist]);

    useEffect(() => {
        const urlToPlay = audioPlaylist.length > 0 ? audioPlaylist[currentTrackIndex]?.url : audioUrl;

        if (urlToPlay) {
            const audio = new Audio(urlToPlay);
            audio.crossOrigin = "anonymous";
            audioRef.current = audio;

            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const src = ctx.createMediaElementSource(audio);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;

            // Audio Enhancements (Compressor + EQ)
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = -10;
            compressor.knee.value = 40;
            compressor.ratio.value = 4; // Gentle compression for natural warmth
            compressor.attack.value = 0;
            compressor.release.value = 0.25;

            const filter = ctx.createBiquadFilter();
            filter.type = "highshelf";
            filter.frequency.value = 1000;
            filter.gain.value = 0; // Removed artificial boost for natural sound

            // Chain: Source -> Compressor -> Filter -> Analyser -> Out
            src.connect(compressor);
            compressor.connect(filter);
            filter.connect(analyser);
            analyser.connect(ctx.destination);

            // Create MediaStreamDestination for Recording
            const dest = ctx.createMediaStreamDestination();
            analyser.connect(dest);
            audioDestRef.current = dest;

            analyserRef.current = analyser;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

            audio.onended = () => {
                if (audioPlaylist.length > 0) {
                    if (currentTrackIndex < audioPlaylist.length - 1) {
                        setCurrentTrackIndex(prev => prev + 1);
                    } else {
                        onTogglePlay(false);
                        setCurrentTrackIndex(0);
                    }
                } else {
                    onTogglePlay(false);
                }
            };

            if (isPlaying) {
                ctx.resume().then(() => audio.play().catch(e => console.error("Play error:", e)));
            }

            return () => {
                audio.pause();
                ctx.close();
            };
        }
    }, [audioUrl, audioPlaylist, currentTrackIndex]); // Re-run when track changes

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(e => console.error("Play error (toggle):", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying]);

    // Animation Loop - Same as before but robust
    useEffect(() => {
        const loop = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Schedule NEXT frame FIRST — ensures loop never dies from errors
            animationRef.current = requestAnimationFrame(loop);

            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;
            timeRef.current += 0.016;

            try { // === CRASH-RESILIENT RENDER ===

                let rawAmp = 0;
                let rawLow = 0, rawMid = 0, rawHigh = 0;

                // === MULTI-BAND FREQUENCY ANALYSIS ===
                if (analyserRef.current && isPlaying) {
                    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                    let sum = 0;
                    let lowSum = 0, midSum = 0, highSum = 0;

                    // Low band (bins 2-8): Bass → jaw openness (vowels)
                    for (let i = 2; i < 8; i++) lowSum += dataArrayRef.current[i];
                    rawLow = lowSum / (6 * 255);

                    // Mid band (bins 8-30): Consonants → mouth width
                    for (let i = 8; i < 30; i++) midSum += dataArrayRef.current[i];
                    rawMid = midSum / (22 * 255);

                    // High band (bins 30-60): Sibilants → lip shape
                    for (let i = 30; i < 60; i++) highSum += dataArrayRef.current[i];
                    rawHigh = highSum / (30 * 255);

                    // Overall amplitude
                    for (let i = 2; i < 60; i++) sum += dataArrayRef.current[i];
                    rawAmp = sum / (58 * 255);
                }

                // === ENHANCED SMOOTHING — REALISTIC LIP MOVEMENT ===
                // Realistic mouth animation requires natural easing, not abrupt changes
                const isOpening = rawAmp > amplitudeRef.current;
                // Much slower smoothing for realistic, humanized mouth movement (8ms attack/release)
                const baseSmoothingAttack = smoothingFactor.current; // 0.08 = very smooth
                const baseSmoothingRelease = smoothingFactor.current * 1.2; // Slightly slower release
                const smoothing = isOpening ? baseSmoothingAttack : baseSmoothingRelease;

                amplitudeRef.current = (amplitudeRef.current * (1 - smoothing)) + (rawAmp * smoothing);

                // Band smoothing — tighter for realistic phoneme transition
                const bandAttack = smoothing * 1.2; // Slightly faster for consonants
                const bandRelease = smoothing * 0.9;
                const bandSmooth = isOpening ? bandAttack : bandRelease;
                lowBandRef.current = (lowBandRef.current * (1 - bandSmooth)) + (rawLow * bandSmooth);
                midBandRef.current = (midBandRef.current * (1 - bandSmooth)) + (rawMid * bandSmooth);
                highBandRef.current = (highBandRef.current * (1 - bandSmooth)) + (rawHigh * bandSmooth);

                // === NOISE GATE + MICRO-PAUSE DETECTOR ===
                if (amplitudeRef.current < 0.04) {
                    amplitudeRef.current = 0;
                    silenceFramesRef.current++;
                } else {
                    silenceFramesRef.current = 0;
                }

                // Snap shut after just 2 frames of silence (quick between syllables)
                if (silenceFramesRef.current > 2) {
                    lowBandRef.current *= 0.3;
                    midBandRef.current *= 0.3;
                    highBandRef.current *= 0.3;
                }

                const blink = Math.random() < 0.005 ? 0 : 1;
                const breathe = Math.sin(timeRef.current * 1.5) * 0.02;

                // === NATURAL REALISTIC LIP SYNC ===
                const amp = amplitudeRef.current;
                const low = lowBandRef.current; // Vowels (A, O, U)
                const mid = midBandRef.current; // Formants (E, I)
                const high = highBandRef.current; // Sibilants (S, T, F)

                // 1. JAW OPENNESS
                // Driven by Low and Mid (vowels). High freq (S, T) barely opens jaw.
                // Added distinct "Pop" on sudden amplitude jumps
                let targetOpen = (low * 1.0 + mid * 0.6 + high * 0.1) * 3.8;
                if (targetOpen > 0.75) targetOpen = 0.75; // Max natural opening
                if (targetOpen < 0.05) targetOpen = 0; // Clean silence

                // Apply jitter for organic feel (so it's not robotic)
                if (targetOpen > 0.1) targetOpen += (Math.random() - 0.5) * 0.05;

                let mouthOpen = targetOpen;
                if (silenceFramesRef.current > 2) mouthOpen = 0;

                // 2. MOUTH WIDTH ("E", "S" sounds)
                // Driven by Mid and High frequencies.
                // Sibilants (High) make mouth very wide but jaw closed.
                const widthBase = 0.5 + (mid * 1.0) + (high * 2.5);
                const mouthWidth = Math.min(1.0, widthBase) * Math.min(1.0, mouthOpen + 0.3);

                // 3. ROUNDNESS ("O", "U" sounds)
                // Driven by Low freq dominance. If High is present, it cancels roundness.
                // 0 = Wide/Flat (E, S), 1 = Round/Pursed (O, U, W)
                let roundCalc = (low * 2.0) - (high * 1.5) - (mid * 0.5) + 0.1;
                const roundness = Math.max(0, Math.min(1.0, roundCalc)) * (mouthOpen > 0.1 ? 1 : 0);

                // === WORD CURSOR ADVANCEMENT (amplitude-gated) ===
                if (isPlaying && amp > 0.06 && !burstActiveRef.current) {
                    // Rising edge: new speech burst detected → advance word
                    burstActiveRef.current = true;
                    wordCursorRef.current++;
                } else if (amp < 0.03) {
                    burstActiveRef.current = false;
                }

                // Reset word cursor when track changes
                if (currentTrackIndex !== lastTrackIndexRef.current) {
                    wordCursorRef.current = 0;
                    lastTrackIndexRef.current = currentTrackIndex;
                    burstActiveRef.current = false;
                }

                lastAmplitudeRef.current = amp;

                // EMOTION RIGGING & AUTO-DETECTION
                let currentEmotion = emotionRef.current;

                if (isPlaying && previewTextRef.current) {
                    const detected = analyzeSentiment(previewTextRef.current);
                    if (emotionRef.current === 'neutral') {
                        currentEmotion = detected;
                    }
                }

                let baseEyebrows = 0.5;
                let baseSmile = 0.1;
                let eyeMod = 0;

                if (currentEmotion === 'happy') { baseSmile = 0.8; baseEyebrows = 0.6; }
                if (currentEmotion === 'surprised') { baseSmile = 0.2; baseEyebrows = 0.9; eyeMod = 0.2; }
                if (currentEmotion === 'angry') { baseSmile = -0.4; baseEyebrows = 0.1; }
                if (currentEmotion === 'sad') { baseSmile = -0.6; baseEyebrows = 0.8; }

                // === TALKING CHARACTER BODY LANGUAGE ===
                // When speaking, character should be visibly animated (not stiff)
                const isTalking = mouthOpen > 0.1;
                const talkNod = isTalking ? Math.sin(timeRef.current * 4) * 0.06 : 0;
                const talkSway = isTalking ? Math.sin(timeRef.current * 3) * 0.03 : 0;
                const talkBrowLift = isTalking ? Math.sin(timeRef.current * 5) * 0.08 : 0;

                // Podcast Idle "Alive" Micro-movements
                const randomNod = Math.sin(timeRef.current * 0.5) > 0.95 ? Math.sin(timeRef.current * 10) * 0.1 : 0;
                const lookAroundYaw = Math.sin(timeRef.current * 0.2) * 0.05 + Math.sin(timeRef.current * 0.7) * 0.02 + talkSway;
                const lookAroundPitch = Math.sin(timeRef.current * 0.3) * 0.02 + talkNod;

                // === ENHANCED PHONEME-BASED MOUTH ANIMATION ===
                // Get current subtitle for text-to-mouth sync
                // Note: also declared later for captions (line ~1240), extracting to ref here
                const audioPlaylistText = (audioPlaylist.length > 0 && audioPlaylist[currentTrackIndex]?.text) || "";

                // Regenerate keyframes if subtitle changed
                if (audioPlaylistText !== currentSubtitleRef.current && audioRef.current?.duration) {
                    currentSubtitleRef.current = audioPlaylistText;
                    mouthKeyframesRef.current = generateMouthKeyframes(audioPlaylistText, audioRef.current.duration);
                }

                // Calculate phoneme-based mouth shape from current subtitle timing
                let phonemeShape = null;
                if (mouthKeyframesRef.current.length > 0 && audioRef.current?.currentTime !== undefined) {
                    phonemeShape = interpolateMouthShape(mouthKeyframesRef.current, audioRef.current.currentTime);
                }

                // Blend audio-driven and phoneme-based mouth shapes
                let finalMouthShape = {
                    openness: mouthOpen,
                    width: 0.5 + (mouthWidth * 0.4),
                    smile: baseSmile,
                    roundness: roundness
                };

                // If phoneme data is available, blend it with audio data
                if (phonemeShape && isPlaying) {
                    // Weight: 60% phoneme + 40% audio for smoother result
                    finalMouthShape.openness = phonemeShape.openness * 0.6 + mouthOpen * 0.4;
                    finalMouthShape.width = phonemeShape.width * 0.5 + (0.5 + (mouthWidth * 0.4)) * 0.5;
                    finalMouthShape.roundness = phonemeShape.roundness * 0.6 + roundness * 0.4;
                } else if (!isPlaying) {
                    // No text or not playing - use audio-only
                    finalMouthShape.openness = mouthOpen;
                    finalMouthShape.width = 0.5 + (mouthWidth * 0.4);
                    finalMouthShape.roundness = roundness;
                }

                // Apply emotion-based adjustments
                finalMouthShape = getEnhancedMouthShape(finalMouthShape, amp, currentEmotion);

                faceRef.current = {
                    ...defaultFace,
                    mouth: {
                        openness: finalMouthShape.openness,
                        width: finalMouthShape.width,
                        smile: baseSmile,  // Keep emotion-driven smile separate
                        roundness: finalMouthShape.roundness
                    },
                    leftEye: { ...defaultFace.leftEye, openness: blink + eyeMod },
                    rightEye: { ...defaultFace.rightEye, openness: blink + eyeMod },
                    leftEyebrow: baseEyebrows + talkBrowLift,
                    rightEyebrow: baseEyebrows + talkBrowLift,
                    head: {
                        yaw: lookAroundYaw,
                        pitch: lookAroundPitch + breathe + randomNod,
                        roll: Math.sin(timeRef.current * 0.1) * 0.01
                    }
                };

                // Decay amplitude for next frame if silence
                if (!isPlaying && amplitudeRef.current > 0) {
                    amplitudeRef.current *= 0.8;
                }

                ctx.clearRect(0, 0, w, h);

                // === VIRTUAL STUDIO ENGINE ===
                // Renders dynamic backgrounds based on user selection

                const drawBackground = () => {
                    // 7. PRESENTATION MODE handled after background draw


                    const bgStyle = character?.backgroundStyle || 'podcast'; // Default

                    // 1. PREMIUM PODCAST STUDIO (The Joe Rogan / Lex Fridman Vibe)
                    if (bgStyle === 'podcast') {
                        // --- WALLS (Acoustic Foam Texture) ---
                        const grad = ctx.createLinearGradient(0, 0, w, h);
                        grad.addColorStop(0, '#0b1120');
                        grad.addColorStop(1, '#050812');
                        ctx.fillStyle = grad;
                        ctx.fillRect(0, 0, w, h);

                        // Geometric Acoustic Panels (subtle)
                        ctx.save();
                        ctx.fillStyle = '#1b2437';
                        ctx.globalAlpha = 0.18;
                        for (let y = 0; y < h; y += 46) {
                            for (let x = 0; x < w; x += 46) {
                                if ((x + y) % 92 === 0) {
                                    ctx.beginPath();
                                    ctx.moveTo(x, y);
                                    ctx.lineTo(x + 20, y + 20);
                                    ctx.lineTo(x, y + 40);
                                    ctx.fill();
                                }
                            }
                        }
                        ctx.restore();

                        // --- WOODEN SLATS (Back Wall) ---
                        // Lower contrast and wider spacing for a less cartoony look
                        ctx.save();
                        ctx.fillStyle = 'rgba(0,0,0,0.45)';
                        for (let x = 0; x < w; x += 110) ctx.fillRect(x + 4, 0, 30, h);

                        const woodGrad = ctx.createLinearGradient(0, 0, w, 0);
                        woodGrad.addColorStop(0, '#3f2414');
                        woodGrad.addColorStop(0.5, '#5c3520');
                        woodGrad.addColorStop(1, '#3f2414');
                        ctx.fillStyle = woodGrad;

                        for (let x = 0; x < w; x += 110) {
                            ctx.fillRect(x, 0, 26, h);
                            ctx.fillStyle = 'rgba(0,0,0,0.14)';
                            for (let k = 0; k < 3; k++) ctx.fillRect(x + 6 + k * 7, 0, 1, h);
                            ctx.fillStyle = woodGrad;
                        }
                        ctx.restore();

                        // --- VOLUMETRIC LIGHTING (God Rays) ---
                        ctx.save();
                        ctx.globalCompositeOperation = 'screen';
                        const rayGrad = ctx.createLinearGradient(w / 2, -100, w / 2, h * 0.8);
                        rayGrad.addColorStop(0, 'rgba(120, 170, 220, 0.08)');
                        rayGrad.addColorStop(1, 'transparent');

                        ctx.beginPath();
                        ctx.moveTo(w * 0.2, -100);
                        ctx.lineTo(w * 0.8, -100);
                        ctx.lineTo(w * 0.6, h);
                        ctx.lineTo(w * 0.4, h);
                        ctx.fill();
                        ctx.restore();

                        // Warm Interior Glow (Vignette center)
                        const glow = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.8);
                        glow.addColorStop(0, 'rgba(248, 190, 120, 0.05)');
                        glow.addColorStop(0.8, 'transparent');
                        glow.addColorStop(1, 'rgba(0,0,0,0.6)'); // Dark corners
                        ctx.fillStyle = glow;
                        ctx.fillRect(0, 0, w, h);

                        return;
                    }

                    // 2. BREAKING NEWSROOM (CNN Style)
                    if (bgStyle === 'newsroom') {
                        // Deep Blue/Black Tech background
                        const grad = ctx.createLinearGradient(0, 0, 0, h);
                        grad.addColorStop(0, '#020617'); grad.addColorStop(1, '#172554'); // Dark Blue
                        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

                        // World Map Overlay (Subtle)
                        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                        ctx.beginPath();
                        for (let i = 0; i < 20; i++) {
                            ctx.moveTo(0, i * 60); ctx.lineTo(w, i * 60 + Math.random() * 20);
                        }
                        ctx.stroke();

                        // Lower Third Ticker
                        ctx.fillStyle = '#dc2626'; // News Red
                        ctx.fillRect(0, h - 80, w, 80);
                        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Helvetica, Arial'; ctx.textAlign = 'left';
                        ctx.fillText("BREAKING NEWS  •  GLOBAL AI SUMMIT  •  MARKETS RALLY", 30, h - 30);

                        // Live Bug
                        ctx.fillStyle = '#fff'; ctx.fillRect(w - 120, 30, 90, 40);
                        ctx.fillStyle = '#000'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
                        ctx.fillText("LIVE", w - 75, 58);
                        return;
                    }

                    // 3. CYBER TECH LAB (Sharper)
                    if (bgStyle === 'tech') {
                        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);

                        // Grid Floor
                        ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 1;
                        ctx.beginPath();
                        for (let i = 0; i < w; i += 50) { ctx.moveTo(i, h / 2); ctx.lineTo(i - w / 2, h); }
                        ctx.stroke();

                        // Data Streams
                        ctx.fillStyle = '#0ea5e9';
                        for (let i = 0; i < 10; i++) {
                            ctx.fillRect(Math.random() * w, Math.random() * h / 2, 2, 50);
                        }

                        return;
                    }

                    // 4. LUXURY PENTHOUSE (High-End Interview)
                    if (bgStyle === 'luxury') {
                        // Night City Skyline View
                        const grad = ctx.createLinearGradient(0, 0, 0, h);
                        grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#334155');
                        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

                        // Windows
                        ctx.fillStyle = '#000';
                        ctx.fillRect(w * 0.15, h * 0.2, w * 0.25, h * 0.35);
                        ctx.fillRect(w * 0.60, h * 0.2, w * 0.25, h * 0.35);

                        // --- LIVE VISUALIZER ON MONITORS ---
                        if (isPlaying && amplitudeRef.current > 0.05) {
                            ctx.save();
                            ctx.fillStyle = character?.accentColor || '#4f46e5';
                            const amp = amplitudeRef.current;
                            const drawBars = (bx, by, bw, bh) => {
                                const barCount = 10;
                                const barW = bw / barCount - 2;
                                for (let i = 0; i < barCount; i++) {
                                    const bH = Math.random() * amp * bh;
                                    ctx.fillRect(bx + i * (barW + 2), by + bh - bH, barW, bH);
                                }
                            };
                            drawBars(w * 0.17, h * 0.22, w * 0.21, h * 0.3);
                            drawBars(w * 0.62, h * 0.22, w * 0.21, h * 0.3);
                            ctx.restore();
                        }

                        // City Lights (Bokeh)
                        for (let i = 0; i < 50; i++) {
                            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(250, 204, 21, 0.5)' : 'rgba(248, 113, 113, 0.5)';
                            ctx.beginPath();
                            ctx.arc(Math.random() * w, Math.random() * h * 0.6, Math.random() * 4 + 2, 0, Math.PI * 2);
                            ctx.fill();
                        }

                        // Indoor Plant (Silhouette)
                        ctx.fillStyle = '#022c22';
                        ctx.beginPath(); ctx.ellipse(80, h * 0.6, 60, 120, 0, 0, Math.PI * 2); ctx.fill();
                        return;
                    }
                    // 5. SERENE NATURE (Outdoor Park)
                    if (bgStyle === 'nature') {
                        // Blue Sky
                        const grad = ctx.createLinearGradient(0, 0, 0, h);
                        grad.addColorStop(0, '#38bdf8'); grad.addColorStop(1, '#bae6fd');
                        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

                        // Blurred Background Trees
                        ctx.fillStyle = '#166534'; ctx.filter = 'blur(8px)';
                        ctx.beginPath();
                        ctx.moveTo(0, h); ctx.lineTo(0, h * 0.4);
                        ctx.quadraticCurveTo(w / 2, h * 0.3, w, h * 0.4);
                        ctx.lineTo(w, h);
                        ctx.fill();
                        ctx.filter = 'none';

                        // Sun Flare
                        ctx.fillStyle = 'rgba(253, 224, 71, 0.4)';
                        ctx.beginPath(); ctx.arc(w * 0.9, 100, 80, 0, Math.PI * 2); ctx.fill();
                        return;
                    }

                    // 6. CLEAN GRADIENT (Default)
                    const accent = character?.accentColor || '#4f46e5';
                    const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, h);
                    grad.addColorStop(0, '#1e1b4b');
                    grad.addColorStop(1, '#020617');
                    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
                    // Abstract Shape
                    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.arc(w / 2, h * 0.4, 300, 0, Math.PI * 2); ctx.stroke();

                    // === STUDIO BRANDING (Polished Look) ===
                    ctx.save();
                    ctx.translate(w * 0.1, h * 0.15);
                    ctx.rotate(-0.1);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                    ctx.font = 'bold 30px sans-serif';
                    ctx.fillText("STUDIO", 0, 0);
                    ctx.font = 'bold 15px sans-serif';
                    ctx.fillText("PRO CLONE", 5, 20);
                    // Simple Circle Logo
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                    ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(-15, -10, 20, 0, Math.PI * 2); ctx.stroke();
                    ctx.restore();
                };

                // Execute Background Draw
                drawBackground();

                // === 7. PRESENTATION MODE (User Uploaded Image) ===
                // FIXED: Render at TOP 30%, Keep Desk/Char Visible at Bottom
                if (presentationImage) {
                    // Top Screen Config
                    // Top Screen Config
                    const screenH = h * 0.35; // Top 35%
                    const screenW = w * 0.9;  // Wide
                    const screenX = (w - screenW) / 2;
                    const screenY = h * 0.05; // Gap from top

                    // Draw Screen Border/Bezel
                    ctx.save();
                    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 30;
                    ctx.fillStyle = '#111';
                    ctx.beginPath();
                    ctx.roundRect(screenX - 8, screenY - 8, screenW + 16, screenH + 16, 12);
                    ctx.fill();

                    // Silver inner bezel
                    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
                    ctx.stroke();

                    // Draw Image Object Contain
                    const imgAspect = presentationImage.width / presentationImage.height;
                    const screenAspect = screenW / screenH;
                    let dw, dh, dx, dy;

                    if (imgAspect > screenAspect) {
                        dw = screenW;
                        dh = screenW / imgAspect;
                        dx = screenX;
                        dy = screenY + (screenH - dh) / 2;
                    } else {
                        dh = screenH;
                        dw = screenH * imgAspect;
                        dy = screenY;
                        dx = screenX + (screenW - dw) / 2;
                    }

                    // Mask for the image
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(screenX, screenY, screenW, screenH);
                    ctx.clip();
                    ctx.drawImage(presentationImage, dx, dy, dw, dh);

                    // Screen Glow / Backlight onto background
                    ctx.globalCompositeOperation = 'screen';
                    const screenGlow = ctx.createRadialGradient(w / 2, screenY + screenH / 2, 0, w / 2, screenY + screenH / 2, screenW);
                    screenGlow.addColorStop(0, 'rgba(255,255,255,0.1)');
                    screenGlow.addColorStop(1, 'transparent');
                    ctx.fillStyle = screenGlow;
                    ctx.fillRect(screenX, screenY, screenW, screenH);
                    ctx.restore();

                    // Glass Glare (Perspective & Premium Shine)
                    const glare = ctx.createLinearGradient(screenX, screenY, screenX + screenW, screenY + screenH);
                    glare.addColorStop(0, 'rgba(255,255,255,0.15)');
                    glare.addColorStop(0.3, 'transparent');
                    glare.addColorStop(0.7, 'transparent');
                    glare.addColorStop(1, 'rgba(255,255,255,0.08)');
                    ctx.fillStyle = glare;
                    ctx.fillRect(screenX, screenY, screenW, screenH);

                    // Subtle scanline effect
                    ctx.save();
                    ctx.globalAlpha = 0.03;
                    ctx.fillStyle = '#fff';
                    for (let i = 0; i < screenH; i += 4) ctx.fillRect(screenX, screenY + i, screenW, 1);
                    ctx.restore();

                    ctx.restore();
                }

                // Background Monitors (Apply to Podcast/Tech only)
                if (['podcast', 'tech'].includes(character?.backgroundStyle || 'podcast')) {
                    // ... (Monitors logic below)
                }

                // Draw Character (Scaled & Centered)
                // Position character higher (0.4h) so shoulders are visible above desk (sitting pose)

                // === DUAL CHARACTER MODE ===
                if (secondaryChar) {
                    // Determine Active Speaker
                    let activeSpeaker = '1';
                    if (audioPlaylist.length > 0 && audioPlaylist[currentTrackIndex]) {
                        activeSpeaker = audioPlaylist[currentTrackIndex].speaker || '1';
                    }

                    const isMainActive = (!audioPlaylist.length) || (activeSpeaker === '1');
                    const amp = amplitudeRef.current;
                    const bounce1 = (isMainActive && isPlaying) ? Math.sin(timeRef.current * 12) * amp * 15 : Math.sin(timeRef.current * 2) * 3;

                    // --- 1. Draw Main Character (Left) ---
                    let scale = Math.min(w / 400, h / 500) * 1.15;

                    // Determine Character Height based on Presentation Mode
                    let dualY = presentationImage ? h * 0.58 : h * 0.45;
                    let dualX1 = w * 0.28;
                    let dualX2 = w * 0.72;

                    // Add subtle breathing to the height
                    dualY += Math.sin(timeRef.current * 1.2) * 5;



                    // Override Main Face for Conversation (Look Right)
                    faceRef.current.head.yaw = 0.35;
                    if (!isMainActive && isPlaying) {
                        faceRef.current.mouth.openness = 0;
                    }

                    ctx.save();
                    ctx.translate(dualX1, dualY + bounce1);
                    ctx.scale(scale, scale);

                    // --- DRAW CHAIR BACK (Behind Character) ---
                    ctx.save();
                    ctx.fillStyle = character?.chairColor || '#1e293b';
                    ctx.shadowColor = 'rgba(0,0,0,0.4)';
                    ctx.shadowBlur = 15;
                    // Ergonomic Office Chair Back
                    ctx.beginPath();
                    ctx.roundRect(-75, 50, 150, 200, 40);
                    ctx.fill();
                    // Headrest
                    ctx.beginPath();
                    ctx.roundRect(-45, 10, 90, 60, 20);
                    ctx.fill();
                    ctx.restore();

                    // Dim if not speaking
                    if (audioPlaylist.length > 0 && !isMainActive && isPlaying) {
                        ctx.globalAlpha = 0.7; // More dim for non-active
                    }

                    try {
                        if (character.bodyType === 'animal') drawFullAnimal(ctx, character, faceRef.current, timeRef.current, faceImgRef.current);
                        else if (character.bodyType === 'robot') drawFullRobot(ctx, character, faceRef.current, timeRef.current);
                        else drawFullHuman(ctx, character, faceRef.current, timeRef.current, faceImgRef.current, gesture);
                    } catch (e) { console.error('Main char draw error:', e); }
                    ctx.restore();

                    // --- 2. Draw Secondary Character (Right) ---
                    const isSecActive = (audioPlaylist.length > 0) && (activeSpeaker === '2');
                    const bounce2 = (isSecActive && isPlaying) ? Math.sin(timeRef.current * 12) * amp * 15 : Math.sin(timeRef.current * 2 + 1) * 3;

                    ctx.save();
                    ctx.translate(dualX2, dualY + bounce2);
                    ctx.scale(scale, scale);

                    // --- DRAW CHAIR BACK (Behind Secondary Character) ---
                    ctx.save();
                    ctx.fillStyle = secondaryChar?.chairColor || '#1e293b';
                    ctx.shadowColor = 'rgba(0,0,0,0.4)';
                    ctx.shadowBlur = 15;
                    ctx.beginPath();
                    ctx.roundRect(-75, 50, 150, 200, 40);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.roundRect(-45, 10, 90, 60, 20);
                    ctx.fill();
                    ctx.restore();

                    // Dim if not speaking
                    if (audioPlaylist.length > 0 && !isSecActive && isPlaying) {
                        ctx.globalAlpha = 0.7;
                    }

                    try {
                        // Animation: Look intensely Left (-0.35) to face partner
                        const secMouthOpen = (isSecActive && isPlaying) ? Math.min(0.8, amp * 1.5) : 0;

                        // Secondary character gets same enhanced mouth animation
                        let secMouthShape = {
                            openness: secMouthOpen,
                            width: 0.5 + secMouthOpen * 0.2,
                            smile: 0.3
                        };

                        // Apply phoneme shape if available (secondary uses same keyframes as main)
                        if (phonemeShape && isSecActive && isPlaying) {
                            secMouthShape.openness = phonemeShape.openness * 0.6 + secMouthOpen * 0.4;
                            secMouthShape.width = phonemeShape.width * 0.5 + (0.5 + secMouthOpen * 0.2) * 0.5;
                            secMouthShape.roundness = phonemeShape.roundness || 0;
                        }

                        faceRef2.current = {
                            ...defaultFace,
                            mouth: { openness: secMouthShape.openness, width: secMouthShape.width, smile: 0.3, roundness: secMouthShape.roundness || 0 },
                            head: { yaw: -0.35, pitch: Math.sin(timeRef.current * 0.2 + 2) * 0.03 + breathe, roll: 0 },
                            leftEye: { ...defaultFace.leftEye, openness: blink },
                            rightEye: { ...defaultFace.rightEye, openness: blink }
                        };

                        // Draw Character
                        // Use a merged object to ensure all visual properties exist (fallback to main char defaults if needed)
                        // But usually secondaryChar should be complete.
                        const charToDraw = { ...secondaryChar };
                        if (!charToDraw.bodyType) charToDraw.bodyType = 'human';

                        if (charToDraw.bodyType === 'animal') drawFullAnimal(ctx, charToDraw, faceRef2.current, timeRef.current, faceImgRef2.current);
                        else if (charToDraw.bodyType === 'robot') drawFullRobot(ctx, charToDraw, faceRef2.current, timeRef.current);
                        else drawFullHuman(ctx, charToDraw, faceRef2.current, timeRef.current, faceImgRef2.current);

                    } catch (e) {
                        console.error("Secondary Char Draw Error:", e);
                        // Draw Error Box
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                        ctx.fillRect(-50, -100, 100, 200);
                        ctx.fillStyle = 'white';
                        ctx.font = '12px sans-serif';
                        ctx.fillText("Error", -15, 0);
                    }
                    ctx.restore();



                } else {
                    // === SINGLE MODE (Legacy) ===
                    let cx = w / 2;
                    let cy = h * 0.4;
                    let baseScale = Math.min(w / 400, h / 500) * 1.1;

                    if (presentationImage) {
                        baseScale *= 0.95;
                        cx = w / 2;
                        cy = h * 0.62; // Center lower for presentation visibility
                    } else if (cameraMode === 'center') {
                        cx = w / 2;
                        cy = h * 0.45; // Sit slightly lower for desk visibility
                        baseScale *= 1.1;
                    } else if (cameraMode === 'zoom') {
                        const zoomFactor = 1.1 + (Math.sin(timeRef.current * 0.2) * 0.05);
                        baseScale *= zoomFactor;
                        cx = w / 2;
                        cy = h * 0.38;
                    } else if (cameraMode === 'left') {
                        cx = w * 0.30;
                        cy = h * 0.48;
                        baseScale *= 0.95;
                    } else if (cameraMode === 'right') {
                        cx = w * 0.70;
                        cy = h * 0.48;
                        baseScale *= 0.95;
                    }

                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.scale(baseScale, baseScale);

                    // Ground Shadow
                    ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    ctx.beginPath(); ctx.ellipse(0, 200, 80, 20, 0, 0, Math.PI * 2); ctx.fill();

                    try {
                        if (character.bodyType === 'animal') {
                            drawFullAnimal(ctx, character, faceRef.current, timeRef.current, faceImgRef.current);
                        } else if (character.bodyType === 'robot' || character.bodyType === 'alien') {
                            drawFullRobot(ctx, character, faceRef.current, timeRef.current);
                        } else {
                            drawFullHuman(ctx, character, faceRef.current, timeRef.current, faceImgRef.current, gesture);
                        }
                    } catch (err) {
                        console.error("Draw error:", err);
                    }
                    ctx.restore();
                }



                // === FOREGROUND DESK LAYER ===
                // Drawn AFTER character to simulate sitting behind it
                // ALWAYS DRAW DESK (User Request: "dont remove that table")
                {
                    const dH = h * 0.35; // Desk Height area
                    const dY = h - dH + 20;

                    // Dynamic Desk Color
                    const deskColor = character?.deskColor || 'wood';

                    let deskFill;
                    // Enhanced Wood Texture
                    if (deskColor === 'wood') {
                        // Create Wood Pattern
                        const pCanvas = document.createElement('canvas');
                        pCanvas.width = 100; pCanvas.height = 100;
                        const pCtx = pCanvas.getContext('2d');
                        pCtx.fillStyle = '#5d4037'; pCtx.fillRect(0, 0, 100, 100);
                        // Grain
                        pCtx.strokeStyle = '#4e342e'; pCtx.lineWidth = 2;
                        pCtx.beginPath();
                        for (let i = 0; i < 10; i++) {
                            const yA = i * 10 + Math.sin(i * 1.7) * 2.5;
                            const yB = i * 10 + Math.cos(i * 1.2) * 2.5;
                            pCtx.moveTo(0, yA);
                            pCtx.bezierCurveTo(30, i * 10 + 10, 70, i * 10 - 5, 100, yB);
                        }
                        pCtx.stroke();
                        deskFill = ctx.createPattern(pCanvas, 'repeat');
                    } else if (deskColor === 'white') {
                        const deskGrad = ctx.createLinearGradient(0, dY, w, dY);
                        deskGrad.addColorStop(0, '#e2e8f0');
                        deskGrad.addColorStop(0.5, '#ffffff');
                        deskGrad.addColorStop(1, '#e2e8f0');
                        deskFill = deskGrad;
                    } else if (deskColor === 'black') {
                        const deskGrad = ctx.createLinearGradient(0, dY, w, dY);
                        deskGrad.addColorStop(0, '#0f172a');
                        deskGrad.addColorStop(0.5, '#334155');
                        deskGrad.addColorStop(1, '#0f172a');
                        deskFill = deskGrad;
                    } else if (deskColor === 'blue') {
                        const deskGrad = ctx.createLinearGradient(0, dY, w, dY);
                        deskGrad.addColorStop(0, '#1e3a8a');
                        deskGrad.addColorStop(0.5, '#3b82f6');
                        deskGrad.addColorStop(1, '#1e3a8a');
                        deskFill = deskGrad;
                    } else {
                        // Fallback or 'Glass'
                        deskFill = 'rgba(255, 255, 255, 0.1)';
                    }

                    // Draw Desk Shape with Better Perspective
                    ctx.save();

                    // Desk Surface
                    ctx.shadowColor = 'rgba(0,0,0,0.6)';
                    ctx.shadowBlur = 25;
                    ctx.fillStyle = deskFill;

                    ctx.beginPath();
                    ctx.moveTo(-50, dY + 20); // Extends off screen
                    ctx.quadraticCurveTo(w / 2, dY - 40, w + 50, dY + 20); // Slight upward curve for perspective
                    ctx.lineTo(w + 50, h);
                    ctx.lineTo(-50, h);
                    ctx.fill();

                    // Wood Grain Overlay (if wood) - Perspective transformed
                    if (deskColor === 'wood') {
                        ctx.save();
                        ctx.globalCompositeOperation = 'multiply';
                        ctx.globalAlpha = 0.4;
                        const woodGrad = ctx.createLinearGradient(0, dY, 0, h);
                        woodGrad.addColorStop(0, '#3e2723');
                        woodGrad.addColorStop(1, 'transparent');
                        ctx.fillStyle = woodGrad;
                        ctx.fill();
                        ctx.restore();
                    }

                    // Desk Reflection/Shine (Polished Surface)
                    ctx.save();
                    ctx.globalCompositeOperation = 'overlay';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                    ctx.beginPath();
                    ctx.ellipse(w / 2, dY + 40, w * 0.6, 60, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                    // CHARACTER REFLECTION ON TABLE (The "Mirrored" Look)
                    // Draw simple blurred shapes where characters are
                    if (['wood', 'black', 'blue'].includes(deskColor)) {
                        ctx.save();
                        ctx.globalAlpha = 0.2;
                        ctx.filter = 'blur(10px)';
                        ctx.translate(0, dY + 120);
                        ctx.scale(1, -0.6); // Flip vertical and squash

                        // Reflection blobs
                        if (secondaryChar) {
                            // Main Char Shadow/Reflection
                            ctx.fillStyle = character?.shirtColor || '#333';
                            ctx.beginPath(); ctx.ellipse(w * 0.28, 0, 70, 90, 0, 0, Math.PI * 2); ctx.fill();

                            // Secondary Char Shadow/Reflection
                            ctx.fillStyle = secondaryChar?.shirtColor || '#333';
                            ctx.beginPath(); ctx.ellipse(w * 0.72, 0, 70, 90, 0, 0, Math.PI * 2); ctx.fill();

                            // Chair Reflections
                            ctx.fillStyle = 'rgba(0,0,0,0.3)';
                            ctx.beginPath(); ctx.ellipse(w * 0.28, 40, 60, 40, 0, 0, Math.PI * 2); ctx.fill();
                            ctx.beginPath(); ctx.ellipse(w * 0.72, 40, 60, 40, 0, 0, Math.PI * 2); ctx.fill();
                        } else {
                            ctx.fillStyle = character?.shirtColor || '#333';
                            ctx.beginPath(); ctx.ellipse(w / 2, 0, 90, 110, 0, 0, Math.PI * 2); ctx.fill();
                            // Chair Reflection
                            ctx.fillStyle = 'rgba(0,0,0,0.3)';
                            ctx.beginPath(); ctx.ellipse(w / 2, 40, 80, 50, 0, 0, Math.PI * 2); ctx.fill();
                        }
                        ctx.restore();
                    }

                    // Microphone Stands (Detailed) - If Podcast Mode
                    if (character?.backgroundStyle === 'podcast') {
                        const drawMic = (mx, my, isLeft) => {
                            const size = h / 700;
                            ctx.save();
                            ctx.translate(mx, my);
                            ctx.scale(size, size);

                            // Boom Arm
                            ctx.strokeStyle = '#1e293b';
                            ctx.lineWidth = 6;
                            ctx.lineCap = 'round';
                            ctx.beginPath();
                            ctx.moveTo(0, 200); // Base off screen
                            ctx.quadraticCurveTo(isLeft ? 20 : -20, 100, 0, 0);
                            ctx.stroke();

                            // Shock Mount
                            ctx.strokeStyle = '#333';
                            ctx.lineWidth = 3;
                            ctx.beginPath();
                            ctx.arc(0, 0, 25, 0, Math.PI * 2);
                            ctx.stroke();

                            // Mic Body
                            const micGrad = ctx.createLinearGradient(-15, 0, 15, 0);
                            micGrad.addColorStop(0, '#334155');
                            micGrad.addColorStop(0.5, '#94a3b8'); // Shine
                            micGrad.addColorStop(1, '#334155');
                            ctx.fillStyle = micGrad;

                            // Capsule shape
                            ctx.beginPath();
                            ctx.roundRect(-12, -35, 24, 70, 10);
                            ctx.fill();

                            // Grille Texture
                            ctx.fillStyle = 'rgba(0,0,0,0.3)';
                            for (let i = 0; i < 10; i++) ctx.fillRect(-10, -30 + i * 6, 20, 2);

                            ctx.restore();
                        };

                        if (secondaryChar) {
                            drawMic(w * 0.25, dY - 40, true);
                            drawMic(w * 0.75, dY - 40, false);
                        } else {
                            drawMic(w * 0.4, dY - 40, true); // Single mic
                        }
                    }
                    ctx.restore();
                }

                // === LIGHTING VFX OVERLAY ===
                if (lightingMode !== 'off') {
                    ctx.save();

                    // 1. GLOBAL SCENE CINEMATIC GRADING
                    if (lightingMode === 'full') {
                        // Soft Warm Top Light (Cinematic)
                        const sceneGrad = ctx.createLinearGradient(0, 0, 0, h);
                        sceneGrad.addColorStop(0, 'rgba(255, 230, 200, 0.08)');
                        sceneGrad.addColorStop(0.5, 'transparent');
                        sceneGrad.addColorStop(1, 'rgba(0, 0, 20, 0.1)');
                        ctx.fillStyle = sceneGrad;
                        ctx.fillRect(0, 0, w, h);
                    }

                    // 2. PRESENTATION SCREEN GLOW (Backlight onto characters)
                    if (presentationImage) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'screen';
                        const screenGlow = ctx.createRadialGradient(w / 2, h * 0.2, 0, w / 2, h * 0.2, w * 0.8);
                        screenGlow.addColorStop(0, 'rgba(100, 150, 255, 0.15)');
                        screenGlow.addColorStop(1, 'transparent');
                        ctx.fillStyle = screenGlow;
                        ctx.fillRect(0, 0, w, h);
                        ctx.restore();
                    }

                    // 3. DESK FLOWERS (Detailed)
                    const drawFlowers = (fx, fy, scale = 1) => {
                        ctx.save();
                        ctx.translate(fx, fy);
                        ctx.scale(scale, scale);
                        // Vase (Ceramic Look)
                        const vaseGrad = ctx.createLinearGradient(-15, 0, 15, 0);
                        vaseGrad.addColorStop(0, '#1e3a8a'); vaseGrad.addColorStop(0.5, '#3b82f6'); vaseGrad.addColorStop(1, '#172554');
                        ctx.fillStyle = vaseGrad;
                        ctx.beginPath();
                        ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(18, -45); ctx.lineTo(-18, -45); ctx.closePath();
                        ctx.fill();

                        // Reflection on Vase
                        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(-4, -40, 2, 35);

                        // Flowers (Lush)
                        const colors = ['#f43f5e', '#a855f7', '#f59e0b', '#10b981', '#ec4899'];
                        for (let i = 0; i < 7; i++) {
                            const angle = (i / 7) * Math.PI - Math.PI / 2;
                            const dist = 30 + Math.sin(timeRef.current * 2 + i) * 5;
                            const flX = Math.cos(angle) * dist;
                            const flY = Math.sin(angle) * dist - 50;

                            // Stem
                            ctx.strokeStyle = '#065f46'; ctx.lineWidth = 3;
                            ctx.beginPath(); ctx.moveTo(0, -45); ctx.quadraticCurveTo(flX * 0.5, flY * 0.5, flX, flY); ctx.stroke();

                            // Petals
                            ctx.fillStyle = colors[i % colors.length];
                            ctx.beginPath();
                            for (let j = 0; j < 6; j++) {
                                const pa = (j / 6) * Math.PI * 2 + timeRef.current * 0.5;
                                ctx.arc(flX + Math.cos(pa) * 10, flY + Math.sin(pa) * 10, 8, 0, Math.PI * 2);
                            }
                            ctx.fill();
                            ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(flX, flY, 5, 0, Math.PI * 2); ctx.fill();
                        }
                        ctx.restore();
                    };

                    if (character?.showDeskDecor === true) {
                        drawFlowers(w * 0.1, h - 30, 0.9);
                        drawFlowers(w * 0.9, h - 30, 0.9);
                    }

                    ctx.restore();
                }

                // === LIGHTING OVERLAYS (Requested: Full, Dim, Off, Party) ===
                const applyLighting = () => {
                    if (lightingMode === 'dim') {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                        ctx.fillRect(0, 0, w, h);
                    } else if (lightingMode === 'off') {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                        ctx.fillRect(0, 0, w, h);
                        // Simulated character spotlight
                        const grad = ctx.createRadialGradient(w / 2, h * 0.4, 50, w / 2, h * 0.4, h);
                        grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
                        grad.addColorStop(1, 'transparent');
                        ctx.fillStyle = grad;
                        ctx.fillRect(0, 0, w, h);
                    } else if (lightingMode === 'party') {
                        const hue = (timeRef.current * 100) % 360;
                        ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.2)`;
                        ctx.fillRect(0, 0, w, h);
                        // Random light beams
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        for (let i = 0; i < 3; i++) {
                            const beamHue = (hue + i * 120) % 360;
                            const bx = (Math.sin(timeRef.current + i) * 0.5 + 0.5) * w;
                            const grad = ctx.createRadialGradient(bx, 0, 0, bx, 0, w);
                            grad.addColorStop(0, `hsla(${beamHue}, 80%, 60%, 0.3)`);
                            grad.addColorStop(1, 'transparent');
                            ctx.fillStyle = grad;
                            ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx - 100, h); ctx.lineTo(bx + 100, h); ctx.fill();
                        }
                        ctx.restore();
                    }
                };
                applyLighting();

                // === AMBIENT PARTICLES (High-End Sparkle) ===
                const drawParticles = () => {
                    const count = lightingMode === 'party' ? 20 : 8;
                    ctx.save();
                    for (let i = 0; i < count; i++) {
                        const px = ((Math.sin(timeRef.current * 0.5 + i * 2) * 0.5 + 0.5) * w);
                        const py = ((Math.cos(timeRef.current * 0.3 + i * 3) * 0.5 + 0.5) * h);
                        const size = Math.sin(timeRef.current + i) * 2 + 3;
                        const op = Math.sin(timeRef.current * 2 + i) * 0.2 + 0.2;
                        ctx.fillStyle = lightingMode === 'party' ? `hsla(${(timeRef.current * 50 + i * 40) % 360}, 70%, 70%, ${op})` : `rgba(255,255,255,${op})`;
                        ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();
                };
                if (lightingMode !== 'off') drawParticles();

                // === VIGNETTE (Focus Effect) ===
                const drawVignette = () => {
                    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.4, w / 2, h / 2, h * 1.2);
                    grad.addColorStop(0, 'transparent');
                    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, w, h);
                };
                drawVignette();

                // === CINEMATIC GRADING (Warm Podcast Vibe) ===
                ctx.fillStyle = 'rgba(255, 180, 100, 0.05)';
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillRect(0, 0, w, h);
                ctx.globalCompositeOperation = 'source-over';

                // === OVERLAY TEXT ===
                const showManualCaption = ['manual', 'both'].includes(captionModeRef.current);
                const sizeMap = { sm: 40, md: 56, lg: 72 };

                if (previewTextRef.current && showManualCaption) {
                    const pText = previewTextRef.current;
                    const pPos = previewTextPosRef.current;
                    const capTheme = captionThemeRef.current;
                    const capSize = sizeMap[captionSizeRef.current] || 56;

                    ctx.save();
                    ctx.font = `900 ${capSize}px "Trebuchet MS", "Arial Black", sans-serif`;
                    ctx.textAlign = pPos.includes('right') ? 'right' : 'left';
                    ctx.textBaseline = 'top';
                    const isTop = pPos.includes('top');
                    const tY = isTop ? 60 : h - (capSize + 80);
                    const tX = pPos.includes('right') ? (w - 60) : 60;

                    if (capTheme === 'broadcast') {
                        const metrics = ctx.measureText(pText);
                        const boxW = metrics.width + 36;
                        const boxH = capSize + 22;
                        const boxX = pPos.includes('right') ? tX - boxW + 10 : tX - 10;
                        const boxY = tY - 8;
                        ctx.fillStyle = 'rgba(0,0,0,0.62)';
                        if (ctx.roundRect) {
                            ctx.beginPath();
                            ctx.roundRect(boxX, boxY, boxW, boxH, 12);
                            ctx.fill();
                        } else {
                            ctx.fillRect(boxX, boxY, boxW, boxH);
                        }
                        ctx.fillStyle = '#f8fafc';
                        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
                        ctx.lineWidth = 2;
                        ctx.strokeText(pText, tX, tY);
                    } else if (capTheme === 'minimal') {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                    } else {
                        ctx.fillStyle = '#ffe69a';
                        ctx.strokeStyle = 'rgba(0,0,0,0.72)';
                        ctx.lineWidth = 5;
                        ctx.lineJoin = 'round';
                        ctx.strokeText(pText, tX, tY);
                        ctx.shadowColor = 'rgba(0,0,0,0.35)';
                        ctx.shadowBlur = 8;
                    }

                    ctx.fillText(pText, tX, tY);
                    ctx.restore();
                }

                // === 10. BACKGROUND FLOOR HINT (Best Studio Look) ===
                const drawFloor = () => {
                    ctx.save();
                    const floorGrad = ctx.createLinearGradient(0, h * 0.7, 0, h);
                    floorGrad.addColorStop(0, 'rgba(0,0,0,0.1)');
                    floorGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = floorGrad;
                    ctx.fillRect(0, h * 0.7, w, h * 0.3);
                    ctx.restore();
                };
                drawFloor();

                // === WORD-SYNCED CAPTIONS (Amplitude-Gated Reveal) ===
                const currentSubtitle = (audioPlaylist.length > 0 && audioPlaylist[currentTrackIndex]?.text) || "";
                const showAutoCaption = ['auto', 'both'].includes(captionModeRef.current);
                if (showAutoCaption && currentSubtitle && isPlaying && audioRef.current && audioRef.current.duration) {
                    const capTheme = captionThemeRef.current;
                    const autoFontSize = captionSizeRef.current === 'lg' ? 38 : captionSizeRef.current === 'sm' ? 24 : 30;
                    // 1. Split into individual words
                    const words = currentSubtitle.split(/\s+/).filter(w => w.length > 0);
                    if (words.length === 0) { /* skip */ }
                    else {
                        // 2. Clamp word cursor to valid range
                        const cursor = Math.min(wordCursorRef.current, words.length - 1);

                        // Also use time-based fallback to prevent cursor from falling behind
                        const progress = audioRef.current.currentTime / audioRef.current.duration;
                        const timeBasedCursor = Math.floor(progress * words.length);
                        // Use the further-ahead cursor (prevents stuck captions)
                        const effectiveCursor = Math.max(cursor, timeBasedCursor);
                        // Sync back
                        if (effectiveCursor > wordCursorRef.current) wordCursorRef.current = effectiveCursor;

                        // 3. Determine visible word window (Sliding Window - Centered on Cursor)
                        const windowSize = 12; // Show ~12 words at a time
                        const halfWindow = Math.floor(windowSize / 2);
                        let start = Math.max(0, effectiveCursor - halfWindow);
                        let end = Math.min(words.length, start + windowSize);

                        // Adjust if near end
                        if (end - start < windowSize) {
                            start = Math.max(0, end - windowSize);
                        }

                        const visibleWords = words.slice(start, end);
                        const activeIndexInWindow = effectiveCursor - start;

                        // 4. Render sliding caption line
                        if (visibleWords.length > 0) {
                            ctx.save();
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                            const bottomY = h * 0.95; // Position at bottom

                            const grad = ctx.createLinearGradient(0, h * 0.84, 0, h);
                            grad.addColorStop(0, 'transparent');
                            grad.addColorStop(1, capTheme === 'minimal' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.82)');
                            ctx.fillStyle = grad;
                            ctx.fillRect(0, h * 0.84, w, h * 0.16);

                            // Calculate positions to center the active word
                            ctx.font = `800 ${autoFontSize}px "Georgia", "Times New Roman", serif`;

                            // Measure total width to center the line
                            const wordWidths = visibleWords.map(w => ctx.measureText(w + ' ').width);
                            const totalWidth = wordWidths.reduce((a, b) => a + b, 0);
                            let currentX = w / 2 - totalWidth / 2;

                            visibleWords.forEach((word, i) => {
                                const isCurrent = i === activeIndexInWindow;
                                const dist = Math.abs(i - activeIndexInWindow);

                                // Dynamic styling
                                if (isCurrent) {
                                    if (capTheme === 'broadcast') {
                                        ctx.fillStyle = '#7dd3fc';
                                        ctx.shadowColor = 'rgba(59,130,246,0.45)';
                                    } else if (capTheme === 'minimal') {
                                        ctx.fillStyle = '#ffffff';
                                        ctx.shadowColor = 'transparent';
                                    } else {
                                        ctx.fillStyle = '#ffd700';
                                        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                                    }
                                    ctx.font = `900 ${autoFontSize + 4}px "Georgia", "Times New Roman", serif`;
                                    ctx.shadowBlur = capTheme === 'minimal' ? 0 : 14;
                                    currentX += 2; // Extra spacing for bump
                                } else {
                                    // Neighbors: White, fading out by distance
                                    const opacity = Math.max(0.3, 1 - dist * 0.2);
                                    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                                    ctx.font = `700 ${autoFontSize}px "Georgia", "Times New Roman", serif`;
                                    ctx.shadowBlur = 0;
                                }

                                ctx.fillText(word, currentX + wordWidths[i] / 2, bottomY);
                                currentX += wordWidths[i];
                                if (isCurrent) currentX += 2;
                            });

                            ctx.restore();
                        }
                    }
                }



                // === 10. AI BRAIN VISUALIZER (The "More AI" Feel) ===
                // Draws a sci-fi HUD element in the corner to show "thinking"
                const drawAIBrain = () => {
                    if (socialMode !== 'clean') return; // Don't clutter social modes
                    if ((character?.backgroundStyle || 'podcast') !== 'tech') return;
                    const x = 60;
                    const y = h - 60;

                    // Pulse Ring
                    ctx.strokeStyle = `rgba(99, 102, 241, ${0.3 + amplitudeRef.current})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(x, y, 20 + Math.sin(timeRef.current * 4) * 5, 0, Math.PI * 2);
                    ctx.stroke();

                    // Core
                    ctx.fillStyle = '#6366f1';
                    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();

                    // Orbiting Nodes
                    for (let i = 0; i < 3; i++) {
                        const angle = timeRef.current * 2 + (i * (Math.PI * 2 / 3));
                        const ox = x + Math.cos(angle) * 30;
                        const oy = y + Math.sin(angle) * 30;

                        ctx.fillStyle = '#a5b4fc';
                        ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();
                        // Connection line
                        ctx.strokeStyle = 'rgba(165, 180, 252, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ox, oy); ctx.stroke();
                    }

                    // Status Text
                    ctx.fillStyle = 'rgba(255,255,255,0.7)';
                    ctx.font = '10px monospace';
                    ctx.textAlign = 'left';
                    ctx.fillText(`AI ENGINE: ${isPlaying ? 'ACTIVE' : 'READY'}`, x + 40, y - 5);
                    ctx.fillText(`LIP-SYNC: ${isPlaying ? (amplitudeRef.current * 100).toFixed(0) + '%' : 'IDLE'}`, x + 40, y + 10);
                };
                drawAIBrain();


                // === 11. SOCIAL MEDIA OVERLAY (Influencer Mode) ===
                const drawSocialOverlay = () => {
                    if (socialMode === 'clean') return;

                    const isTikTok = socialMode === 'tiktok';
                    const isIG = socialMode === 'instagram';

                    ctx.save();
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.shadowBlur = 4;

                    // --- TIKTOK STYLE UI ---
                    if (isTikTok) {
                        // Right Sidebar Icons area
                        const iconX = w - 60;
                        const startY = h * 0.45;
                        const gap = 110;

                        // Helper to draw icon stack
                        const drawIcon = (emoji, label, yOffset) => {
                            ctx.textAlign = 'center';
                            ctx.font = '40px Arial';
                            ctx.fillStyle = '#ffffff';
                            ctx.fillText(emoji, iconX, startY + yOffset);
                            ctx.font = 'bold 13px Arial';
                            ctx.fillText(label, iconX, startY + yOffset + 30);
                        };

                        // Profile + Button
                        ctx.beginPath(); ctx.arc(iconX, startY - 20, 24, 0, Math.PI * 2);
                        ctx.fillStyle = '#ffffff'; ctx.fill();
                        ctx.beginPath(); ctx.arc(iconX, startY - 20, 22, 0, Math.PI * 2);
                        ctx.fillStyle = '#000000'; ctx.fill(); // Placeholder PFP
                        // Plus Badge
                        ctx.beginPath(); ctx.arc(iconX, startY + 5, 10, 0, Math.PI * 2);
                        ctx.fillStyle = '#ea4359'; ctx.fill();
                        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.fillText('+', iconX, startY + 9);

                        drawIcon('❤️', '82.4K', gap);
                        drawIcon('💬', '1,204', gap * 2);
                        drawIcon('⭐', '45.1K', gap * 3);
                        drawIcon('↗️', 'Share', gap * 4);

                        // Bottom Ticker
                        ctx.textAlign = 'left';
                        const tickerY = h - 60;
                        // Music Note
                        ctx.font = '24px Arial'; ctx.fillText('🎵', 20, tickerY);
                        // Scrolling Text
                        ctx.font = '16px Arial';
                        const tickerText = "Original Sound - AI Clone Studio • Viral Hits 2024 •  ";
                        const tickOffset = (timeRef.current * 60) % 400;
                        ctx.save();
                        ctx.beginPath(); ctx.rect(50, tickerY - 20, 200, 30); ctx.clip();
                        ctx.fillText(tickerText + tickerText, 50 - tickOffset, tickerY);
                        ctx.restore();

                        // Spinning Disc (Bottom Right)
                        const discX = w - 60;
                        const discY = h - 60;
                        ctx.translate(discX, discY);
                        ctx.rotate(timeRef.current * 2);
                        ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2);
                        ctx.fillStyle = '#222'; ctx.fill();
                        // Album Art
                        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2);
                        ctx.fillStyle = '#ff0050'; ctx.fill();
                        ctx.restore();
                    }

                    // --- INSTAGRAM LIVE STYLE UI ---
                    if (isIG) {
                        // Header Bar
                        ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        ctx.fillRect(0, 0, w, 80);

                        // LIVE Badge
                        ctx.fillStyle = '#e1306c'; // IG Pink/Red
                        ctx.beginPath();
                        // Custom rounded rect since roundRect might not be in all contexts, but modern browsers have it.
                        // Fallback to rect if needed, but keeping roundRect for now.
                        if (ctx.roundRect) {
                            ctx.roundRect(20, 25, 60, 30, 4);
                        } else {
                            ctx.fillRect(20, 25, 60, 30);
                        }
                        ctx.fill();
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 14px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText("LIVE", 50, 45);

                        // Viewers
                        ctx.fillStyle = 'rgba(0,0,0,0.4)';
                        ctx.beginPath();
                        if (ctx.roundRect) {
                            ctx.roundRect(w - 110, 25, 90, 30, 4);
                        } else {
                            ctx.fillRect(w - 110, 25, 90, 30);
                        }
                        ctx.fill();
                        ctx.fillStyle = 'white';
                        ctx.textAlign = 'left';
                        ctx.font = '14px Arial';
                        ctx.fillText("👁️ 15.2k", w - 100, 45);

                        // Checking Comments Animation
                        const commentSim = Math.floor(timeRef.current * 2) % 3;
                        const comments = [
                            { user: "alex_dev", text: "Is this real?? 🤯" },
                            { user: "sarah_ai", text: "Love the outfit! 🔥" },
                            { user: "tech_guru", text: "Which model is this?" }
                        ];

                        // Comment Box Area
                        const commentY = h - 120;
                        ctx.fillStyle = 'rgba(0,0,0,0.4)'; // Gradient fade
                        // Just draw simulated comments
                        let cy = commentY;
                        if (commentSim >= 0) {
                            const c = comments[0];
                            ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#fff'; ctx.fillText(c.user, 20, cy);
                            ctx.font = '14px Arial'; ctx.fillStyle = '#ddd'; ctx.fillText(c.text, 20 + ctx.measureText(c.user).width + 10, cy);
                        }
                        cy -= 30;
                        if (commentSim >= 1) {
                            const c = comments[1];
                            ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#fff'; ctx.fillText(c.user, 20, cy);
                            ctx.font = '14px Arial'; ctx.fillStyle = '#ddd'; ctx.fillText(c.text, 20 + ctx.measureText(c.user).width + 10, cy);
                        }

                        // Input Box
                        ctx.fillStyle = 'rgba(255,255,255,0.1)';
                        ctx.beginPath();
                        if (ctx.roundRect) ctx.roundRect(20, h - 60, w - 100, 40, 20); else ctx.fillRect(20, h - 60, w - 100, 40);
                        ctx.fill();
                        ctx.fillStyle = '#ccc'; ctx.font = '14px Arial'; ctx.fillText("Add a comment...", 40, h - 35);

                        // Actions (Right)
                        ctx.font = '24px Arial'; ctx.fillText('❤️', w - 50, h - 35);
                    }

                    ctx.restore();
                };
                drawSocialOverlay();

            } catch (loopErr) {
                console.error('Animation loop error:', loopErr);
            }
        };
        animationRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationRef.current);
    }, [character, isPlaying, presentationImage, cameraMode, audioPlaylist, currentTrackIndex, aspectRatio, socialMode]);

    // === EXPORT FEATURE LOGIC ===
    useEffect(() => {
        if (isExporting && !isPlaying) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
                setIsExporting(false);
            }
        }
    }, [isPlaying, isExporting]);

    // Robust MimeType Checker with Enhanced Codec Support
    const getSupportedMimeType = () => {
        const types = [
            "video/webm;codecs=vp9,opus",     // Best quality (Chrome, Firefox)
            "video/webm;codecs=vp8,opus",     // Good quality fallback
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm;codecs=h264",
            "video/webm",
            "video/mp4;codecs=h264,aac",      // MP4 fallback
            "video/mp4"
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('✅ Video codec supported:', type);
                return type;
            }
        }
        console.warn('⚠️ Using default codec');
        return ""; // Let browser use default
    };

    const handleExport = () => {
        if (!canvasRef.current) return;
        const stream = canvasRef.current.captureStream(30);
        const tracks = [...stream.getVideoTracks()];
        if (audioDestRef.current) {
            const audioTracks = audioDestRef.current.stream.getAudioTracks();
            if (audioTracks.length > 0) tracks.push(audioTracks[0]);
        }
        const combinedStream = new MediaStream(tracks);

        try {
            const mimeType = getSupportedMimeType();
            const options = mimeType ? { mimeType } : undefined;
            const recorder = new MediaRecorder(combinedStream, options);

            recordedChunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
            recorder.onerror = (event) => {
                console.error('Recording error:', event);
                setIsExporting(false);
                alert('❌ Recording error: ' + event.error);
            };

            recorder.onstop = () => {
                try {
                    const finalMimeType = mimeType || "video/webm";
                    // Determine file extension based on mime type
                    let fileExt = 'webm';
                    if (finalMimeType.includes('mp4')) fileExt = 'mp4';
                    else if (finalMimeType.includes('ogg')) fileExt = 'ogg';

                    const blob = new Blob(recordedChunksRef.current, { type: finalMimeType });
                    const videoSize = (blob.size / (1024 * 1024)).toFixed(2); // Size in MB
                    console.log(`✅ Video generated: ${videoSize} MB`);

                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    const timestamp = new Date().toISOString().slice(0, 10);
                    a.download = `avatar_studio_${timestamp}.${fileExt}`;

                    // Ensure proper download trigger
                    document.body.appendChild(a);
                    a.click();

                    // Clean up
                    setTimeout(() => {
                        try {
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        } catch (e) {
                            console.warn('Cleanup issue:', e);
                        }
                    }, 500);

                    setIsExporting(false);
                    setStatusMsg && setStatusMsg(`✅ Video Downloaded! (${videoSize} MB)`);
                } catch (e) {
                    console.error('Export finalization error:', e);
                    setIsExporting(false);
                    setStatusMsg && setStatusMsg('❌ Download failed');
                }
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsExporting(true);

            if (audioPlaylist.length > 0) {
                setCurrentTrackIndex(0);
                setTimeout(() => setIsPlaying(true), 150);
            } else {
                setIsPlaying(true);
            }
        } catch (e) {
            console.error("Export Error:", e);
            alert(`Export failed: ${e.message}. Try using Chrome or Firefox.`);
        }
    };

    const handleRecording = () => {
        if (!canvasRef.current) return;

        if (isRecording) {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            return;
        }

        // Capture Canvas Stream (30 FPS for smooth animation)
        const stream = canvasRef.current.captureStream(30);
        const tracks = [...stream.getVideoTracks()];

        // Add Audio Track if available
        if (audioDestRef.current) {
            const audioTracks = audioDestRef.current.stream.getAudioTracks();
            if (audioTracks.length > 0) tracks.push(audioTracks[0]);
        }

        const combinedStream = new MediaStream(tracks);

        try {
            const mimeType = getSupportedMimeType();
            const options = mimeType ? { mimeType } : undefined;
            const recorder = new MediaRecorder(combinedStream, options);

            recordedChunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunksRef.current.push(e.data);
            };

            recorder.onerror = (event) => {
                console.error('Recording error:', event);
                setIsRecording(false);
                alert('❌ Recording error: ' + event.error);
            };

            recorder.onstop = () => {
                try {
                    const finalMimeType = mimeType || "video/webm";
                    let fileExt = 'webm';
                    if (finalMimeType.includes('mp4')) fileExt = 'mp4';
                    else if (finalMimeType.includes('ogg')) fileExt = 'ogg';

                    const blob = new Blob(recordedChunksRef.current, { type: finalMimeType });
                    const videoSize = (blob.size / (1024 * 1024)).toFixed(2);
                    console.log(`✅ Recording complete: ${videoSize} MB`);

                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    const timestamp = new Date().toISOString().slice(0, 10);
                    a.download = `avatar_studio_recording_${timestamp}.${fileExt}`;

                    document.body.appendChild(a);
                    a.click();

                    setTimeout(() => {
                        try {
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        } catch (e) {
                            console.warn('Cleanup issue:', e);
                        }
                    }, 500);

                    setIsRecording(false);
                    setStatusMsg && setStatusMsg(`✅ Recording Saved! (${videoSize} MB)`);
                } catch (e) {
                    console.error('Recording finalization error:', e);
                    setIsRecording(false);
                    setStatusMsg && setStatusMsg('❌ Save failed');
                }
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setStatusMsg && setStatusMsg('🔴 Recording...');
        } catch (e) {
            console.error("Recording error:", e);
            alert(`❌ Recording failed: ${e.message}\n\nTry:\n• Using Chrome or Firefox\n• Checking browser permissions\n• Allowing screen recording access`);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => setPresentationImage(img);
        }
    };

    // YouTube Upload Helper - Opens YouTube Studio with video ready for upload
    const handleYouTubeUpload = () => {
        const youtubeStudioUrl = 'https://www.youtube.com/upload';
        const currentVideo = audioPlaylist[currentTrackIndex];
        const videoTitle = currentVideo?.title || 'Avatar Studio Video';
        const videoDescription = `Created with Avatar Studio\n\nCharacter: ${character?.name || 'Avatar'}\nGenerated on: ${new Date().toLocaleDateString()}\n\nCheck out more at: https://avatar-cam.example.com`;

        // Open YouTube Studio
        const youtubeLink = `${youtubeStudioUrl}?title=${encodeURIComponent(videoTitle)}&description=${encodeURIComponent(videoDescription)}`;

        alert(`📹 YouTube Upload Guide:\n\n1. We'll open YouTube Studio for you\n2. Record a video download first (Red button)\n3. Then upload the downloaded file to YouTube\n4. YouTube Studio will open in a new window\n\nWould you like to download the video first?`);

        // First, trigger video download
        const shouldDownload = window.confirm('Download video before uploading to YouTube?');
        if (shouldDownload) {
            handleExport();
        }

        // Guide for YouTube upload
        console.log('📹 YouTube Upload Instructions:');
        console.log('1. Downloaded video is ready');
        console.log('2. Go to: ' + youtubeStudioUrl);
        console.log('3. Click "Create" -> "Upload Video"');
        console.log('4. Select the downloaded avatar_studio_*.webm file');
        console.log('5. Add title, description, and settings');
        console.log('6. Publish!');
    };

    // Calculate Canvas Dimensions based on Aspect Ratio
    const [canvasDims, setCanvasDims] = useState({ w: 800, h: 1200 });

    useEffect(() => {
        if (aspectRatio === '16:9') {
            setCanvasDims({ w: 1600, h: 900 });
        } else {
            // 9:16 Portrait (Mobile)
            // 800 width -> 1422 height
            setCanvasDims({ w: 800, h: 1422 });
        }
    }, [aspectRatio]);

    return (
        <div className="bg-[#1a1230] rounded-2xl overflow-hidden shadow-2xl relative flex items-center justify-center h-full min-h-[400px] border border-white/5">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />
            <canvas
                ref={canvasRef}
                width={canvasDims.w}
                height={canvasDims.h}
                className="w-full h-full object-contain"
            />

            {/* === DIRECTOR CONTROLS (Top Left Overlay) - HIDDEN BY DEFAULT FOR CLEANER LOOK === */}
            {/* 
            <div className="absolute left-4 top-4 z-20 flex flex-col gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-2">
                    <div className="text-[10px] text-white/50 font-bold mb-1 uppercase tracking-wider">Director Actions</div>
                    <div className="grid grid-cols-2 gap-1">
                        <button onClick={() => triggerGesture('wave')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white transition-colors">
                            👋 Wave
                        </button>
                        <button onClick={() => triggerGesture('thumbs_up')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white transition-colors">
                            👍 Like
                        </button>
                        <button onClick={() => triggerGesture('point')} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white transition-colors">
                            👉 Point
                        </button>
                    </div>
                </div>
            </div>
            */}

            {/* Controls Side Bar (Right) */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">

                {/* Play Button */}
                <button
                    onClick={() => onTogglePlay(!isPlaying)}
                    className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg hover:bg-white/20 text-white"
                >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                </button>

                {/* Presentation Image Upload / Remove */}
                <div className="relative group">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-14 h-14 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center transition-all shadow-lg text-white group ${presentationImage
                            ? 'bg-blue-500/80 hover:bg-blue-600 shadow-blue-500/20'
                            : 'bg-white/10 hover:bg-white/20'
                            }`}
                        title={presentationImage ? "Change Background Image" : "Upload Presentation Background"}
                    >
                        <ImageIcon className="w-6 h-6 group-hover:text-blue-300 transition-colors" />
                    </button>
                    {presentationImage && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setPresentationImage(null); }}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white border-2 border-[#1a1230] hover:bg-red-600 transition-colors shadow-lg"
                            title="Remove Image"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Export Button (Direct Download) */}
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className={`w-14 h-14 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center transition-all shadow-lg text-white group ${isExporting
                        ? 'bg-purple-500/80 hover:bg-purple-600 shadow-purple-500/20 animate-pulse'
                        : 'bg-white/10 hover:bg-white/20'
                        }`}
                    title="Export Video (Auto-Record & Download)"
                >
                    <Download className={`w-6 h-6 group-hover:text-purple-300 transition-colors ${isExporting ? 'animate-bounce' : ''}`} />
                </button>

                {/* Record Button */}
                <button
                    onClick={handleRecording}
                    className={`w-14 h-14 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center transition-all shadow-lg text-white group ${isRecording
                        ? 'bg-red-500/80 hover:bg-red-600 shadow-red-500/20'
                        : 'bg-white/10 hover:bg-white/20'
                        }`}
                    title={isRecording ? "Stop Recording" : "Start Screen Recording"}
                >
                    {isRecording ? (
                        <div className="w-4 h-4 bg-white rounded-sm animate-pulse" />
                    ) : (
                        <Film className="w-6 h-6 group-hover:text-red-300 transition-colors" />
                    )}
                </button>

                {/* YouTube Upload Button */}
                <button
                    onClick={handleYouTubeUpload}
                    className="w-14 h-14 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center transition-all shadow-lg text-white group bg-white/10 hover:bg-red-500/80 hover:shadow-red-500/20"
                    title="Upload to YouTube"
                >
                    <Upload className="w-6 h-6 group-hover:text-red-200 transition-colors" />
                </button>
            </div>


        </div>
    );
}
