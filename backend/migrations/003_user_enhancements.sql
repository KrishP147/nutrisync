-- ============================================================================
-- Migration 003: User Profile Enhancements
-- ============================================================================
-- Description: Adds BMI tracking, fiber goals, and dietary restrictions
-- Dependencies: 002_user_management.sql
-- ============================================================================

-- ============================================================================
-- Add fiber goal to user_goals
-- ============================================================================
ALTER TABLE user_goals
ADD COLUMN IF NOT EXISTS fiber INTEGER NOT NULL DEFAULT 30;

COMMENT ON COLUMN user_goals.fiber IS 'Daily fiber goal in grams';

-- ============================================================================
-- Add BMI tracking to user_profile
-- ============================================================================
ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS bmi NUMERIC(4,1);

ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS bmi_category VARCHAR(20);

COMMENT ON COLUMN user_profile.bmi IS 'Body Mass Index calculated from height and weight';
COMMENT ON COLUMN user_profile.bmi_category IS 'BMI category: underweight, normal, overweight, obese';

-- ============================================================================
-- Add dietary restrictions to user_profile
-- ============================================================================
ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[] DEFAULT '{}';

COMMENT ON COLUMN user_profile.dietary_restrictions IS 'Array of dietary restriction keys: halal, kosher, vegetarian, vegan, gluten_free, dairy_free, nut_free, shellfish_free, low_sodium, low_carb';

-- Index for efficient querying of dietary restrictions
CREATE INDEX IF NOT EXISTS idx_user_profile_dietary_restrictions ON user_profile USING GIN (dietary_restrictions);
