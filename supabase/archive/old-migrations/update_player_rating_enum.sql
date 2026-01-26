-- Update player_rating enum to include plus/minus grades
-- Note: This requires dropping and recreating the enum, which may affect existing data
-- In production, you'd want to migrate existing data first

-- First, update any existing ratings to the new format
-- A -> A, B -> B, C -> C, D -> D (we'll keep them as base grades)

-- Drop the old enum (this will fail if there are dependencies, so we need to handle it carefully)
-- We'll create a new type and migrate
DO $$ 
BEGIN
    -- Create new enum type
    CREATE TYPE player_rating_new AS ENUM (
        'A+', 'A', 'A-',
        'B+', 'B', 'B-',
        'C+', 'C', 'C-',
        'D+', 'D', 'D-'
    );
    
    -- Add a temporary column with the new type
    ALTER TABLE player_ratings ADD COLUMN rating_new player_rating_new;
    
    -- Migrate data (convert old ratings to new format)
    UPDATE player_ratings SET rating_new = 
        CASE rating::text
            WHEN 'A' THEN 'A'::player_rating_new
            WHEN 'B' THEN 'B'::player_rating_new
            WHEN 'C' THEN 'C'::player_rating_new
            WHEN 'D' THEN 'D'::player_rating_new
            ELSE 'C'::player_rating_new
        END;
    
    -- Drop old column and rename new one
    ALTER TABLE player_ratings DROP COLUMN rating;
    ALTER TABLE player_ratings RENAME COLUMN rating_new TO rating;
    ALTER TABLE player_ratings ALTER COLUMN rating SET NOT NULL;
    
    -- Drop old enum and rename new one
    DROP TYPE player_rating;
    ALTER TYPE player_rating_new RENAME TO player_rating;
END $$;
