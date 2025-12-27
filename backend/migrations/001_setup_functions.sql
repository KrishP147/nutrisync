-- ============================================================================
-- Migration 001: Setup Functions
-- ============================================================================
-- Description: Creates shared database functions used across multiple tables
-- Dependencies: None (must run first)
-- ============================================================================

-- Function to automatically update the updated_at timestamp on any table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at column to current UTC time when a row is modified';
