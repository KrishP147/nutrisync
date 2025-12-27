-- ============================================================================
-- Migration 007: Daily Achievements
-- ============================================================================
-- Description: Creates achievement tracking for nutrition goal streaks
-- Dependencies: 002_user_management.sql (requires user_goals with fiber column from 003)
-- ============================================================================

-- ============================================================================
-- Table: daily_achievements
-- ============================================================================
-- Stores a record for each day when a user meets their nutrition goals
-- Preserves the goals at the time of achievement so changing goals doesn't affect past streaks
CREATE TABLE IF NOT EXISTS daily_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_date DATE NOT NULL,

    -- Snapshot of goals at time of achievement
    calories_goal INTEGER NOT NULL,
    protein_goal INTEGER NOT NULL,
    carbs_goal INTEGER NOT NULL,
    fat_goal INTEGER NOT NULL,
    fiber_goal INTEGER NOT NULL,

    -- Actual values achieved that day
    calories_actual INTEGER NOT NULL,
    protein_actual DECIMAL(10, 1) NOT NULL,
    carbs_actual DECIMAL(10, 1) NOT NULL,
    fat_actual DECIMAL(10, 1) NOT NULL,
    fiber_actual DECIMAL(10, 1) NOT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one achievement record per user per day
    CONSTRAINT unique_user_achievement_date UNIQUE (user_id, achievement_date)
);

-- Index for faster queries (most recent achievements first)
CREATE INDEX IF NOT EXISTS idx_daily_achievements_user_date
ON daily_achievements(user_id, achievement_date DESC);

-- Enable Row Level Security
ALTER TABLE daily_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own achievements" ON daily_achievements;
CREATE POLICY "Users can view own achievements"
ON daily_achievements
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON daily_achievements;
CREATE POLICY "Users can insert own achievements"
ON daily_achievements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own achievements" ON daily_achievements;
CREATE POLICY "Users can update own achievements"
ON daily_achievements
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own achievements" ON daily_achievements;
CREATE POLICY "Users can delete own achievements"
ON daily_achievements
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- Function to update achievement timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_daily_achievements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_daily_achievements_updated_at_trigger ON daily_achievements;
CREATE TRIGGER update_daily_achievements_updated_at_trigger
BEFORE UPDATE ON daily_achievements
FOR EACH ROW
EXECUTE FUNCTION update_daily_achievements_updated_at();

-- Comments for documentation
COMMENT ON TABLE daily_achievements IS 'Stores daily nutrition goal achievements to preserve streak history independent of goal changes';
COMMENT ON COLUMN daily_achievements.achievement_date IS 'The date (local time) when goals were met';
COMMENT ON COLUMN daily_achievements.calories_goal IS 'Calorie goal at time of achievement';
COMMENT ON COLUMN daily_achievements.protein_goal IS 'Protein goal (g) at time of achievement';
COMMENT ON COLUMN daily_achievements.carbs_goal IS 'Carbs goal (g) at time of achievement';
COMMENT ON COLUMN daily_achievements.fat_goal IS 'Fat goal (g) at time of achievement';
COMMENT ON COLUMN daily_achievements.fiber_goal IS 'Fiber goal (g) at time of achievement';
COMMENT ON COLUMN daily_achievements.calories_actual IS 'Actual calories consumed that day';
COMMENT ON COLUMN daily_achievements.protein_actual IS 'Actual protein (g) consumed that day';
COMMENT ON COLUMN daily_achievements.carbs_actual IS 'Actual carbs (g) consumed that day';
COMMENT ON COLUMN daily_achievements.fat_actual IS 'Actual fat (g) consumed that day';
COMMENT ON COLUMN daily_achievements.fiber_actual IS 'Actual fiber (g) consumed that day';
