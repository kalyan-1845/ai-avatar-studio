# Quick Start: Mouth Animation Features

## What's Working Now

### ✅ Text-Based Mouth Animation
- Text entered in the script editor automatically drives mouth shapes
- Each word/phoneme plays unique mouth animation
- Smooth transitions between different mouth positions

### ✅ Audio-Driven Mouth Animation  
- Mouth opening responds to audio volume (amplitude)
- Frequency bands drive different mouth aspects:
  - **Bass frequencies** → Jaw openness (vowels)
  - **Mid frequencies** → Mouth width (consonants)  
  - **High frequencies** → Lip tightness (sibilants)

### ✅ Caption Synchronization
- Text captions at bottom of screen sync with mouth
- Words highlight in gold as they're spoken
- Captions advance with speech bursts (not just timing)

### ✅ Dual Character Mode
- Both characters now have synchronized mouth animation
- Secondary character mirrors primary in mouth movements
- Works with all body types (human, animal, robot)

### ✅ Emotion-Aware Mouth
- **Happy**: Smile increases, mouth wider
- **Sad**: Frown, raised eyebrows, narrow mouth
- **Angry**: Strong downward smile, intense mouth
- **Surprised**: Open mouth, raised eyebrows
- **Neutral**: Natural, relaxed mouth position

---

## Pro Tips for Best Results

### 1. **Write Clear Text with Distinct Words**
Better results with:
- Clear sentence structure
- Distinct syllables
- Natural pauses between phrases

❌ Avoid: "ummm,andthendoitlikethisquickly"  
✅ Use: "Okay. Then do it. Quickly please."

### 2. **Let Audio Generate First**
The system needs actual audio to:
- Analyze frequency bands
- Calculate duration for mouth keyframes  
- Sync phonemes with actual timings

Process:
1. Enter text
2. Click "Generate Audio"
3. Preview video (mouth will animate)

### 3. **Adjust Emotion for Better Results**
Emotions affect:
- How much the mouth smiles/frowns
- Eye expression (sad = raised brows)
- Overall character energy

Examples:
- **Motivational text** → "Happy" emotion
- **Warning/alert** → "Angry" emotion
- **Story/sad news** → "Sad" emotion

### 4. **Use Caption Position for Clarity**
Available positions:
- **Top-right** (recommended for podcasts)
- **Bottom-center** (standard subtitles)
- **Top-left** (for interviews)

---

## Common Settings for Different Genres

### 📻 Podcast
```
Emotion: Neutral or Happy
Camera: Center
Background: Podcast Studio
Mouth Animation: Auto (frequency-driven + text)
Caption Position: Top-right
```

### 📺 News Report
```
Emotion: Neutral (or Serious)
Camera: Center or Slight Zoom
Background: Newsroom
Mouth Animation: Enhanced (emphasize clarity)
Caption Position: Bottom-center
```

### 🎬 Story/Narrative
```
Emotion: Varies by sentiment
Camera: Zoom or Pan
Background: Nature or Luxury
Mouth Animation: Full blend (phoneme + audio)
Caption Position: Bottom-center
```

### 💬 Interview/Dialogue
```
Emotion: Neutral
Camera: Dual Mode (two characters)
Background: Podcast Studio
Mouth Animation: Both characters auto-sync
Caption Position: Top (speaker indicator)
```

---

## Mouth Animation Parameters (Advanced)

These affect how the mouth moves in `mouthAnimation.js`:

### Openness (0 to 1)
- **0.0** = Closed lips
- **0.3** = Slight opening (consonants like "T", "P")
- **0.6** = Medium opening (vowels like "A", "E")
- **0.8+** = Wide opening (laughing, "O", "U")

### Width (0 to 1)  
- **0.3** = Narrow/pursed (lips together)
- **0.5** = Normal speaking width
- **0.8+** = Wide/smile position (showing teeth)

### Roundness (0 to 1)
- **0.0** = Flat, spread mouth ("E", "I" sounds)
- **0.5** = Neutral
- **0.8+** = Rounded, pursed lips ("O", "U" sounds)

### Smile (-1 to +1)
- **-1.0** = Deep frown (angry/sad)
- **0.0** = Neutral
- **+1.0** = Big smile (happy/surprised)

---

## Keyboard Shortcuts & Quick Actions

| Action | How |
|--------|-----|
| Generate Voice | Click "Generate Audio" button |
| Play/Pause | Click play button or Space bar |
| Skip to Next | Click next track in playlist |
| Download Video | Click download button |
| Change Emotion | Select from emotion dropdown |
| Toggle Full Screen | F key in preview |

---

## Performance Tips

### For Smooth Animation:
1. **Close other apps** to free up CPU
2. **Use lower resolution** if laggy (settings)
3. **Generate shorter audio** (<5 minutes)
4. **Disable extra effects** if needed

### For Better Rendering:
1. Use **1080p or higher** for final video
2. **9:16 aspect ratio** for vertical video
3. **60 FPS** for smooth mouth movement
4. Test on **actual device/screen**

---

## Frequently Asked Questions

**Q: Why isn't the mouth opening much?**
- Check if audio is playing (unmute speaker)
- Verify character gender (affects mouth size)
- Audio volume might be too low (increase TTS voice volume)
- Try different emotion setting

**Q: Captions aren't showing?**
- Make sure you entered text in the script editor
- Audio playlist must contain text field
- Enable captions toggle if present
- Check caption position isn't off-screen

**Q: Mouth movements are jerky?**
- Increase smoothing in settings (if available)
- Reduce frame rate burden (close other apps)
- Check internet connection (affects audio generation)
- Try regenerating audio

**Q: Can I adjust mouth size?**
- Character gender determines default mouth size
- Emotion affects smile/frown amount
- Openness values are automatic (audio-driven)
- For custom sizing, edit `draw.js` line ~1378

**Q: How do I sync mouth with video file (not generated)?**
- Upload custom audio and add subtitle text
- System will analyze frequency and generate phonemes
- May not be perfect timing but will sync best-effort

---

## Troubleshooting Checklist

- [ ] Audio is actually playing (not muted)
- [ ] Script text is entered (not empty)
- [ ] Emotion setting is reasonable for text
- [ ] Camera mode is appropriate  
- [ ] Character has face image uploaded (if using photo mode)
- [ ] Audio duration matches text word count
- [ ] Browser console has no errors (F12)
- [ ] Tried refreshing page if nothing works

---

## Contact & Feedback

If you find issues:
1. Check [MOUTH_ANIMATION_GUIDE.md](./MOUTH_ANIMATION_GUIDE.md) for technical details
2. Note the exact symptom and reproduction steps
3. Provide example text that has the issue
4. Check browser console (F12 → Console tab) for error messages

**The mouth animation system is now complete and fully integrated!** 🎉

---

*Last Updated: 2026-02-21*
