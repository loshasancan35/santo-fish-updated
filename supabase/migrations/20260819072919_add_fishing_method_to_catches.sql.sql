-- Add fishing method column to catches table
ALTER TABLE catches ADD COLUMN IF NOT EXISTS fishing_method text;
