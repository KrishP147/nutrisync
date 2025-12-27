# Database Migrations

Sequential migration files to set up the NutriSync database schema in Supabase.

## Migration Files

Run these migrations in order via Supabase SQL Editor:

| File | Description | Dependencies |
|------|-------------|--------------|
| `001_setup_functions.sql` | Shared database functions | None |
| `002_user_management.sql` | User profile and goals | 001 |
| `003_user_enhancements.sql` | BMI, fiber, dietary restrictions | 002 |
| `004_weight_tracking.sql` | Weight history with auto-logging | 003 |
| `005_meal_tracking.sql` | Meals and components | 001 |
| `006_meal_enhancements.sql` | Photos, notes, custom foods | 005 |
| `007_achievements.sql` | Goal achievement tracking | 002, 003 |
| `008_fasting.sql` | Fasting sessions and preferences | 002 |

## How to Run

1. Open [Supabase SQL Editor](https://app.supabase.com)
2. For each migration file (001 through 008):
   - Copy the entire file contents
   - Paste into SQL Editor
   - Click **Run**
   - Verify "Success" message before proceeding

## Schema Overview

### User Tables
- **user_profile**: Demographics, physical data, dietary restrictions
- **user_goals**: Nutrition goals and fasting preferences
- **weight_history**: Historical weight tracking (auto-populated via trigger)

### Meal Tables
- **meals**: Meal entries with nutrition totals
- **meal_components**: Individual foods in compound meals
- **user_foods**: Custom user-created foods

### Feature Tables
- **daily_achievements**: Goal achievement records for streak tracking
- **fasting_sessions**: Intermittent fasting logs

### Relationships
All tables reference `auth.users(id)` with `ON DELETE CASCADE`. Row Level Security (RLS) ensures users only access their own data.

## Storage

After migrations, create storage bucket:

**Bucket**: `meal-photos` (public)

**Required policies**: See [Database Setup Guide](../../docs/02-database-setup.md#configure-storage)

## Verification

After running all migrations:

1. Navigate to **Table Editor** in Supabase
2. Verify all 8 tables exist
3. Check **Authentication** > **Policies** - each table should have 4 RLS policies
4. Verify storage bucket `meal-photos` exists with 3 policies

## Rollback

To remove all tables:

```sql
DROP TABLE IF EXISTS fasting_sessions CASCADE;
DROP TABLE IF EXISTS daily_achievements CASCADE;
DROP TABLE IF EXISTS meal_components CASCADE;
DROP TABLE IF EXISTS user_foods CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS weight_history CASCADE;
DROP TABLE IF EXISTS user_goals CASCADE;
DROP TABLE IF EXISTS user_profile CASCADE;
```

Then drop functions:

```sql
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS log_weight_on_profile_update CASCADE;
DROP FUNCTION IF EXISTS update_meal_components_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_daily_achievements_updated_at CASCADE;
```

## Notes

- All migrations use `IF NOT EXISTS` and `DROP IF EXISTS` for idempotency
- Safe to re-run if needed
- Each migration includes complete RLS policies
- Triggers automatically update timestamps and log weight changes
