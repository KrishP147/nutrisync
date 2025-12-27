-- ============================================================================
-- Migration 004: Weight Tracking
-- ============================================================================
-- Description: Creates weight_history table with automatic logging from profile updates
-- Dependencies: 003_user_enhancements.sql (requires BMI columns in user_profile)
-- ============================================================================

-- ============================================================================
-- Table: weight_history
-- ============================================================================
-- Automatically stores weight history when users update their profile
-- No manual entry needed - populated from profile updates
CREATE TABLE IF NOT EXISTS weight_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recorded_at DATE DEFAULT CURRENT_DATE,
    weight_kg DECIMAL(5, 2) NOT NULL,
    bmi DECIMAL(4, 2),
    bmi_category TEXT,
    UNIQUE (user_id, recorded_at)  -- One entry per day per user
);

-- Enable Row Level Security
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own weight history"
ON weight_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight history"
ON weight_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weight history"
ON weight_history FOR UPDATE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_weight_history_user_date ON weight_history(user_id, recorded_at DESC);

-- ============================================================================
-- Function to automatically log weight when profile is updated
-- ============================================================================
CREATE OR REPLACE FUNCTION log_weight_on_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if weight has changed
    IF NEW.weight_kg IS NOT NULL AND (OLD.weight_kg IS NULL OR NEW.weight_kg != OLD.weight_kg) THEN
        INSERT INTO weight_history (user_id, weight_kg, bmi, bmi_category, recorded_at)
        VALUES (NEW.user_id, NEW.weight_kg, NEW.bmi, NEW.bmi_category, CURRENT_DATE)
        ON CONFLICT (user_id, recorded_at)
        DO UPDATE SET
            weight_kg = EXCLUDED.weight_kg,
            bmi = EXCLUDED.bmi,
            bmi_category = EXCLUDED.bmi_category;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_weight_on_profile_update() IS 'Automatically logs weight changes to weight_history when user_profile is updated';

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_weight ON user_profile;
CREATE TRIGGER trigger_log_weight
    AFTER INSERT OR UPDATE ON user_profile
    FOR EACH ROW
    EXECUTE FUNCTION log_weight_on_profile_update();

-- ============================================================================
-- Backfill existing weight data from user_profile
-- ============================================================================
-- This runs once to populate historical data from existing user profiles
INSERT INTO weight_history (user_id, weight_kg, bmi, bmi_category, recorded_at)
SELECT user_id, weight_kg, bmi, bmi_category, COALESCE(updated_at::date, CURRENT_DATE)
FROM user_profile
WHERE weight_kg IS NOT NULL
ON CONFLICT (user_id, recorded_at) DO NOTHING;
