-- =============================================================================
-- VISUAR AI Chat + RAG Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- 2. Vision Knowledge Table (RAG knowledge base)
-- =============================================================================
CREATE TABLE IF NOT EXISTS vision_knowledge (
    id          BIGSERIAL PRIMARY KEY,
    content     TEXT        NOT NULL,
    embedding   vector(768),
    metadata    JSONB       DEFAULT '{}'::JSONB,
    category    VARCHAR(100),
    source      VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vector similarity search function
CREATE OR REPLACE FUNCTION match_vision_knowledge(
    query_embedding vector(768),
    match_count     INT     DEFAULT 4,
    filter          JSONB   DEFAULT '{}'::JSONB
)
RETURNS TABLE (
    id          BIGINT,
    content     TEXT,
    metadata    JSONB,
    category    VARCHAR,
    similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        vk.id,
        vk.content,
        vk.metadata,
        vk.category,
        1 - (vk.embedding <=> query_embedding) AS similarity
    FROM vision_knowledge vk
    WHERE
        vk.embedding IS NOT NULL
        AND (filter = '{}'::JSONB OR vk.metadata @> filter)
    ORDER BY vk.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =============================================================================
-- 4. AI Conversations Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(255) DEFAULT 'New Chat',
    message_count INTEGER      DEFAULT 0,
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_ai_conversation_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER trg_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_ai_conversation_timestamp();

-- =============================================================================
-- 5. AI Messages Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS ai_messages (
    id              BIGSERIAL   PRIMARY KEY,
    conversation_id BIGINT      NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    user_id         INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT        NOT NULL,
    metadata        TEXT,       -- stored as JSON string via SQLAlchemy (column mapped as extra_data)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_vision_knowledge_category
    ON vision_knowledge(category);

-- IVFFlat index for fast approximate nearest-neighbor search
-- Note: requires at least 100 rows; safe to create now, activates once rows exist
CREATE INDEX IF NOT EXISTS idx_vision_knowledge_embedding
    ON vision_knowledge USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id
    ON ai_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at
    ON ai_conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id
    ON ai_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at
    ON ai_messages(created_at ASC);

-- =============================================================================
-- 7. Row Level Security
-- =============================================================================
ALTER TABLE vision_knowledge   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages        ENABLE ROW LEVEL SECURITY;

-- vision_knowledge: readable by anyone; writes only via service-role key
DROP POLICY IF EXISTS "vision_knowledge_select" ON vision_knowledge;
CREATE POLICY "vision_knowledge_select" ON vision_knowledge
    FOR SELECT USING (true);

-- ai_conversations + ai_messages: service-role key bypasses RLS automatically.
-- These policies allow the anon/authenticated roles to do nothing directly.
DROP POLICY IF EXISTS "ai_conversations_deny_direct" ON ai_conversations;
CREATE POLICY "ai_conversations_deny_direct" ON ai_conversations
    FOR ALL USING (false);

DROP POLICY IF EXISTS "ai_messages_deny_direct" ON ai_messages;
CREATE POLICY "ai_messages_deny_direct" ON ai_messages
    FOR ALL USING (false);

-- =============================================================================
-- Done. Run scripts/seed_vision_knowledge.py next to populate the knowledge base.
-- =============================================================================
