-- Run this in your Supabase SQL editor to create the questions table

CREATE TABLE questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT NOT NULL,
  options     TEXT[] NOT NULL,
  correct_idx INTEGER NOT NULL CHECK (correct_idx BETWEEN 0 AND 3),
  explanation TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('commands', 'shortcuts', 'concepts', 'mcp', 'workflow')),
  difficulty  TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  source_url  TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for random query performance
CREATE INDEX questions_active_idx ON questions (active);

-- Allow anonymous read access
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON questions
  FOR SELECT USING (active = true);
