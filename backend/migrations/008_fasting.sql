-- ============================================================================
-- Migration 008: Intermittent Fasting Feature
-- ============================================================================
-- Description: Creates fasting session tracking and adds fasting preferences to user_goals
-- Dependencies: 002_user_management.sql
-- ============================================================================

-- ============================================================================
-- Table: fasting_sessions
-- ============================================================================
-- Tracks individual fasting sessions for users
CREATE TABLE IF NOT EXISTS fasting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  planned_duration_hours INTEGER NOT NULL,
  actual_duration_hours DECIMAL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  ai_recommended BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fasting_sessions_user_id ON fasting_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_fasting_sessions_status ON fasting_sessions(status);
CREATE INDEX IF NOT EXISTS idx_fasting_sessions_started_at ON fasting_sessions(started_at);

-- Enable Row Level Security
ALTER TABLE fasting_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own fasting sessions" ON fasting_sessions;
CREATE POLICY "Users can view own fasting sessions" ON fasting_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own fasting sessions" ON fasting_sessions;
CREATE POLICY "Users can insert own fasting sessions" ON fasting_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own fasting sessions" ON fasting_sessions;
CREATE POLICY "Users can update own fasting sessions" ON fasting_sessions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own fasting sessions" ON fasting_sessions;
CREATE POLICY "Users can delete own fasting sessions" ON fasting_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Add fasting preferences to user_goals
-- ============================================================================
ALTER TABLE user_goals
ADD COLUMN IF NOT EXISTS fasting_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fasting_schedule_type TEXT DEFAULT '16:8',
ADD COLUMN IF NOT EXISTS fasting_duration_hours INTEGER DEFAULT 16,
ADD COLUMN IF NOT EXISTS fasting_start_time TIME DEFAULT '20:00',
ADD COLUMN IF NOT EXISTS meal_reminder_enabled BOOLEAN DEFAULT true;

-- Comments for documentation
COMMENT ON TABLE fasting_sessions IS 'Tracks individual intermittent fasting sessions';
COMMENT ON COLUMN fasting_sessions.status IS 'Current status: active (ongoing), completed (finished), cancelled (stopped early)';
COMMENT ON COLUMN fasting_sessions.ai_recommended IS 'Whether this fasting session was recommended by AI';
COMMENT ON COLUMN fasting_sessions.planned_duration_hours IS 'Intended fasting duration in hours';
COMMENT ON COLUMN fasting_sessions.actual_duration_hours IS 'Actual fasting duration (calculated when ended)';

COMMENT ON COLUMN user_goals.fasting_enabled IS 'Whether user has fasting feature enabled';
COMMENT ON COLUMN user_goals.fasting_schedule_type IS 'Fasting schedule: 16:8, 18:6, 20:4, OMAD, etc.';
COMMENT ON COLUMN user_goals.fasting_duration_hours IS 'Default fasting duration in hours';
COMMENT ON COLUMN user_goals.fasting_start_time IS 'Preferred time to start fasting window';
COMMENT ON COLUMN user_goals.meal_reminder_enabled IS 'Whether to send meal reminders during eating window';
