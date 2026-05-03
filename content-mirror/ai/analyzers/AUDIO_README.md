# Audio & Transcription Analyzers
**Owner:** Nour Alfarraj

## Files
- `audio_analyzer.py` — Audio quality analysis
- `transcription_analyzer.py` — Whisper speech-to-text
- `test_transcription.py` — Unit tests

## Input
```python
analyze_audio(video_path, language='ar')
# language: 'ar' | 'en' | None (auto-detect)
```

## Output
```json
{
  "audio_quality": "poor | average | good | excellent",
  "silence_ratio": 0.007,
  "snr_db": 16.3,
  "transcript": "...",
  "wpm": 120,
  "filler_word_ratio": 0.0,
  "hook_message_present": true
}
```

## Requirements
- ffmpeg installed on system
- Whisper base model (~140MB, auto-downloads on first run)

## Notes
- silence_ratio > 0.4 → too many pauses
- filler_word_ratio > 0.08 → high filler words
- hook_message_present = False → no speech in first 5 seconds
- wpm > 150 → speaking too fast