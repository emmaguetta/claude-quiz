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

-- ============================================
-- MCP Search Engine
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE mcps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT UNIQUE NOT NULL,
  description         TEXT,
  categories          TEXT[] DEFAULT '{}',
  source_url          TEXT,
  repo_url            TEXT,
  icon_url            TEXT,
  smithery_id         TEXT UNIQUE,
  tools_count         INTEGER DEFAULT 0,
  verified            BOOLEAN DEFAULT false,
  use_count           INTEGER DEFAULT 0,
  github_stars        INTEGER DEFAULT 0,
  last_commit_at      TIMESTAMPTZ,
  quality_score       REAL DEFAULT 0,
  pricing_type        TEXT DEFAULT 'free' CHECK (pricing_type IN ('free', 'paid', 'freemium')),
  pricing_amount      NUMERIC(10,2),
  pricing_note        TEXT,
  pricing_confidence  TEXT DEFAULT 'low' CHECK (pricing_confidence IN ('low', 'medium', 'high')),
  active              BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mcp_tools (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_id       UUID REFERENCES mcps(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  input_schema JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mcp_chunks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_id     UUID REFERENCES mcps(id) ON DELETE CASCADE NOT NULL,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('mcp', 'tool', 'tool_group')),
  content    TEXT NOT NULL,
  tool_name  TEXT,
  embedding  VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mcp_chunks_embedding ON mcp_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_mcps_slug ON mcps(slug);
CREATE INDEX idx_mcps_active ON mcps(active);
CREATE INDEX idx_mcps_categories ON mcps USING gin(categories);
CREATE INDEX idx_mcp_tools_mcp_id ON mcp_tools(mcp_id);
CREATE INDEX idx_mcp_chunks_mcp_id ON mcp_chunks(mcp_id);

ALTER TABLE mcps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mcps_public_read" ON mcps FOR SELECT USING (active = true);
CREATE POLICY "mcp_tools_public_read" ON mcp_tools FOR SELECT USING (true);
CREATE POLICY "mcp_chunks_public_read" ON mcp_chunks FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION search_mcps(
  query_embedding VECTOR(1536),
  match_threshold DOUBLE PRECISION DEFAULT 0.5,
  match_count INTEGER DEFAULT 50,
  filter_categories TEXT[] DEFAULT NULL,
  query_text TEXT DEFAULT NULL,
  filter_tool_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  mcp_id UUID, mcp_name TEXT, mcp_description TEXT, mcp_slug TEXT,
  mcp_categories TEXT[], mcp_tool_tags TEXT[], mcp_source_url TEXT, mcp_repo_url TEXT, mcp_icon_url TEXT,
  mcp_verified BOOLEAN, mcp_tools_count INTEGER,
  mcp_quality_score DOUBLE PRECISION, mcp_github_stars INTEGER,
  mcp_use_count INTEGER, mcp_pricing_type TEXT, mcp_pricing_note TEXT,
  chunk_type TEXT, chunk_content TEXT, chunk_tool_name TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE sql AS $function$
  WITH query_words AS (
    -- Extract discriminating words from query (skip short words, stop words, and generic verbs)
    SELECT array_agg(word) AS words, count(*) AS num_words
    FROM (
      SELECT word FROM unnest(string_to_array(lower(trim(COALESCE(query_text, ''))), ' ')) AS word
      WHERE length(word) > 2
      AND word NOT IN (
        'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were',
        'not', 'but', 'can', 'will', 'use', 'how', 'what', 'when', 'where', 'who',
        'des', 'les', 'une', 'pour', 'dans', 'sur', 'avec', 'par', 'est', 'que', 'qui',
        'send', 'get', 'set', 'add', 'run', 'make', 'find', 'list', 'create', 'read',
        'write', 'update', 'delete', 'manage', 'search', 'fetch', 'check', 'show'
      )
    ) sub
  ),
  top_chunks AS (
    SELECT
      c.mcp_id, c.chunk_type, c.content, c.tool_name,
      1 - (c.embedding <=> query_embedding) AS cosine_sim
    FROM mcp_chunks c
    WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT 200
  ),
  match_counts AS (
    SELECT mcp_id, count(*) AS num_matches FROM top_chunks GROUP BY mcp_id
  ),
  best_overall AS (
    SELECT DISTINCT ON (tc.mcp_id) tc.mcp_id, tc.cosine_sim AS best_sim
    FROM top_chunks tc ORDER BY tc.mcp_id, tc.cosine_sim DESC
  ),
  matched_mcps AS (
    SELECT mcp_id FROM best_overall
  ),
  best_tool AS (
    SELECT DISTINCT ON (c.mcp_id) c.mcp_id, c.tool_name, c.content
    FROM mcp_chunks c
    WHERE c.mcp_id IN (SELECT mcp_id FROM matched_mcps) AND c.chunk_type = 'tool'
    ORDER BY c.mcp_id, c.embedding <=> query_embedding
  ),
  keyword_scores AS (
    SELECT m.id AS mcp_id,
      CASE
        WHEN (SELECT num_words FROM query_words) > 0 THEN
          (SELECT count(*)::float FROM unnest((SELECT words FROM query_words)) w
           WHERE lower(m.name || ' ' || COALESCE(m.description, '')) LIKE '%' || w || '%'
          ) / (SELECT num_words FROM query_words)::float
        ELSE 0
      END AS keyword_ratio
    FROM mcps m WHERE m.id IN (SELECT mcp_id FROM matched_mcps)
  )
  SELECT
    m.id, m.name, m.description, m.slug,
    m.categories, m.tool_tags, m.source_url, m.repo_url, m.icon_url,
    m.verified, m.tools_count,
    m.quality_score::float, m.github_stars,
    m.use_count, m.pricing_type, m.pricing_note,
    COALESCE(bt.tool_name, 'mcp')::text AS chunk_type,
    COALESCE(bt.content, bo_chunk.content) AS chunk_content,
    bt.tool_name AS chunk_tool_name,
    (
      bo.best_sim * 0.55                                           -- 55% vector similarity
      + LEAST(COALESCE(mc.num_matches, 1)::float / 10.0, 0.1)     -- 10% multi-match boost
      + m.quality_score * 0.05                                     -- 5% quality score
      + COALESCE(ks.keyword_ratio, 0) * 0.30                       -- 30% keyword match ratio
    )::float AS similarity
  FROM best_overall bo
  JOIN mcps m ON m.id = bo.mcp_id
  LEFT JOIN match_counts mc ON mc.mcp_id = bo.mcp_id
  LEFT JOIN best_tool bt ON bt.mcp_id = bo.mcp_id
  LEFT JOIN keyword_scores ks ON ks.mcp_id = bo.mcp_id
  LEFT JOIN LATERAL (
    SELECT tc.content FROM top_chunks tc WHERE tc.mcp_id = bo.mcp_id ORDER BY tc.cosine_sim DESC LIMIT 1
  ) bo_chunk ON true
  WHERE m.active = true
    AND (filter_categories IS NULL OR m.categories && filter_categories)
    AND (filter_tool_tags IS NULL OR m.tool_tags && filter_tool_tags)
  ORDER BY similarity DESC
  LIMIT match_count;
$function$;
