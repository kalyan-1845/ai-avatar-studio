import React, { useMemo, useState } from 'react';
import {
    Search,
    Plus,
    Trash2,
    Upload,
    User,
    Palette,
    Shirt,
    Glasses,
    WandSparkles,
    Monitor,
    Save
} from 'lucide-react';
import { validateCharacterName, validateImageFile } from '@/utils/validation';

const BODY_TYPES = [
    { id: 'human', label: 'Human' },
    { id: 'animal', label: 'Animal' },
    { id: 'robot', label: 'Robot' },
    { id: 'alien', label: 'Alien' }
];

const HAIR_STYLES = ['short', 'long', 'buzz', 'bob', 'ponytail', 'bun', 'pompadour', 'curly', 'afro', 'messy'];
const BEARD_STYLES = ['none', 'stubble', 'goatee', 'full'];
const GLASSES_STYLES = ['none', 'round', 'square', 'aviator', 'catseye', 'thick'];
const ACCESSORY_STYLES = ['none', 'chain_gold', 'chain_silver', 'headphones', 'earrings_gold', 'earrings_silver', 'rings_gold', 'rings_silver', 'watch_gold', 'watch_silver', 'bandana'];
const OUTFIT_STYLES = ['suit', 'tuxedo', 'blazer', 'turtleneck', 'hoodie', 'gown', 'floral', 'casual', 'denim', 'leather'];
const BACKGROUNDS = ['podcast', 'newsroom', 'tech', 'luxury', 'nature', 'gradient'];
const DESK_COLORS = ['wood', 'white', 'black', 'blue'];
const ANIMAL_TYPES = ['dog', 'cat', 'fox'];
const ROBOT_TYPES = ['tech', 'sleek'];

const PRESET_PALETTES = [
    { id: 'pro', label: 'Pro Blue', outfitColor: '#1e3a8a', hairColor: '#1f2937', skinColor: '#f5d0b0' },
    { id: 'creator', label: 'Creator Pink', outfitColor: '#db2777', hairColor: '#7c2d12', skinColor: '#ffdecb' },
    { id: 'dark', label: 'Noir', outfitColor: '#111827', hairColor: '#111111', skinColor: '#d6a77a' },
    { id: 'neo', label: 'Neo Mint', outfitColor: '#0f766e', hairColor: '#164e63', skinColor: '#e0ac69' }
];

