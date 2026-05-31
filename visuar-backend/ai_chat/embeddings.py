"""
Embedding generation via Google Gemini.
Dimension: 768 (matches vision_knowledge table vector column).
"""
import os
import asyncio
from google import genai
from google.genai import types
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL  = "gemini-embedding-2"  # 768-dim, must match seed_vision_knowledge.py
EMBEDDING_DIM    = 768

_client = None


def _get_client():
    global _client
    if _client is None:
        if not GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to visuar-backend/.env for AI chat embeddings."
            )
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def _embed_sync(text: str) -> list[float]:
    """Synchronous embedding call — run via asyncio.to_thread in async contexts.

    This module embeds *search queries*, so task_type=RETRIEVAL_QUERY is used.
    The knowledge corpus is embedded with RETRIEVAL_DOCUMENT at ingest time;
    pairing the two task types is what makes similarity ranking accurate.
    If the model build rejects task_type, we fall back to a plain embed so
    chat never hard-fails on an SDK/model mismatch.
    """
    print(f"[EMBEDDING DEBUG] Embedding query: '{text[:80]}{'...' if len(text) > 80 else ''}'")
    try:
        try:
            result = _get_client().models.embed_content(
                model=EMBEDDING_MODEL,
                contents=text,
                config=types.EmbedContentConfig(
                    output_dimensionality=EMBEDDING_DIM,
                    task_type="RETRIEVAL_QUERY",
                ),
            )
        except Exception as task_err:
            print(f"[EMBEDDING DEBUG] task_type unsupported ({task_err}); retrying without it")
            result = _get_client().models.embed_content(
                model=EMBEDDING_MODEL,
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM),
            )
        embedding = list(result.embeddings[0].values)
        print(f"[EMBEDDING DEBUG] ✓ Generated embedding with {len(embedding)} dimensions")
        return embedding
    except Exception as e:
        print(f"[EMBEDDING DEBUG] ❌ Embedding failed: {e}")
        import traceback
        print(f"[EMBEDDING DEBUG] Traceback:\n{traceback.format_exc()}")
        raise


async def embed_text(text: str) -> list[float]:
    return await asyncio.to_thread(_embed_sync, text)


def embed_text_sync(text: str) -> list[float]:
    """Use in scripts that are not inside an async event loop."""
    return _embed_sync(text)
