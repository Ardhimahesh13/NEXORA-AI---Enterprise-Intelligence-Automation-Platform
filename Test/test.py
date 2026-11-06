import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# 1. Initialize the OpenAI client pointing to your LOCAL Ollama server
client = OpenAI(
    base_url=os.getenv("OLLAMA_BASE_URL"),
    api_key=os.getenv("OLLAMA_API_KEY")
)


# Test 1: Local Embeddings (For RAG)

print("Testing Local Embeddings...")
try:
    embed_response = client.embeddings.create(
        model=os.getenv("OLLAMA_EMBED_MODEL"),
        input="Hello Amazon Bedrock, but locally!"
    )
    # Check the dimension of the vector
    embedding_dimension = len(embed_response.data[0].embedding)
    print(f"✅ Success! Embedding dimension: {embedding_dimension}\n")
except Exception as e:
    print(f"❌ Embedding failed: {e}\n")



# Test 2: Local Chat Model (Qwen)

print("Testing Local Chat (Qwen)...")
try:
    chat_response = client.chat.completions.create(
        model=os.getenv("OLLAMA_CHAT_MODEL"),
        messages=[
            {"role": "user", "content": "Explain RAG in one sentence."}
        ],
        max_tokens=200,
        temperature=0.5
    )
    
    print("✅ Success! Qwen Response:")
    print(chat_response.choices[0].message.content)
except Exception as e:
    print(f"❌ Chat failed: {e}\n")