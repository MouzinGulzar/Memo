import sys
import os
import json

# Set UTF-8 encoding for standard output and input on Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stdin.reconfigure(encoding='utf-8')

# Set Hugging Face mirror endpoint to bypass connection timeout blocks
os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

def main():
    try:
        from sentence_transformers import SentenceTransformer
        # Load bge-small-en-v1.5 model locally exactly once
        model = SentenceTransformer("BAAI/bge-small-en-v1.5", device="cpu")
    except Exception as err:
        print(json.dumps({"error": f"Failed to initialize model: {str(err)}"}), flush=True)
        sys.exit(1)

    # Infinite loop reading queries from stdin line-by-line
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            text = line.strip()
            if not text:
                continue
            
            # Generate embedding vector
            embedding = model.encode(text, normalize_embeddings=True)
            
            # Print vector as a single JSON line and flush immediately
            print(json.dumps(embedding.tolist()), flush=True)
        except Exception as err:
            print(json.dumps({"error": str(err)}), flush=True)

if __name__ == "__main__":
    main()
