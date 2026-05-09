import sys
import os

# Set Hugging Face mirror endpoint to bypass connection timeout blocks
os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

# Set UTF-8 encoding for standard output on Windows
sys.stdout.reconfigure(encoding='utf-8')

from faster_whisper import WhisperModel

def main():
    if len(sys.argv) < 2:
        print("Error: Missing audio file path argument.", file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print(f"Error: File not found at {audio_path}", file=sys.stderr)
        sys.exit(1)

    # Use CPU by default. Small model provides outstanding accuracy and runs beautifully on CPU
    model = WhisperModel("small", device="cpu", compute_type="float32")

    segments, info = model.transcribe(audio_path, beam_size=5, language="en", condition_on_previous_text=False)

    text = ""
    for segment in segments:
        text += segment.text + " "

    print(text.strip())

if __name__ == "__main__":
    main()
