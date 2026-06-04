"""
RAG Engine - vector similarity search against the vision_knowledge table.
Uses the Supabase service-role client to call the match_vision_knowledge RPC.

Retrieval quality strategy
--------------------------
The RPC always returns the top-N nearest vectors, even when those vectors are
only weakly related to the query. Feeding weak matches to the LLM is the main
source of "noisy context" -> degraded / rambling / cut-off answers.

To fix that, retrieval here is a three-stage funnel:

  1. OVER-FETCH   - ask the RPC for more candidates than we ultimately want
                    (FETCH_MULTIPLIER x final count) so there is room to filter.
  2. THRESHOLD    - drop candidates whose cosine similarity is below
                    MIN_SIMILARITY. A weak match is worse than no match.
  3. DE-DUPLICATE - drop near-identical chunks so the LLM never sees the same
                    fact twice (duplicates crowd out genuinely new context).

The surviving chunks, ranked best-first, are trimmed to `match_count`.
"""
from __future__ import annotations

import os
import re
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

SUPABASE_URL          = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

_service_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ── Retrieval tuning ──────────────────────────────────────────────────────────
DEFAULT_MATCH_COUNT = 3      # chunks handed to the LLM after filtering
FETCH_MULTIPLIER    = 4      # over-fetch factor (candidates = count x this)
MIN_FETCH           = 10     # never fetch fewer than this many candidates
MIN_SIMILARITY      = 0.55   # cosine-similarity floor for a "good" match
ABSOLUTE_FLOOR      = 0.40   # if nothing clears MIN_SIMILARITY, the single best
                             # match is still used only if it clears this
NEAR_DUPLICATE_RATIO = 0.85  # Jaccard word-overlap above which two retrieved
                             # chunks are treated as duplicates


# ── De-duplication ────────────────────────────────────────────────────────────

def _word_set(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _is_near_duplicate(a: str, b: str) -> bool:
    wa, wb = _word_set(a), _word_set(b)
    if not wa or not wb:
        return False
    union = len(wa | wb)
    return union > 0 and (len(wa & wb) / union) >= NEAR_DUPLICATE_RATIO


def _deduplicate(chunks: list[dict]) -> list[dict]:
    """Keep chunks in rank order, dropping any near-duplicate of a kept chunk."""
    kept: list[dict] = []
    for chunk in chunks:
        content = (chunk.get("content") or "").strip()
        if not content:
            continue
        if any(_is_near_duplicate(content, k.get("content", "")) for k in kept):
            print(f"[RAG_ENGINE] dropped near-duplicate chunk "
                  f"(id={chunk.get('id')})")
            continue
        kept.append(chunk)
    return kept


# ── Search ────────────────────────────────────────────────────────────────────

def _search_sync(
    query_embedding: list[float],
    match_count: int,
    category: str | None,
    min_similarity: float,
) -> list[dict]:
    fetch_count = max(match_count * FETCH_MULTIPLIER, MIN_FETCH)
    params = {
        "query_embedding": query_embedding,
        "match_count": fetch_count,
        # The RPC filters JSONB metadata with @>; category lives in its own
        # column, so category filtering is left to post-processing below.
        "filter": {},
    }
    print(f"[RAG_ENGINE] match_vision_knowledge: fetch={fetch_count} "
          f"(final target={match_count}), embedding_dim={len(query_embedding)}, "
          f"category={category}")

    try:
        result = _service_client.rpc("match_vision_knowledge", params).execute()
        candidates = result.data or []
    except Exception as e:
        import traceback
        print(f"[RAG_ENGINE] RPC call failed: {e}")
        print(traceback.format_exc())
        return []

    print(f"[RAG_ENGINE] RPC returned {len(candidates)} candidate(s)")
    if not candidates:
        return []

    # Optional category narrowing (column-based, since the RPC can't do it).
    if category:
        narrowed = [c for c in candidates if c.get("category") == category]
        if narrowed:
            candidates = narrowed

    # Rank best-first by similarity.
    candidates.sort(key=lambda c: c.get("similarity", 0.0), reverse=True)

    # Stage 2: similarity threshold.
    strong = [c for c in candidates if c.get("similarity", 0.0) >= min_similarity]
    for c in candidates:
        sim = c.get("similarity", 0.0)
        flag = "keep" if sim >= min_similarity else "below-threshold"
        print(f"[RAG_ENGINE]   id={c.get('id')} similarity={sim:.4f} -> {flag}")

    if not strong:
        # Nothing strong. Fall back to the single best match only if it is at
        # least plausibly relevant; otherwise return nothing so the assistant
        # answers from its general guidance instead of from noise.
        best = candidates[0]
        if best.get("similarity", 0.0) >= ABSOLUTE_FLOOR:
            print(f"[RAG_ENGINE] no chunk cleared {min_similarity}; "
                  f"using single best (similarity={best['similarity']:.4f})")
            strong = [best]
        else:
            print(f"[RAG_ENGINE] no chunk cleared the absolute floor "
                  f"{ABSOLUTE_FLOOR}; returning empty context")
            return []

    # Stage 3: de-duplicate, then trim to the final count.
    deduped = _deduplicate(strong)
    final = deduped[:match_count]
    print(f"[RAG_ENGINE] returning {len(final)} chunk(s) after "
          f"threshold + de-duplication")
    return final


async def similarity_search(
    query_embedding: list[float],
    match_count: int = DEFAULT_MATCH_COUNT,
    category: str | None = None,
    min_similarity: float = MIN_SIMILARITY,
) -> list[dict]:
    """Return the top filtered knowledge chunks most similar to the query."""
    return await asyncio.to_thread(
        _search_sync, query_embedding, match_count, category, min_similarity
    )


# ── Context assembly ──────────────────────────────────────────────────────────

def build_context_string(chunks: list[dict]) -> str:
    """
    Format retrieved chunks into a clean, clearly delimited context block.
    Each chunk is labelled and separated so the LLM treats them as distinct
    reference passages rather than one run-on blob.
    """
    if not chunks:
        return ""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        cat = chunk.get("category", "general")
        content = (chunk.get("content") or "").strip()
        if not content:
            continue
        parts.append(f"[Reference {i} | topic: {cat}]\n{content}")
    return "\n\n".join(parts)
