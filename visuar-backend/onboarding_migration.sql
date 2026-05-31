-- ============================================================
-- VISUAR Onboarding Migration
-- Run this in your Supabase SQL editor or psql client
-- ============================================================

-- Create the onboarding profiles table
CREATE TABLE IF NOT EXISTS user_onboarding_profiles (
    id                      SERIAL PRIMARY KEY,
    user_id                 INTEGER UNIQUE NOT NULL
                                REFERENCES users(id) ON DELETE CASCADE,

    -- Personal
    age                     INTEGER,
    gender                  VARCHAR(50),
    occupation              VARCHAR(150),

    -- Daily habits
    average_screen_time     VARCHAR(50),   -- e.g. "<1hr", "3-6hrs"
    sleep_hours             VARCHAR(50),   -- e.g. "7-8hrs"
    outdoor_activity_hours  VARCHAR(50),   -- e.g. "30min-1hr"
    water_intake            VARCHAR(50),   -- e.g. "1-2L"
    screen_usage_type       VARCHAR(100),  -- Gaming / Study / Work / Mixed

    -- Vision
    wears_glasses           BOOLEAN,
    wears_contacts          BOOLEAN,
    blurry_vision           BOOLEAN,
    night_vision_difficulty BOOLEAN,
    vision_focus            VARCHAR(20),   -- far | near | both | unsure

    -- Symptoms
    headaches_after_screen  BOOLEAN,
    dry_or_irritated_eyes   BOOLEAN,
    eye_fatigue             BOOLEAN,

    -- Medical history
    has_diabetes            BOOLEAN,
    has_high_blood_pressure BOOLEAN,
    family_vision_history   BOOLEAN,

    -- Preferences
    preferred_language      VARCHAR(10),   -- 'en' | 'ur'
    additional_notes        TEXT,

    -- Tracking
    is_completed            BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id
    ON user_onboarding_profiles (user_id);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_updated_at ON user_onboarding_profiles;
CREATE TRIGGER trg_onboarding_updated_at
    BEFORE UPDATE ON user_onboarding_profiles
    FOR EACH ROW EXECUTE PROCEDURE update_onboarding_updated_at();

-- ── Row-Level Security ────────────────────────────────────────────────────────
-- (Only relevant when accessing via the Supabase client, not via direct
--  asyncpg / SQLAlchemy.  Include anyway for defence-in-depth.)

ALTER TABLE user_onboarding_profiles ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (FastAPI backend uses service role key)
CREATE POLICY "service_role_full_access"
    ON user_onboarding_profiles
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ── Done ─────────────────────────────────────────────────────────────────────
-- After running, verify with:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'user_onboarding_profiles';
