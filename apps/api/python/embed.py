import sys
import os
import json

# Set UTF-8 encoding for standard output and input on Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stdin.reconfigure(encoding='utf-8')

# Set Hugging Face mirror endpoint to bypass connection timeout blocks
os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

def main():
    # Read text from stdin
    text = sys.stdin.read().strip()

    if not text:
        print(json.dumps({"error": "Empty text received"}))
        sys.exit(1)

    try:
        from sentence_transformers import SentenceTransformer
        
        # Load bge-small-en-v1.5 model locally
        model = SentenceTransformer("BAAI/bge-small-en-v1.5", device="cpu")
        
        # Generate embedding vector
        embedding = model.encode(text, normalize_embeddings=True)
        
        # Return vector as JSON list
        print(json.dumps(embedding.tolist()))
    except Exception as err:
        print(json.dumps({"error": str(err)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
