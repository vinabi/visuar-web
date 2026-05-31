-- Add vision_focus to existing deployments (safe if column already exists)
ALTER TABLE user_onboarding_profiles
  ADD COLUMN IF NOT EXISTS vision_focus VARCHAR(20);
