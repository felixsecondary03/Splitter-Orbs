-- Initial schema for Splitter Orbs. Apply with: supabase db push

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- player_profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_profiles (
  -- Primary key matches auth.users.id
  id                          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  display_name                TEXT NOT NULL DEFAULT 'Player',
  language                    TEXT NOT NULL DEFAULT 'en',
  account_type                TEXT NOT NULL DEFAULT 'guest'
                                CHECK (account_type IN ('guest', 'email', 'google', 'apple')),
  avatar_color                TEXT NOT NULL DEFAULT '#4F8EF7',

  -- Progression
  trophies                    INTEGER NOT NULL DEFAULT 0,
  peak_trophies               INTEGER NOT NULL DEFAULT 0,
  wins                        INTEGER NOT NULL DEFAULT 0,
  losses                      INTEGER NOT NULL DEFAULT 0,
  win_streak                  INTEGER NOT NULL DEFAULT 0,

  -- Currency
  coins                       INTEGER NOT NULL DEFAULT 500,
  gems                        INTEGER NOT NULL DEFAULT 20,
  shards                      INTEGER NOT NULL DEFAULT 0,

  -- Card collections (JSONB maps: card_id -> { level, copies, boughtCopies })
  tower_cards                 JSONB NOT NULL DEFAULT '{}',
  ability_cards               JSONB NOT NULL DEFAULT '{}',
  orb_cards                   JSONB NOT NULL DEFAULT '{}',

  -- Loadout selections
  selected_towers             TEXT[] NOT NULL DEFAULT ARRAY['basic','machinegun','boomerang','bomb'],
  selected_abilities          TEXT[] NOT NULL DEFAULT ARRAY['zap','portal','repair'],
  selected_orbs               TEXT[] NOT NULL DEFAULT ARRAY['normal','fast','bomb','splitter','tank'],
  unlocked_towers             TEXT[] NOT NULL DEFAULT ARRAY['basic','machinegun'],
  unlocked_abilities          TEXT[] NOT NULL DEFAULT ARRAY['zap','portal'],

  -- Upgrade levels
  hand_level                  INTEGER NOT NULL DEFAULT 0,
  side_tower_level            INTEGER NOT NULL DEFAULT 0,

  -- Onboarding / legal
  onboarded                   BOOLEAN NOT NULL DEFAULT FALSE,
  tutorial_done               BOOLEAN NOT NULL DEFAULT FALSE,
  eula_accepted_version       TEXT,

  -- Settings
  sound_enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  sound_categories            JSONB NOT NULL DEFAULT '{"clicks":true,"explosions":true,"fanfare":true}',
  haptics_enabled             BOOLEAN NOT NULL DEFAULT TRUE,
  haptics_intensity           TEXT NOT NULL DEFAULT 'medium'
                                CHECK (haptics_intensity IN ('off','low','medium','high')),
  advanced_haptics_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  fit_to_screen               BOOLEAN NOT NULL DEFAULT TRUE,
  tower_menu_anytime          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Cosmetics
  owned_skins                 TEXT[] NOT NULL DEFAULT '{}',
  equipped_orb_pattern        TEXT NOT NULL DEFAULT 'default',
  equipped_station_skin       TEXT NOT NULL DEFAULT 'default',
  equipped_tower_skin         TEXT NOT NULL DEFAULT 'default',
  equipped_left_tower_skin    TEXT NOT NULL DEFAULT 'default',
  equipped_right_tower_skin   TEXT NOT NULL DEFAULT 'default',
  equipped_station_emblem     TEXT NOT NULL DEFAULT 'default',
  equipped_left_tower_emblem  TEXT NOT NULL DEFAULT 'default',
  equipped_right_tower_emblem TEXT NOT NULL DEFAULT 'default',

  -- Missions / crates
  daily_missions              JSONB NOT NULL DEFAULT '[]',
  last_free_crate             TIMESTAMPTZ,

  -- Moderation
  banned                      BOOLEAN NOT NULL DEFAULT FALSE,
  ban_until                   TIMESTAMPTZ,
  ban_reason                  TEXT,

  -- Timestamps
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- match_sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player1_id    UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  player2_id    UUID REFERENCES player_profiles(id) ON DELETE SET NULL,
  winner_id     UUID REFERENCES player_profiles(id) ON DELETE SET NULL,
  mode          TEXT NOT NULL DEFAULT 'casual'
                  CHECK (mode IN ('training', 'casual', 'ranked')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'finished', 'abandoned')),
  game_state    JSONB,
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- user_reports
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id   UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  reported_id   UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- friend_requests
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friend_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id     UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  receiver_id   UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sender_id, receiver_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- friendships  (denormalised bidirectional pairs, one row per direction)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
  user_id       UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  friend_id     UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE player_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships        ENABLE ROW LEVEL SECURITY;

-- player_profiles: users can read and update their own row only
CREATE POLICY "player_profiles_select_own"
  ON player_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "player_profiles_update_own"
  ON player_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No INSERT from client — handled by edge function trigger (post-auth-init)
-- No DELETE from client

-- match_sessions: users can read sessions they participated in
CREATE POLICY "match_sessions_select_participant"
  ON match_sessions FOR SELECT
  USING (player1_id = auth.uid() OR player2_id = auth.uid());

-- No direct INSERT/UPDATE/DELETE from client

-- user_reports: users can insert reports where they are the reporter
CREATE POLICY "user_reports_insert_own"
  ON user_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- No SELECT/UPDATE/DELETE from client

-- friend_requests: users can read/insert/delete where they are sender or receiver
CREATE POLICY "friend_requests_select_participant"
  ON friend_requests FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "friend_requests_insert_sender"
  ON friend_requests FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "friend_requests_delete_participant"
  ON friend_requests FOR DELETE
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- friendships: users can read/insert/delete their own friendship rows
CREATE POLICY "friendships_select_own"
  ON friendships FOR SELECT
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friendships_insert_own"
  ON friendships FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "friendships_delete_own"
  ON friendships FOR DELETE
  USING (user_id = auth.uid());
