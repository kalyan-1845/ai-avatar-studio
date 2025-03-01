import React, { useEffect, useMemo, useState } from 'react';
import {
    Sparkles,
    Languages,
    Mic,
    Users,
    User,
    Monitor,
    SlidersHorizontal,
    Type,
    WandSparkles,
    Play,
    Captions
} from 'lucide-react';

const VOICE_MAP = {
    en: { M: 'en-US-AndrewMultilingualNeural', F: 'en-US-AvaMultilingualNeural', M2: 'en-US-BrianMultilingualNeural', F2: 'en-US-EmmaMultilingualNeural', label: 'English (Universal)' },
    hi: { M: 'hi-IN-MadhurNeural', F: 'hi-IN-SwaraNeural', label: 'Hindi (India)' },
    te: { M: 'te-IN-MohanNeural', F: 'te-IN-ShrutiNeural', label: 'Telugu (India)' },
    es: { M: 'es-ES-AlvaroNeural', F: 'es-ES-ElviraNeural', label: 'Spanish (Spain)' },
    fr: { M: 'fr-FR-HenriNeural', F: 'fr-FR-DeniseNeural', label: 'French (France)' },
    de: { M: 'de-DE-ConradNeural', F: 'de-DE-KatjaNeural', label: 'German (Germany)' },
    ja: { M: 'ja-JP-KeitaNeural', F: 'ja-JP-NanamiNeural', label: 'Japanese (Japan)' }
};

const VOICE_GENDER_BY_NAME = /Ava|Emma|Female|Swara|Shruti|Elvira|Denise|Katja|Nanami/i;

const SCRIPT_PRESETS = [
    {
        id: 'intro',
        label: 'Brand Intro',
        text: 'Welcome back to our channel. Today we are breaking down practical AI workflows you can use right now to save time and build faster.'
    },
    {
        id: 'news',
        label: 'News Update',
        text: 'Good morning. Here is your quick update. Markets opened steady, technology stocks led gains, and investor focus remains on earnings guidance this week.'
    },
    {
        id: 'duel',
        label: 'Dual Debate',
        text: '1) I think this product is ready for launch.\n2) It is close, but quality checks need one more pass.\n1) Fair point. Let us finish testing and ship with confidence.'
    }
];

const EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'surprised'];
const CAMERA_MODES = ['center', 'zoom', 'left', 'right'];
const LIGHTING_PRESETS = ['full', 'dim', 'off', 'party'];

