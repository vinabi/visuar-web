-- Migration: store full refraction prescription JSON on test_results
ALTER TABLE test_results
  ADD COLUMN IF NOT EXISTS result_json TEXT;