const defaultUserChar = {
    bodyType: 'human',
    gender: 'male',
    outfitStyle: 'blazer',
    outfitColor: '#1e3a8a',
    backgroundStyle: 'podcast',
    deskColor: 'wood',
    chairColor: '#1e293b',
    skinColor: '#f5d0b0',
    hairColor: '#2b1b17',
    hairStyle: 'short',
    glasses: 'none',
    beard: 'none',
    accessories: 'none'
};

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function CharacterManager({ characters, setCharacters, selectedChar, setSelectedChar, darkMode, onUpdateCharacter }) {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [isCreating, setIsCreating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [newChar, setNewChar] = useState({ name: '', emoji: '🙂', bodyType: 'human', image: null });

    const panel = darkMode ? 'bg-[#1a1230] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900';
    const muted = darkMode ? 'text-gray-400' : 'text-gray-500';
    const input = darkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';
    const card = darkMode ? 'bg-black/30 border-white/10 hover:border-white/30' : 'bg-gray-50 border-gray-200 hover:border-violet-400';

    const updateCharacter = (updates) => {
        if (!selectedChar) return;
        if (onUpdateCharacter) {
            onUpdateCharacter(selectedChar.id, updates);
            return;
        }
        setCharacters((prev) => prev.map((c) => (c.id === selectedChar.id ? { ...c, ...updates } : c)));
        setSelectedChar((prev) => (prev ? { ...prev, ...updates } : prev));
    };

    const filteredCharacters = useMemo(() => {
        return characters.filter((c) => {
            const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase());
            const matchesType = typeFilter === 'all' || (c.bodyType || 'human') === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [characters, search, typeFilter]);

    const applyPalette = (palette) => {
        updateCharacter({
            outfitColor: palette.outfitColor,
            hairColor: palette.hairColor,
            skinColor: palette.skinColor
        });
    };

    const randomizeStyle = () => {
        const bodyType = selectedChar?.bodyType || 'human';
        updateCharacter({
            bodyType,
            outfitStyle: randomItem(OUTFIT_STYLES),
            outfitColor: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`,
            hairStyle: randomItem(HAIR_STYLES),
            beard: bodyType === 'human' ? randomItem(BEARD_STYLES) : 'none',
            glasses: randomItem(GLASSES_STYLES),
            accessories: randomItem(ACCESSORY_STYLES),
            backgroundStyle: randomItem(BACKGROUNDS),
            deskColor: randomItem(DESK_COLORS),
            chairColor: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`,
            animalType: bodyType === 'animal' ? randomItem(ANIMAL_TYPES) : undefined,
            robotType: bodyType === 'robot' ? randomItem(ROBOT_TYPES) : undefined
        });
    };

    const resetStyle = () => {
        updateCharacter(defaultUserChar);
    };

    const handleImageUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const fileValidation = validateImageFile(file);
        if (!fileValidation.isValid) {
            setErrorMsg(fileValidation.error);
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setErrorMsg('');
            setNewChar((prev) => ({ ...prev, image: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    const saveCharacter = () => {
        const nameValidation = validateCharacterName(newChar.name);
        if (!nameValidation.isValid) {
            setErrorMsg(nameValidation.error);
            return;
        }

        const char = {
            id: `custom_${Date.now()}`,
            name: newChar.name.trim(),
            emoji: newChar.emoji || '🙂',
            photoUrl: newChar.image,
            category: 'user',
            ...defaultUserChar,
            bodyType: newChar.bodyType
        };

        if (newChar.bodyType === 'animal') char.animalType = 'dog';
        if (newChar.bodyType === 'robot') char.robotType = 'tech';

        const updated = [char, ...characters];
        setCharacters(updated);
        setSelectedChar(char);
        localStorage.setItem('avatarcam_chars_v2', JSON.stringify(updated.filter((c) => c.category === 'user')));
        setNewChar({ name: '', emoji: '🙂', bodyType: 'human', image: null });
        setErrorMsg('');
        setIsCreating(false);
    };

    const deleteCharacter = (id, event) => {
        event.stopPropagation();
        const updated = characters.filter((c) => c.id !== id);
        setCharacters(updated);
        if (selectedChar?.id === id) setSelectedChar(updated[0] || null);
        localStorage.setItem('avatarcam_chars_v2', JSON.stringify(updated.filter((c) => c.category === 'user')));
    };

    return (
        <div className={`${panel} rounded-2xl border p-4 h-full flex flex-col gap-4 overflow-hidden`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black tracking-tight">Character Lab</h2>
                    <p className={`text-xs ${muted}`}>Professional face, style, and scene controls</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New
                </button>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className={`w-4 h-4 absolute left-3 top-2.5 ${muted}`} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search characters"
                        className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none ${input}`}
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className={`px-2 py-2 border rounded-lg text-xs font-semibold ${input}`}
                >
                    <option value="all">All</option>
                    <option value="human">Human</option>
                    <option value="animal">Animal</option>
                    <option value="robot">Robot</option>
                    <option value="alien">Alien</option>
                </select>
            </div>

            <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1 min-h-[140px] max-h-[220px]">
                {filteredCharacters.map((char) => (
                    <button
                        key={char.id}
                        onClick={() => setSelectedChar(char)}
                        className={`relative border rounded-xl overflow-hidden aspect-square transition ${selectedChar?.id === char.id ? 'border-violet-500 ring-2 ring-violet-400/40' : card}`}
                    >
                        {char.photoUrl ? <img src={char.photoUrl} alt={char.name} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-3xl">{char.emoji || '🙂'}</div>}
                        <div className="absolute left-0 right-0 bottom-0 bg-black/70 px-1 py-1 text-[10px] font-bold text-white truncate">{char.name}</div>
                        {char.category === 'user' && (
                            <div onClick={(e) => deleteCharacter(char.id, e)} className="absolute top-1 right-1 bg-red-600 text-white rounded p-1">
                                <Trash2 className="w-3 h-3" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {selectedChar && (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    <div className={`rounded-xl border p-3 ${input}`}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold flex items-center gap-2"><User className="w-3 h-3" /> Identity</p>
                            <button onClick={randomizeStyle} className="text-[11px] px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><WandSparkles className="w-3 h-3" /> Randomize</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                value={selectedChar.name || ''}
                                onChange={(e) => updateCharacter({ name: e.target.value })}
                                className={`px-2 py-2 rounded border text-xs ${input}`}
                                placeholder="Name"
                            />
                            <input
                                value={selectedChar.emoji || ''}
                                onChange={(e) => updateCharacter({ emoji: e.target.value.slice(0, 2) })}
                                className={`px-2 py-2 rounded border text-xs ${input}`}
                                placeholder="Emoji"
                            />
                            <select value={selectedChar.bodyType || 'human'} onChange={(e) => updateCharacter({ bodyType: e.target.value })} className={`px-2 py-2 rounded border text-xs ${input}`}>
                                {BODY_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                            </select>
                            <select value={selectedChar.gender || 'male'} onChange={(e) => updateCharacter({ gender: e.target.value })} className={`px-2 py-2 rounded border text-xs ${input}`}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                            {(selectedChar.bodyType === 'animal') && (
                                <select value={selectedChar.animalType || 'dog'} onChange={(e) => updateCharacter({ animalType: e.target.value })} className={`px-2 py-2 rounded border text-xs ${input}`}>
                                    {ANIMAL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                                </select>
                            )}
                            {(selectedChar.bodyType === 'robot' || selectedChar.bodyType === 'alien') && (
                                <select value={selectedChar.robotType || 'tech'} onChange={(e) => updateCharacter({ robotType: e.target.value })} className={`px-2 py-2 rounded border text-xs ${input}`}>
                                    {ROBOT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className={`rounded-xl border p-3 ${input}`}>
                        <p className="text-xs font-bold mb-2 flex items-center gap-2"><Shirt className="w-3 h-3" /> Style</p>
                        <div className="grid grid-cols-2 gap-2">
                            <select value={selectedChar.outfitStyle || 'blazer'} onChange={(e) => updateCharacter({ outfitStyle: e.target.value })} className={`px-2 py-2 rounded border text-xs ${input}`}>
                                {OUTFIT_STYLES.map((style) => <option key={style} value={style}>{style}</option>)}
                            </select>
                            <select value={selectedChar.hairStyle || 'short'} onChange={(e) => updateCharacter({ hairStyle: e.target.value })} className={`px-2 py-2 rounded border text-xs ${input}`}>
                                {HAIR_STYLES.map((style) => <option key={style} value={style}>{style}</option>)}
                            </select>
                            <select value={selectedChar.beard || 'none'} onChange={(e) => updateCharacter({ beard: e.target.value })} className={`px-2 py-2 rounded border text-xs ${input}`}>
                                {BEARD_STYLES.map((style) => <option key={style} value={style}>{style}</option>)}
                            </select>
                            <select value={selectedChar.glasses || 'none'} onChange={(e) => updateCharacter({ glasses: e.target.value })} className={`px-2 py-2 rounded border text-xs ${input}`}>
                                {GLASSES_STYLES.map((style) => <option key={style} value={style}>{style}</option>)}
                            </select>
                            <select value={selectedChar.accessories || 'none'} onChange={(e) => updateCharacter({ accessories: e.target.value })} className={`px-2 py-2 rounded border text-xs ${input}`}>
                                {ACCESSORY_STYLES.map((style) => <option key={style} value={style}>{style.replace('_', ' ')}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={`rounded-xl border p-3 ${input}`}>
                        <p className="text-xs font-bold mb-2 flex items-center gap-2"><Palette className="w-3 h-3" /> Color Grading</p>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            {PRESET_PALETTES.map((p) => (
                                <button key={p.id} onClick={() => applyPalette(p)} className="px-2 py-2 rounded border text-[10px] font-bold bg-white/5 border-white/10 hover:border-violet-400">{p.label}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <label className="flex items-center justify-between gap-2">Skin <input type="color" value={selectedChar.skinColor || '#f5d0b0'} onChange={(e) => updateCharacter({ skinColor: e.target.value })} /></label>
                            <label className="flex items-center justify-between gap-2">Hair <input type="color" value={selectedChar.hairColor || '#2b1b17'} onChange={(e) => updateCharacter({ hairColor: e.target.value })} /></label>
                            <label className="flex items-center justify-between gap-2">Outfit <input type="color" value={selectedChar.outfitColor || '#1e3a8a'} onChange={(e) => updateCharacter({ outfitColor: e.target.value })} /></label>
                            <label className="flex items-center justify-between gap-2">Chair <input type="color" value={selectedChar.chairColor || '#1e293b'} onChange={(e) => updateCharacter({ chairColor: e.target.value })} /></label>
                        </div>
                    </div>

                    <div className={`rounded-xl border p-3 ${input}`}>
                        <p className="text-xs font-bold mb-2 flex items-center gap-2"><Monitor className="w-3 h-3" /> Scene</p>
                        <div className="grid grid-cols-2 gap-2">
                            <select value={selectedChar.backgroundStyle || 'podcast'} onChange={(e) => updateCharacter({ backgroundStyle: e.target.value })} className={`px-2 py-2 rounded border text-xs ${input}`}>
                                {BACKGROUNDS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                            </select>
                            <select value={selectedChar.deskColor || 'wood'} onChange={(e) => updateCharacter({ deskColor: e.target.value })} className={`px-2 py-2 rounded border text-xs ${input}`}>
                                {DESK_COLORS.map((color) => <option key={color} value={color}>{color}</option>)}
                            </select>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button onClick={resetStyle} className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border border-orange-500/30 text-orange-400 bg-orange-500/10">Reset Style</button>
                            <button onClick={() => updateCharacter({})} className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center justify-center gap-1"><Save className="w-3 h-3" /> Saved</button>
                        </div>
                    </div>
                </div>
            )}

            {isCreating && (
                <div className="fixed inset-0 z-50 bg-black/75 p-4 grid place-items-center" onClick={() => setIsCreating(false)}>
                    <div className={`${panel} rounded-2xl border p-5 w-full max-w-md`} onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-black">Create Character</h3>
                        <p className={`text-xs mt-1 ${muted}`}>Upload a photo and set base identity</p>
                        <div className="mt-4 space-y-3">
                            <input value={newChar.name} onChange={(e) => setNewChar((prev) => ({ ...prev, name: e.target.value }))} placeholder="Character name" className={`w-full px-3 py-2 rounded-lg border text-sm ${input}`} />
                            <div className="grid grid-cols-2 gap-2">
                                <input value={newChar.emoji} onChange={(e) => setNewChar((prev) => ({ ...prev, emoji: e.target.value.slice(0, 2) }))} placeholder="Emoji" className={`px-3 py-2 rounded-lg border text-sm ${input}`} />
                                <select value={newChar.bodyType} onChange={(e) => setNewChar((prev) => ({ ...prev, bodyType: e.target.value }))} className={`px-3 py-2 rounded-lg border text-sm ${input}`}>
                                    {BODY_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                                </select>
                            </div>
                            <label className={`w-full rounded-xl border-2 border-dashed p-4 flex items-center justify-center gap-2 cursor-pointer ${input}`}>
                                <Upload className="w-4 h-4" />
                                <span className="text-sm">Upload face photo</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                            {newChar.image && <img src={newChar.image} alt="preview" className="w-full h-28 object-cover rounded-lg border border-white/10" />}
                            {errorMsg && <p className="text-xs text-rose-500">{errorMsg}</p>}
                            <div className="flex gap-2">
                                <button onClick={() => setIsCreating(false)} className="flex-1 px-3 py-2 rounded-lg border border-white/20 text-sm">Cancel</button>
                                <button onClick={saveCharacter} className="flex-1 px-3 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold">Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
