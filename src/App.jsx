import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CharacterManager } from '@/components/Dashboard/CharacterManager';
import { ScriptEditor } from '@/components/Dashboard/ScriptEditor';
import { PreviewPlayer } from '@/components/Dashboard/PreviewPlayer';
import { characterPresets as defaultCharacters } from '@/data/characters';
import { Moon, Sun } from 'lucide-react';
import { 
  validateScript, isValidVoice, validateCharacter, 
  safeJsonParse, validateProjectState,
  validateBrowserCompatibility
} from '@/utils/validation';

export function App() {
  const createdAudioUrlsRef = useRef([]);
  const [darkMode, setDarkMode] = useState(true);
  const [browserOk, setBrowserOk] = useState(true);
  const [browserIssues, setBrowserIssues] = useState([]);

  // === BROWSER COMPATIBILITY CHECK ===
  useEffect(() => {
    const compat = validateBrowserCompatibility();
    setBrowserOk(compat.compatible);
    if (!compat.compatible) {
      setBrowserIssues(compat.issues);
      console.warn('Browser compatibility issues:', compat.issues);
    }
  }, []);

  const [characters, setCharacters] = useState(() => {
    try {
      const saved = localStorage.getItem('avatarcam_chars_v2');
      if (saved) {
        const custom = safeJsonParse(saved, []);
        if (Array.isArray(custom)) {
          const defaultIds = new Set(defaultCharacters.map(d => d.id));
          const filtered = custom.filter(c => validateCharacter(c).isValid && !defaultIds.has(c.id));
          return [...defaultCharacters, ...filtered];
        }
      }
    } catch (e) { 
      console.error('Failed to load custom characters:', e);
    }
    return [...defaultCharacters];
  });

  // === PROJECT AUTO-SAVE / LOAD ===
  // Load Project State or defaults
  const [projectState, setProjectState] = useState(() => {
    try {
      const saved = localStorage.getItem('avatarcam_project_state_v1');
      if (!saved) return null;
      const parsed = safeJsonParse(saved, null);
      return validateProjectState(parsed);
    } catch (e) { 
      console.error('Failed to load project state:', e);
      return null; 
    }
  });

  const [selectedChar, setSelectedChar] = useState(() => {
    if (projectState?.selectedCharId) {
      return characters.find(c => c.id === projectState.selectedCharId) || characters[0];
    }
    return characters[0];
  });

  const [scriptText, setScriptText] = useState(projectState?.scriptText || "Hello! I am your AI digital clone. I can speak any text you write, in any voice you choose.");
  const [selectedVoice, setSelectedVoice] = useState(projectState?.selectedVoice || 'en-US-AndrewNeural');

  // Secondary Character & Voice
  const [secondaryChar, setSecondaryChar] = useState(() => {
    if (projectState?.secondaryCharId) {
      return characters.find(c => c.id === projectState.secondaryCharId) || null;
    }
    return null;
  });
  const [selectedVoice2, setSelectedVoice2] = useState(projectState?.selectedVoice2 || 'en-US-AvaNeural');

  // Scene Settings
  const [cameraMode, setCameraMode] = useState(projectState?.cameraMode || 'center');
  const [emotion, setEmotion] = useState(projectState?.emotion || 'neutral');
  const [previewText, setPreviewText] = useState(projectState?.previewText || '');
  const [previewTextPos, setPreviewTextPos] = useState(projectState?.previewTextPos || 'top-right');
  const [captionMode, setCaptionMode] = useState(projectState?.captionMode || 'both');
  const [captionTheme, setCaptionTheme] = useState(projectState?.captionTheme || 'cinema');
  const [captionSize, setCaptionSize] = useState(projectState?.captionSize || 'md');
  const [aspectRatio, setAspectRatio] = useState(projectState?.aspectRatio || '9:16');
  const [socialMode, setSocialMode] = useState(projectState?.socialMode || 'clean');

  // === AUTO-SAVE EFFECT ===
  useEffect(() => {
    const stateToSave = {
      selectedCharId: selectedChar?.id,
      scriptText,
      selectedVoice,
      secondaryCharId: secondaryChar?.id,
      selectedVoice2,
      cameraMode,
      emotion,
      previewText,
      previewTextPos,
      captionMode,
      captionTheme,
      captionSize,
      aspectRatio,
      socialMode
    };
    localStorage.setItem('avatarcam_project_state_v1', JSON.stringify(stateToSave));
  }, [selectedChar, scriptText, selectedVoice, secondaryChar, selectedVoice2, cameraMode, emotion, previewText, previewTextPos, captionMode, captionTheme, captionSize, aspectRatio, socialMode]);

  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [lightingMode, setLightingMode] = useState('full'); // 'full', 'dim', 'off', 'party'

  const updateCharacterById = useCallback((charId, updates) => {
    if (!charId || !updates || typeof updates !== 'object') return;
    setCharacters((prev) => prev.map((char) => (char.id === charId ? { ...char, ...updates } : char)));
    setSelectedChar((prev) => (prev?.id === charId ? { ...prev, ...updates } : prev));
    setSecondaryChar((prev) => (prev?.id === charId ? { ...prev, ...updates } : prev));
  }, []);


  // Persist custom characters to localStorage
  useEffect(() => {
    const custom = characters.filter(c => c.category === 'user');
    localStorage.setItem('avatarcam_chars_v2', JSON.stringify(custom));

    // SYNC SELECTED CHAR: If the selected character was edited in the list, update the selection reference
    if (selectedChar) {
      const updated = characters.find(c => c.id === selectedChar.id);
      if (updated && updated !== selectedChar) {
        setSelectedChar(updated);
      }
    }
    if (secondaryChar) {
      const updatedSecondary = characters.find(c => c.id === secondaryChar.id);
      if (updatedSecondary && updatedSecondary !== secondaryChar) {
        setSecondaryChar(updatedSecondary);
      }
    }
  }, [characters]);

  /* 
     Fixing Stale Closure: Added 'emotion' to dependency array.
     Added Style Mapping: Maps frontend emotions to Azure TTS styles.
     Fixed UX Bug: Added setIsGenerating(false) on success to unblock button.
  */
  const [audioPlaylist, setAudioPlaylist] = useState([]); // Array of { url, charId }

  const fetchWithTimeout = useCallback(async (url, options = {}, timeoutMs = 60000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    return () => {
      createdAudioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      createdAudioUrlsRef.current = [];
    };
  }, []);

  /* 
     Comprehensive Error Handling: Validates inputs, handles network failures, validates responses
     State Safety: Proper state reset on errors, prevents race conditions
     User Feedback: Clear, actionable error messages for beginners and pros
  */
  const handleGenerate = useCallback(async () => {
    // === INPUT VALIDATION ===
    const scriptValidation = validateScript(scriptText);
    if (!scriptValidation.isValid) {
      setStatusMsg(`⚠️ ${scriptValidation.error}`);
      return;
    }

    if (!selectedChar) {
      setStatusMsg('⚠️ Please select a character');
      return;
    }

    if (!isValidVoice(selectedVoice)) {
      setStatusMsg('⚠️ Invalid voice selected');
      return;
    }

    setIsGenerating(true);
    setIsPlaying(false);
    setAudioUrl(null);
    createdAudioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    createdAudioUrlsRef.current = [];
    setAudioPlaylist([]);
    setStatusMsg(`🎤 Analyzing script...`);

    // Map frontend emotion to Azure TTS style
    const styleMap = {
      'happy': 'cheerful',
      'surprised': 'excited',
      'angry': 'angry',
      'sad': 'sad',
      'neutral': 'neutral'
    };
    const style = styleMap[emotion] || 'neutral';

    try {
      const lines = scriptValidation.text.split(/\r?\n/);
      let segments = [];

      // Detection Logic: Look for speaker markers like "1)" or "2."
      const hasExplicitMarkers = lines.some(l => /^[12](?:[\)\.\:\]\-]|\s)/.test(l.trim()));

      if (hasExplicitMarkers) {
        // GROUPED SPEAKER MODE: Combines consecutive lines for the same speaker
        let curSpk = '1';
        let curTxt = '';

        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) return;

          const match = trimmed.match(/^([12])(?:[\)\.\:\]\-]|\s+)?\s*(.*)/);
          if (match) {
            // Push previous speaker's content
            if (curTxt) segments.push({ speaker: curSpk, text: curTxt.trim() });
            curSpk = match[1];
            curTxt = match[2];
          } else {
            // Continuation of current speaker
            curTxt += " " + trimmed;
          }
        });
        // Push last speaker's content
        if (curTxt) segments.push({ speaker: curSpk, text: curTxt.trim() });
      } else if (secondaryChar) {
        // DIALOGUE MODE: Alternates if no markers, but still groups line-breaks
        lines.filter(l => l.trim()).forEach((line, idx) => {
          segments.push({ speaker: (idx % 2 === 0 ? '1' : '2'), text: line.trim() });
        });
      } else {
        // SINGLE MODE: One big segment (Handles long text perfectly)
        segments.push({ speaker: '1', text: scriptValidation.text });
      }

      // Validate segments
      if (segments.length === 0) {
        throw new Error('Script generated no valid segments');
      }
      if (segments.length > 50) {
        throw new Error('Script has too many segments (max 50)');
      }

      console.log(`✅ Parsed ${segments.length} segments for generation.`);
      const newPlaylist = [];
      const failedSegments = [];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        setStatusMsg(`🎙️ Generating [${i + 1}/${segments.length}]...`);

        try {
          const vId = seg.speaker === '1' ? selectedVoice : selectedVoice2;
          const cId = seg.speaker === '1' ? selectedChar.id : secondaryChar?.id;

          if (seg.speaker === '2' && !secondaryChar) {
            console.warn(`⚠️ Skipping Speaker 2 segment (No partner selected)`);
            failedSegments.push(i + 1);
            continue;
          }

          if (!isValidVoice(vId)) {
            throw new Error('Invalid voice ID for segment');
          }

          const response = await fetchWithTimeout('/api/generate/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: seg.text,
              voice: vId,
              rate: '+0%',
              pitch: '+0Hz',
              style: style
            }),
          }, 65000);

          if (!response.ok) {
            const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(errData.error || `Voice generation failed with status ${response.status}`);
          }

          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('audio')) {
            throw new Error('Server returned non-audio response');
          }

          const blob = await response.blob();
          if (!blob || blob.size === 0) {
            throw new Error('Empty audio blob received');
          }

          const url = URL.createObjectURL(blob);
          createdAudioUrlsRef.current.push(url);
          newPlaylist.push({ url, charId: cId, speaker: seg.speaker, text: seg.text });
        } catch (segError) {
          console.error(`❌ Segment ${i + 1} failed:`, segError);
          failedSegments.push(i + 1);
        }
      }

      if (newPlaylist.length > 0) {
        setAudioPlaylist(newPlaylist);
        const msg = failedSegments.length > 0 
          ? `✅ Generated ${newPlaylist.length}/${segments.length} segments (${failedSegments.length} failed)`
          : `✅ Generation Complete! ${newPlaylist.length} segments`;
        setStatusMsg(msg);
      } else {
        throw new Error('No audio was successfully generated. Check your script and try again.');
      }

      setIsGenerating(false);
      setTimeout(() => setStatusMsg(''), 5000);
    } catch (error) {
      console.error('❌ Generation Error:', error);
      const errorMsg = error.message || 'Unknown error during generation';
      setStatusMsg(`❌ Error: ${errorMsg}`);
      setIsGenerating(false);
      setAudioPlaylist([]);
    }
  }, [scriptText, selectedVoice, selectedVoice2, emotion, selectedChar, secondaryChar, fetchWithTimeout]);

  return (
    <div className={`h-screen font-sans flex flex-col overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#0f0a1e] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Browser Compatibility Warning */}
      {!browserOk && (
        <div className="shrink-0 bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
          <strong>⚠️ Browser Issue:</strong> {browserIssues.join(', ')} - Some features may not work. Try Chrome, Firefox, or Edge.
        </div>
      )}

      {/* Header */}
      <header className={`shrink-0 h-16 border-b z-50 px-4 md:px-8 flex items-center justify-between transition-colors duration-300 ${darkMode ? 'border-white/5 bg-[#0f0a1e]/95 backdrop-blur-xl' : 'border-gray-200 bg-white/95 backdrop-blur-xl shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="text-xl">🧬</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none">AI Clone <span className="text-violet-500">Studio</span></h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Pro Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {statusMsg && (
            <div className={`px-3 py-1 rounded-lg text-xs font-medium animate-pulse transition-colors ${darkMode ? 'bg-white/5 text-gray-300' : 'bg-green-100 text-green-700'}`}>
              {statusMsg}
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-all ${darkMode ? 'bg-white/10 hover:bg-white/20 text-yellow-300' : 'bg-gray-100 hover:bg-gray-200 text-indigo-600'}`}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="w-8 h-8 rounded-full bg-linear-to-r from-blue-400 to-cyan-400 border-2 border-white/10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-3 md:p-6">
        <div className="max-w-[1600px] mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

          {/* Left: Character Manager */}
          <div className="lg:col-span-3 min-h-0 flex flex-col overflow-hidden">
            <CharacterManager
              characters={characters}
              setCharacters={setCharacters}
              selectedChar={selectedChar}
              setSelectedChar={setSelectedChar}
              darkMode={darkMode}
              onUpdateCharacter={updateCharacterById}
            />
          </div>

          {/* Center: Script Editor */}
          <div className="lg:col-span-5 min-h-0 flex flex-col overflow-hidden">
            <ScriptEditor
              scriptText={scriptText}
              setScriptText={setScriptText}
              selectedVoice={selectedVoice}
              setSelectedVoice={setSelectedVoice}
              handleGenerate={handleGenerate}
              isGenerating={isGenerating}
              cameraMode={cameraMode} setCameraMode={setCameraMode}
              selectedChar={selectedChar}
              setSelectedChar={setSelectedChar}
              darkMode={darkMode}
              emotion={emotion} setEmotion={setEmotion}
              previewText={previewText} setPreviewText={setPreviewText}
              previewTextPos={previewTextPos} setPreviewTextPos={setPreviewTextPos}
              captionMode={captionMode} setCaptionMode={setCaptionMode}
              captionTheme={captionTheme} setCaptionTheme={setCaptionTheme}
              captionSize={captionSize} setCaptionSize={setCaptionSize}
              aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
              socialMode={socialMode} setSocialMode={setSocialMode}
              secondaryChar={secondaryChar} setSecondaryChar={setSecondaryChar}
              selectedVoice2={selectedVoice2} setSelectedVoice2={setSelectedVoice2}
              availableCharacters={characters}
              lightingMode={lightingMode} setLightingMode={setLightingMode}
              onUpdateCharacter={updateCharacterById}
            />
          </div>

          {/* Right: Preview Player */}
          <div className="lg:col-span-4 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 relative overflow-hidden rounded-2xl border border-white/5 shadow-lg">
              <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-[10px] font-mono text-white/60 border border-white/10 pointer-events-none uppercase tracking-wider">
                Live Preview
              </div>
              <PreviewPlayer
                character={selectedChar}
                audioUrl={audioUrl}
                isPlaying={isPlaying}
                onTogglePlay={setIsPlaying}
                cameraMode={cameraMode}
                emotion={emotion}
                previewText={previewText}
                previewTextPos={previewTextPos}
                captionMode={captionMode}
                captionTheme={captionTheme}
                captionSize={captionSize}
                secondaryChar={secondaryChar}
                audioPlaylist={audioPlaylist}
                setAudioPlaylist={setAudioPlaylist} // To allow clearing/advancing
                lightingMode={lightingMode}
                aspectRatio={aspectRatio}
                socialMode={socialMode}
                setCameraMode={setCameraMode}
              />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
