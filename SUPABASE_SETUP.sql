-- Run this in your Supabase SQL editor to create the questions table

CREATE TABLE questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT NOT NULL,
  options     TEXT[] NOT NULL,
  correct_idx INTEGER NOT NULL CHECK (correct_idx BETWEEN 0 AND 3),
  explanation TEXT NOT NULL,
  learn_more  TEXT,
  category    TEXT NOT NULL CHECK (category IN ('commands', 'shortcuts', 'concepts', 'mcp', 'workflow')),
  difficulty  TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  source_url  TEXT,
  developer   BOOLEAN NOT NULL DEFAULT false,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration : ajouter learn_more si la table existe déjà
-- ALTER TABLE questions ADD COLUMN IF NOT EXISTS learn_more TEXT;

-- Migration : ajouter le tag developer (questions orientées dev : refactoring, CI/CD, tests, etc.)
-- ALTER TABLE questions ADD COLUMN IF NOT EXISTS developer BOOLEAN NOT NULL DEFAULT false;

-- Index for random query performance
CREATE INDEX questions_active_idx ON questions (active);

-- Allow anonymous read access
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON questions
  FOR SELECT USING (active = true);

-- ============================================
-- User profiles (auth + onboarding)
-- ============================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  activities  TEXT[] NOT NULL DEFAULT '{}',
  usage_level TEXT NOT NULL DEFAULT 'never' CHECK (usage_level IN ('never', 'sometimes', 'often', 'daily')),
  goals       TEXT[] NOT NULL DEFAULT '{}',
  onboarded   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
