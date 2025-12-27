-- ============================================================================
-- Migration 002: User Management Tables
-- ============================================================================
-- Description: Creates core user profile and goals tables
-- Dependencies: 001_setup_functions.sql
-- ============================================================================

-- ============================================================================
-- Table: user_profile
-- ============================================================================
-- Stores user demographic and physical information
CREATE TABLE IF NOT EXISTS user_profile (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  age INTEGER NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  height_cm NUMERIC(5,2) NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  activity_level VARCHAR(20) NOT NULL DEFAULT 'sedentary' CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
  goal_type VARCHAR(20) DEFAULT 'maintain' CHECK (goal_type IN ('lose', 'maintain', 'gain')),
  calorie_adjustment INTEGER CHECK (calorie_adjustment >= 100 AND calorie_adjustment <= 1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profile;
CREATE POLICY "Users can view their own profile"
  ON user_profile FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profile;
CREATE POLICY "Users can insert their own profile"
  ON user_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profile;
CREATE POLICY "Users can update their own profile"
  ON user_profile FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON user_profile;
CREATE POLICY "Users can delete their own profile"
  ON user_profile FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_user_profile_updated_at ON user_profile;
CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Table: user_goals
-- ============================================================================
-- Stores user nutrition goals
CREATE TABLE IF NOT EXISTS user_goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  calories INTEGER NOT NULL DEFAULT 2000,
  protein INTEGER NOT NULL DEFAULT 150,
  carbs INTEGER NOT NULL DEFAULT 250,
  fat INTEGER NOT NULL DEFAULT 67,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own goals" ON user_goals;
CREATE POLICY "Users can view their own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goals" ON user_goals;
CREATE POLICY "Users can insert their own goals"
  ON user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own goals" ON user_goals;
CREATE POLICY "Users can update their own goals"
  ON user_goals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own goals" ON user_goals;
CREATE POLICY "Users can delete their own goals"
  ON user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_user_goals_updated_at ON user_goals;
CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
