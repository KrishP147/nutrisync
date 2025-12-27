-- ============================================================================
-- Migration 005: Meal Tracking Foundation
-- ============================================================================
-- Description: Creates meals and meal_components tables for food logging
-- Dependencies: 001_setup_functions.sql
-- ============================================================================

-- ============================================================================
-- Table: meals
-- ============================================================================
-- Stores user meal entries with nutrition information
CREATE TABLE IF NOT EXISTS meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_calories INTEGER,
  total_protein_g DECIMAL(8,2),
  total_carbs_g DECIMAL(8,2),
  total_fat_g DECIMAL(8,2),
  total_fiber_g DECIMAL(8,2),
  is_ai_analyzed BOOLEAN DEFAULT FALSE,
  is_compound BOOLEAN DEFAULT FALSE,
  portion_size NUMERIC,
  portion_unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient user meal queries
CREATE INDEX IF NOT EXISTS idx_meals_user_consumed ON meals(user_id, consumed_at DESC);

-- Enable Row Level Security
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own meals" ON meals;
CREATE POLICY "Users can view own meals"
  ON meals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meals" ON meals;
CREATE POLICY "Users can insert own meals"
  ON meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meals" ON meals;
CREATE POLICY "Users can update own meals"
  ON meals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meals" ON meals;
CREATE POLICY "Users can delete own meals"
  ON meals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Table: meal_components
-- ============================================================================
-- Stores individual food items within compound meals
CREATE TABLE IF NOT EXISTS meal_components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    component_name TEXT NOT NULL,
    portion_size NUMERIC NOT NULL DEFAULT 100,
    portion_unit TEXT NOT NULL DEFAULT 'g',
    base_calories NUMERIC NOT NULL,
    base_protein_g NUMERIC NOT NULL,
    base_carbs_g NUMERIC NOT NULL,
    base_fat_g NUMERIC NOT NULL,
    base_fiber_g NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient meal component queries
CREATE INDEX IF NOT EXISTS idx_meal_components_meal_id ON meal_components(meal_id);

-- Enable Row Level Security
ALTER TABLE meal_components ENABLE ROW LEVEL SECURITY;

-- RLS Policies (check parent meal ownership)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own meal components" ON meal_components;
    CREATE POLICY "Users can view their own meal components"
        ON meal_components FOR SELECT
        USING (EXISTS (
            SELECT 1 FROM meals
            WHERE meals.id = meal_components.meal_id
            AND meals.user_id = auth.uid()
        ));

    DROP POLICY IF EXISTS "Users can insert their own meal components" ON meal_components;
    CREATE POLICY "Users can insert their own meal components"
        ON meal_components FOR INSERT
        WITH CHECK (EXISTS (
            SELECT 1 FROM meals
            WHERE meals.id = meal_components.meal_id
            AND meals.user_id = auth.uid()
        ));

    DROP POLICY IF EXISTS "Users can update their own meal components" ON meal_components;
    CREATE POLICY "Users can update their own meal components"
        ON meal_components FOR UPDATE
        USING (EXISTS (
            SELECT 1 FROM meals
            WHERE meals.id = meal_components.meal_id
            AND meals.user_id = auth.uid()
        ));

    DROP POLICY IF EXISTS "Users can delete their own meal components" ON meal_components;
    CREATE POLICY "Users can delete their own meal components"
        ON meal_components FOR DELETE
        USING (EXISTS (
            SELECT 1 FROM meals
            WHERE meals.id = meal_components.meal_id
            AND meals.user_id = auth.uid()
        ));
END $$;

-- ============================================================================
-- Function to update meal_components timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_meal_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS meal_components_updated_at ON meal_components;
CREATE TRIGGER meal_components_updated_at
    BEFORE UPDATE ON meal_components
    FOR EACH ROW
    EXECUTE FUNCTION update_meal_components_updated_at();
