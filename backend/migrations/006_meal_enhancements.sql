-- ============================================================================
-- Migration 006: Meal Enhancements
-- ============================================================================
-- Description: Adds notes, photos, and custom user foods to meals
-- Dependencies: 005_meal_tracking.sql
-- ============================================================================

-- ============================================================================
-- Add enhanced fields to meals table
-- ============================================================================
-- Add notes column for user meal annotations
ALTER TABLE meals
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add photo_url column for meal photo storage
ALTER TABLE meals
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add edited_at column to track meal modifications
ALTER TABLE meals
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

COMMENT ON COLUMN meals.notes IS 'User notes about the meal';
COMMENT ON COLUMN meals.photo_url IS 'URL to meal photo in Supabase storage (meal-photos bucket)';
COMMENT ON COLUMN meals.edited_at IS 'Timestamp of last manual edit';

-- ============================================================================
-- Table: user_foods
-- ============================================================================
-- Stores custom and saved foods created by users
CREATE TABLE IF NOT EXISTS user_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  base_calories INTEGER NOT NULL,
  base_protein_g DECIMAL(5,1) NOT NULL,
  base_carbs_g DECIMAL(5,1) NOT NULL,
  base_fat_g DECIMAL(5,1) NOT NULL,
  base_fiber_g DECIMAL(5,1) DEFAULT 0,
  source TEXT DEFAULT 'manual', -- 'manual' or 'edited_db'
  original_food_name TEXT, -- if edited from DB food
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster user food queries
CREATE INDEX IF NOT EXISTS idx_user_foods_user_id ON user_foods(user_id);

-- Enable Row Level Security
ALTER TABLE user_foods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own foods" ON user_foods;
CREATE POLICY "Users can view their own foods"
  ON user_foods FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own foods" ON user_foods;
CREATE POLICY "Users can insert their own foods"
  ON user_foods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own foods" ON user_foods;
CREATE POLICY "Users can update their own foods"
  ON user_foods FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own foods" ON user_foods;
CREATE POLICY "Users can delete their own foods"
  ON user_foods FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE user_foods IS 'Custom and saved foods created by users';
COMMENT ON COLUMN user_foods.source IS 'Source of food: manual (user created) or edited_db (modified from USDA database)';
COMMENT ON COLUMN user_foods.original_food_name IS 'Original food name if this was edited from a database food';

-- ============================================================================
-- Link meal_components to user_foods
-- ============================================================================
-- Add custom_food_id to meal_components for linking to user_foods
ALTER TABLE meal_components
ADD COLUMN IF NOT EXISTS custom_food_id UUID REFERENCES user_foods(id);

COMMENT ON COLUMN meal_components.custom_food_id IS 'Optional reference to a custom user food';
