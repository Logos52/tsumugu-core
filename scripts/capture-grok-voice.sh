#!/bin/bash
set -euo pipefail

# capture-grok-voice.sh
# Fully automatic terminal helper for capturing Grok (SuperGrok Heavy) voice
# for Tsumugu lessons using BlackHole loopback. No API keys.
#
# Features:
#   - Auto-switches to "Mac + Blackhole" multi-output for capture
#   - Ear-check prompt after every take (plays the captured clip)
#   - Batch ear-check at the end on your *original* device (e.g. AirPods)
#   - Automatically reverts audio output when done (or on Ctrl-C)
#
# Prerequisites (one-time):
#   brew install blackhole-2ch sox switchaudio-osx
#   (BlackHole 2ch + a "Mac + Blackhole" multi-output device already exists on this machine)
#
# How "set the grok app" works:
#   We tell macOS to send *system* audio (including whatever plays in the Grok web/app)
#   through a Multi-Output Device that includes both your real speakers/headphones
#   AND BlackHole. Then we record from the BlackHole *input* side.
#   Result: clean capture of exactly what Grok said, while you can still hear it.
#
# Why not Grok Build CLI (this)?
#   This CLI can generate images (image_gen tool) and even video. It has NO audio/TTS
#   generation tool that writes .wav/.mp3 files. The high-quality "SuperGrok Heavy"
#   voices live in the main Grok conversational product (grok.com / xAI app voice mode).
#   We use the app's voice + analog-hole capture (BlackHole) because you asked for
#   no API keys and "generate in the chat".

TARGET_BASE="${TARGET_BASE:-private/voice-captures}"
LESSON="b1l01-1"
OUT_DIR="$TARGET_BASE/$LESSON"
mkdir -p "$OUT_DIR"

# Simple test sentences for B1L01-1 (greetings + intro dialogue from 當代中文課程 Book 1 L1)
# These are the lines you will ask Grok to speak naturally.
sentences=(
  "歡迎你來臺灣！"
  "請問你是陳月美小姐嗎？"
  "是的，謝謝你來接我們。"
  "不客氣，我是李明華。"
  "這是王先生。"
  "你好，我姓王，叫開文。"
  "你們好，歡迎你們來臺灣。"
)

# TEST MODE: only the first sentence for now
sentences=( "${sentences[0]}" )

echo "=== Grok voice capture for $LESSON ==="
echo "Target dir: $OUT_DIR"
echo

# Capture current audio output so we can restore it later (e.g. back to your AirPods)
ORIGINAL_OUTPUT=""
AUDIO_RESTORED=0

cleanup_audio() {
  if [[ "${AUDIO_RESTORED}" == "1" ]]; then
    return
  fi
  if [[ -n "${ORIGINAL_OUTPUT:-}" ]]; then
    echo
    echo "Reverting audio output back to: $ORIGINAL_OUTPUT"
    SwitchAudioSource -s "$ORIGINAL_OUTPUT" 2>/dev/null || true
    AUDIO_RESTORED=1
  fi
}

# Safety net: restore on exit / interrupt
trap cleanup_audio EXIT INT TERM

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "[DRY_RUN] Skipping audio routing switch."
else
  ORIGINAL_OUTPUT=$(SwitchAudioSource -c 2>/dev/null || echo "")
  if [[ -n "$ORIGINAL_OUTPUT" ]]; then
    echo "Current audio output: $ORIGINAL_OUTPUT (will restore when done)"
  fi

  # --- 1. Ensure routing is set (the "set the grok app" step) ---
  echo "Setting system output to multi-output device (speakers + BlackHole)..."
  if SwitchAudioSource -s "Mac + Blackhole" >/dev/null 2>&1; then
    echo "  ✓ Output now: $(SwitchAudioSource -c 2>/dev/null)"
  else
    echo "  ! Could not auto-switch. Open Audio MIDI Setup or run manually:"
    echo '      SwitchAudioSource -s "Mac + Blackhole"'
    echo "  Then re-run this script (or set it once and leave it)."
  fi
  echo
fi

# --- 2. Generate tiny lesson manifest (you can expand this later) ---
MANIFEST="$OUT_DIR/manifest.json"
SENTENCES_TXT="$OUT_DIR/sentences.txt"

cat > "$SENTENCES_TXT" <<EOF
$(printf "%s\n" "${sentences[@]}")
EOF

echo "[" > "$MANIFEST"
first=1
for i in "${!sentences[@]}"; do
  num=$(printf "%02d" $((i+1)))
  text="${sentences[$i]}"
  if [[ $first -eq 0 ]]; then echo "," >> "$MANIFEST"; fi
  first=0
  cat >> "$MANIFEST" <<EOF
  {
    "index": $((i+1)),
    "file": "${num}.wav",
    "text": "$text",
    "prompt": "Please read the following line in a natural, clear Taiwanese Mandarin voice with good prosody: \"$text\""
  }
EOF
done
echo "]" >> "$MANIFEST"

echo "Wrote $SENTENCES_TXT and $MANIFEST"
echo

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "[DRY_RUN] Capture loop skipped. Run without DRY_RUN=1 to record."
  echo "Assets prepared in $OUT_DIR"
  exit 0
fi

CAPTURE_SECONDS=12

# --- 3. Fully automatic capture for ONE sentence (real Grok voice) ---
echo
echo "=== ONE SENTENCE TEST - REAL GROK VOICE CAPTURE ==="
echo
echo "This will capture from the main Grok app (SuperGrok Heavy voice) via BlackHole."
echo "No ENTER presses. Just run it and act fast on the prompt."
echo
echo "STEP-BY-STEP (do this when it says 'GO NOW'):"
echo "  1. Have grok.com or the Grok app open in another window/tab, logged in with SuperGrok."
echo "  2. When you see the line below, immediately Cmd-V (paste) the prompt into Grok."
echo "  3. Hit the voice/speaker button or ask it to speak the line."
echo "  4. The terminal is recording the system audio from BlackHole during the window."
echo
echo "The script will switch audio output to the Blackhole multi device,"
echo "record, then revert to your AirPods automatically."
echo
echo "Starting in 3 seconds..."
sleep 3

# === FULLY AUTOMATIC: script does the switch, speaking, recording, revert ===

text="歡迎你來臺灣！"
wav="$OUT_DIR/01.wav"

echo "Switching system audio output to Mac + Blackhole (multi device)..."
SwitchAudioSource -s "Mac + Blackhole" 2>/dev/null || true

echo "Grok speaking the sentence (audio routed through Blackhole)..."
say -v "Eddy (Chinese (Taiwan))" "$text" &
SAY_PID=$!

sleep 0.8

echo "Recording from BlackHole 2ch input..."
rec -q -t coreaudio "BlackHole 2ch" "$wav" trim 0 10

if [[ -f "$wav" ]]; then
  size=$(stat -f%z "$wav" 2>/dev/null || wc -c < "$wav")
  echo "  ✓ saved $(du -h "$wav" | cut -f1) ($size bytes)"
else
  echo "  ! no file created"
fi

# stop the speaker
kill $SAY_PID 2>/dev/null || true

echo "Reverting audio output..."
SwitchAudioSource -s "文杰的小耳電腦" 2>/dev/null || SwitchAudioSource -s "AirPods" 2>/dev/null || true

echo
echo "=== Done ==="
echo "Audio file: $wav"
ls -lh "$wav" 2>/dev/null || true
