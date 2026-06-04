-- Migration: Add AI analysis columns to test_results table
-- This adds columns to store Gemini AI analysis findings, recommendations, and summary

ALTER TABLE test_results
ADD COLUMN IF NOT EXISTS ai_findings TEXT,
ADD COLUMN IF NOT EXISTS ai_recommendations TEXT,
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at DESC);