export function ScriptEditor({
    scriptText,
    setScriptText,
    selectedVoice,
    setSelectedVoice,
    handleGenerate,
    isGenerating,
    cameraMode,
    setCameraMode,
    selectedChar,
    setSelectedChar,
    darkMode,
    emotion,
    setEmotion,
    previewText,
    setPreviewText,
    previewTextPos,
    setPreviewTextPos,
    captionMode,
    setCaptionMode,
    captionTheme,
    setCaptionTheme,
    captionSize,
    setCaptionSize,
    secondaryChar,
    setSecondaryChar,
    selectedVoice2,
    setSelectedVoice2,
    availableCharacters = [],
    lightingMode,
    setLightingMode,
    aspectRatio,
    setAspectRatio,
    socialMode,
    setSocialMode,
    onUpdateCharacter
}) {
    const [selectedLang, setSelectedLang] = useState('en');
    const [gender, setGender] = useState('M');
    const [isTranslating, setIsTranslating] = useState(false);
    const [translateError, setTranslateError] = useState('');
    const [mode, setMode] = useState(secondaryChar ? 'dual' : 'single');

    const panel = darkMode ? 'bg-linear-to-b from-[#1f1538] via-[#18102f] to-[#120b25] border-white/15 text-white' : 'bg-linear-to-b from-white to-gray-50 border-gray-200 text-gray-900';
    const muted = darkMode ? 'text-gray-400' : 'text-gray-500';
    const input = darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';
    const section = darkMode ? 'rounded-xl border border-white/10 bg-white/5 p-3 shadow-[0_6px_24px_rgba(0,0,0,0.22)]' : 'rounded-xl border border-gray-200 bg-white p-3 shadow-sm';

    const updateCurrentCharacter = (updates) => {
        if (!selectedChar) return;
        if (onUpdateCharacter) {
            onUpdateCharacter(selectedChar.id, updates);
        } else if (setSelectedChar) {
            setSelectedChar({ ...selectedChar, ...updates });
        }
    };

    useEffect(() => {
        if (secondaryChar && mode === 'single') setMode('dual');
        if (!secondaryChar && mode === 'dual') setMode('single');
    }, [secondaryChar]);

    useEffect(() => {
        const primary = VOICE_MAP[selectedLang]?.[gender];
        const secondary = VOICE_MAP[selectedLang]?.[gender === 'M' ? 'F' : 'M'];
        if (primary) setSelectedVoice(primary);
        if (secondary) setSelectedVoice2(secondary);
    }, [selectedLang, gender, setSelectedVoice, setSelectedVoice2]);

    useEffect(() => {
        if (!selectedVoice) return;
        const [langCode, regionCode] = selectedVoice.split('-');
        const normalizedLang = `${langCode || ''}`.toLowerCase();
        const inferredGender = VOICE_GENDER_BY_NAME.test(selectedVoice) ? 'F' : 'M';

        const langKey = Object.keys(VOICE_MAP).find((code) => {
            if (code === normalizedLang) return true;
            if (code === 'en' && `${langCode}-${regionCode}`.toLowerCase() === 'en-us') return true;
            return false;
        });

        if (langKey && langKey !== selectedLang) setSelectedLang(langKey);
        if (inferredGender !== gender) setGender(inferredGender);
    }, [selectedVoice]);

    const partnerOptions = useMemo(() => availableCharacters.filter((c) => c.id !== selectedChar?.id), [availableCharacters, selectedChar?.id]);

    const handleModeChange = (newMode) => {
        setMode(newMode);
        if (newMode === 'single') {
            setSecondaryChar(null);
            return;
        }
        const fallback = partnerOptions[0] || null;
        setSecondaryChar((prev) => prev || fallback);
    };

    const handleTranslate = async () => {
        if (!scriptText.trim()) return;
        setIsTranslating(true);
        setTranslateError('');
        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: scriptText, target: selectedLang })
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                throw new Error(err.error || 'Translation request failed');
            }
            const data = await response.json();
            if (!data.translated_text) throw new Error('Translation service returned empty result');
            setScriptText(data.translated_text);
        } catch (err) {
            setTranslateError(err.message || 'Translation failed');
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className={`${panel} rounded-2xl border h-full flex flex-col overflow-hidden`}>
            <div className="p-4 border-b border-white/10/80 flex items-start justify-between backdrop-blur">
                <div>
                    <h2 className="text-lg font-black tracking-tight">Studio Master Controls</h2>
                    <p className={`text-xs ${muted}`}>Script, voice, scene, subtitles, and production tuning</p>
                    {translateError && <p className="text-xs text-rose-500 mt-1">{translateError}</p>}
                </div>
                <button
                    onClick={handleTranslate}
                    disabled={isTranslating || !scriptText.trim()}
                    className="px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white flex items-center gap-2"
                >
                    <Languages className={`w-4 h-4 ${isTranslating ? 'animate-spin' : ''}`} />
                    {isTranslating ? 'Translating' : 'Translate'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <section className={section}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold flex items-center gap-2"><Type className="w-3 h-3" /> Script Composer</p>
                        <div className="flex gap-1">
                            {SCRIPT_PRESETS.map((preset) => (
                                <button key={preset.id} onClick={() => setScriptText(preset.text)} className="px-2 py-1 rounded border border-white/20 text-[10px] font-semibold">
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <textarea
                        value={scriptText}
                        onChange={(e) => setScriptText(e.target.value)}
                        className={`w-full h-36 rounded-lg border p-3 text-sm resize-none outline-none ${input}`}
                        placeholder={mode === 'dual' ? 'Use 1) and 2) for speaker split' : 'Write your script here'}
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className={muted}>{scriptText.length} chars</span>
                        <button onClick={() => setScriptText(scriptText.replace(/\s+/g, ' ').trim())} className="px-2 py-1 rounded border border-white/20">Clean spacing</button>
                    </div>
                </section>

                <section className={section}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold flex items-center gap-2"><Users className="w-3 h-3" /> Dialogue Engine</p>
                        <div className="flex gap-1">
                            <button onClick={() => handleModeChange('single')} className={`px-3 py-1 rounded text-[11px] font-bold ${mode === 'single' ? 'bg-violet-600 text-white' : 'border border-white/20'}`}><User className="w-3 h-3 inline mr-1" />Single</button>
                            <button onClick={() => handleModeChange('dual')} className={`px-3 py-1 rounded text-[11px] font-bold ${mode === 'dual' ? 'bg-fuchsia-600 text-white' : 'border border-white/20'}`}><Users className="w-3 h-3 inline mr-1" />Dual</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)} className={`px-2 py-2 rounded border text-xs ${input}`}>
                            {Object.entries(VOICE_MAP).map(([code, config]) => <option key={code} value={code}>{config.label}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-1">
                            <button onClick={() => setGender('M')} className={`py-2 rounded text-xs font-bold ${gender === 'M' ? 'bg-violet-600 text-white' : 'border border-white/20'}`}>Primary Male</button>
                            <button onClick={() => setGender('F')} className={`py-2 rounded text-xs font-bold ${gender === 'F' ? 'bg-violet-600 text-white' : 'border border-white/20'}`}>Primary Female</button>
                        </div>
                        {mode === 'dual' && (
                            <select value={secondaryChar?.id || ''} onChange={(e) => setSecondaryChar(partnerOptions.find((c) => c.id === e.target.value) || null)} className={`col-span-2 px-2 py-2 rounded border text-xs ${input}`}>
                                {partnerOptions.length === 0 && <option value="">No partner available</option>}
                                {partnerOptions.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                            </select>
                        )}
                    </div>
                </section>

                <section className={section}>
                    <p className="text-xs font-bold mb-2 flex items-center gap-2"><Mic className="w-3 h-3" /> Voice Fine Tune</p>
                    <div className="grid grid-cols-2 gap-2">
                        <input value={selectedVoice || ''} onChange={(e) => setSelectedVoice(e.target.value)} className={`px-2 py-2 rounded border text-xs ${input}`} placeholder="Primary voice id" />
                        <input value={selectedVoice2 || ''} onChange={(e) => setSelectedVoice2(e.target.value)} className={`px-2 py-2 rounded border text-xs ${input}`} placeholder="Secondary voice id" />
                    </div>
                </section>

                <section className={section}>
                    <p className="text-xs font-bold mb-2 flex items-center gap-2"><Monitor className="w-3 h-3" /> Scene Direction</p>
                    <div className="grid grid-cols-2 gap-2">
                        <select value={cameraMode} onChange={(e) => setCameraMode(e.target.value)} className={`px-2 py-2 rounded border text-xs ${input}`}>
                            {CAMERA_MODES.map((cm) => <option key={cm} value={cm}>{cm}</option>)}
                        </select>
                        <select value={emotion} onChange={(e) => setEmotion(e.target.value)} className={`px-2 py-2 rounded border text-xs ${input}`}>
                            {EMOTIONS.map((emo) => <option key={emo} value={emo}>{emo}</option>)}
                        </select>
                        <select value={lightingMode} onChange={(e) => setLightingMode(e.target.value)} className={`px-2 py-2 rounded border text-xs ${input}`}>
                            {LIGHTING_PRESETS.map((modeItem) => <option key={modeItem} value={modeItem}>{modeItem}</option>)}
                        </select>
                        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className={`px-2 py-2 rounded border text-xs ${input}`}>
                            <option value="9:16">Vertical 9:16</option>
                            <option value="16:9">Landscape 16:9</option>
                        </select>
                        <select value={socialMode} onChange={(e) => setSocialMode(e.target.value)} className={`px-2 py-2 rounded border text-xs ${input}`}>
                            <option value="clean">Clean</option>
                            <option value="tiktok">TikTok</option>
                            <option value="instagram">Instagram</option>
                        </select>
                        <select value={selectedChar?.backgroundStyle || 'podcast'} onChange={(e) => updateCurrentCharacter({ backgroundStyle: e.target.value })} className={`px-2 py-2 rounded border text-xs ${input}`}>
                            <option value="podcast">Podcast</option>
                            <option value="newsroom">Newsroom</option>
                            <option value="tech">Tech</option>
                            <option value="luxury">Luxury</option>
                            <option value="nature">Nature</option>
                            <option value="gradient">Gradient</option>
                        </select>
                    </div>
                </section>

                <section className={section}>
                    <p className="text-xs font-bold mb-2 flex items-center gap-2"><SlidersHorizontal className="w-3 h-3" /> Overlay & Subtitles</p>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            value={previewText}
                            onChange={(e) => setPreviewText(e.target.value)}
                            className={`col-span-2 px-2 py-2 rounded border text-xs ${input}`}
                            placeholder="Caption/overlay text"
                        />
                        <select value={previewTextPos} onChange={(e) => setPreviewTextPos(e.target.value)} className={`px-2 py-2 rounded border text-xs ${input}`}>
                            <option value="top-left">Top Left</option>
                            <option value="top-right">Top Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-right">Bottom Right</option>
                        </select>
                        <button onClick={() => setPreviewText('')} className="px-2 py-2 rounded border border-rose-400/40 text-rose-400 text-xs font-semibold">Clear Text</button>
                    </div>
                </section>

                <section className={section}>
                    <p className="text-xs font-bold mb-2 flex items-center gap-2"><Captions className="w-3 h-3" /> Captions Pro</p>
                    <div className="grid grid-cols-3 gap-2">
                        <select value={captionMode} onChange={(e) => setCaptionMode(e.target.value)} className={`px-2 py-2 rounded border text-xs ${input}`}>
                            <option value="both">Auto + Manual</option>
                            <option value="auto">Auto only</option>
                            <option value="manual">Manual only</option>
                            <option value="off">Off</option>
                        </select>
                        <select value={captionTheme} onChange={(e) => setCaptionTheme(e.target.value)} className={`px-2 py-2 rounded border text-xs ${input}`}>
                            <option value="cinema">Cinema</option>
                            <option value="broadcast">Broadcast</option>
                            <option value="minimal">Minimal</option>
                        </select>
                        <select value={captionSize} onChange={(e) => setCaptionSize(e.target.value)} className={`px-2 py-2 rounded border text-xs ${input}`}>
                            <option value="sm">Small</option>
                            <option value="md">Medium</option>
                            <option value="lg">Large</option>
                        </select>
                    </div>
                </section>

                <section className={section}>
                    <p className="text-xs font-bold mb-2 flex items-center gap-2"><WandSparkles className="w-3 h-3" /> Production Macros</p>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <button onClick={() => { setAspectRatio('9:16'); setSocialMode('tiktok'); setCameraMode('zoom'); setLightingMode('full'); }} className="px-2 py-2 rounded border border-white/20 font-bold">Shorts</button>
                        <button onClick={() => { setAspectRatio('16:9'); setSocialMode('clean'); setCameraMode('center'); setLightingMode('dim'); }} className="px-2 py-2 rounded border border-white/20 font-bold">Interview</button>
                        <button onClick={() => { setAspectRatio('16:9'); setSocialMode('instagram'); setCameraMode('left'); setLightingMode('party'); }} className="px-2 py-2 rounded border border-white/20 font-bold">Promo</button>
                    </div>
                </section>
            </div>

            <div className="p-4 border-t border-white/10">
                <button
                    onClick={handleGenerate}
                    disabled={!scriptText.trim() || isGenerating}
                    className={`w-full py-3 rounded-xl text-white font-black tracking-wide flex items-center justify-center gap-2 ${isGenerating ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500'}`}
                >
                    {isGenerating ? <><Play className="w-4 h-4 animate-pulse" /> Generating</> : <><Sparkles className="w-4 h-4" /> Render Production Audio</>}
                </button>
            </div>
        </div>
    );
}
