-- Add team logos to test teams
-- Run this in the Supabase SQL Editor

-- NOTE: These are placeholder logos using NHL team logos from a CDN
-- You can replace these with your own custom logos hosted on Supabase Storage
-- or any other image hosting service

-- Common NHL team logo CDN pattern
-- Using logos.fandom.com or other public sources for demonstration

-- Update teams with logos based on their names
-- Adjust team names to match your actual test teams

-- Maple Leafs style logo (blue/white)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/b/b6/Toronto_Maple_Leafs_2016_logo.svg'
WHERE LOWER(name) LIKE '%maple%' OR LOWER(name) LIKE '%leafs%' OR LOWER(short_name) = 'TOR';

-- Canadiens style logo (red/blue/white)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/6/69/Montreal_Canadiens.svg'
WHERE LOWER(name) LIKE '%canadiens%' OR LOWER(name) LIKE '%habs%' OR LOWER(short_name) = 'MTL';

-- Bruins style logo (black/gold)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/1/12/Boston_Bruins.svg'
WHERE LOWER(name) LIKE '%bruins%' OR LOWER(short_name) = 'BOS';

-- Senators style logo (red/black/gold)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/b/ba/Ottawa_Senators.svg'
WHERE LOWER(name) LIKE '%senators%' OR LOWER(name) LIKE '%sens%' OR LOWER(short_name) = 'OTT';

-- Canucks style logo (blue/green)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/3/3a/Vancouver_Canucks_logo.svg'
WHERE LOWER(name) LIKE '%canucks%' OR LOWER(short_name) = 'VAN';

-- Flames style logo (red/yellow)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/6/61/Calgary_Flames_logo.svg'
WHERE LOWER(name) LIKE '%flames%' OR LOWER(short_name) = 'CGY';

-- Oilers style logo (blue/orange)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/4/4d/Logo_Edmonton_Oilers.svg'
WHERE LOWER(name) LIKE '%oilers%' OR LOWER(short_name) = 'EDM';

-- Jets style logo (blue/white)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/9/93/Winnipeg_Jets_Logo_2011.svg'
WHERE LOWER(name) LIKE '%jets%' OR LOWER(short_name) = 'WPG';

-- Red Wings style logo (red/white)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/e/e0/Detroit_Red_Wings_logo.svg'
WHERE LOWER(name) LIKE '%red wings%' OR LOWER(name) LIKE '%wings%' OR LOWER(short_name) = 'DET';

-- Blackhawks style logo (red/black)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/2/29/Chicago_Blackhawks_logo.svg'
WHERE LOWER(name) LIKE '%blackhawks%' OR LOWER(name) LIKE '%hawks%' OR LOWER(short_name) = 'CHI';

-- Rangers style logo (blue/red/white)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/a/ae/New_York_Rangers.svg'
WHERE LOWER(name) LIKE '%rangers%' OR LOWER(short_name) = 'NYR';

-- Penguins style logo (black/gold)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/c/c0/Pittsburgh_Penguins_logo_%282016%29.svg'
WHERE LOWER(name) LIKE '%penguins%' OR LOWER(name) LIKE '%pens%' OR LOWER(short_name) = 'PIT';

-- Capitals style logo (red/white/blue)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/1/1f/Washington_Capitals.svg'
WHERE LOWER(name) LIKE '%capitals%' OR LOWER(name) LIKE '%caps%' OR LOWER(short_name) = 'WSH';

-- Lightning style logo (blue/white)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/2/2f/Tampa_Bay_Lightning_Logo_2011.svg'
WHERE LOWER(name) LIKE '%lightning%' OR LOWER(name) LIKE '%bolts%' OR LOWER(short_name) = 'TBL';

-- Panthers style logo (red/blue/gold)
UPDATE teams 
SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/4/43/Florida_Panthers_2016_logo.svg'
WHERE LOWER(name) LIKE '%panthers%' OR LOWER(short_name) = 'FLA';

-- For any remaining teams without logos, you can set a generic hockey logo
-- UPDATE teams 
-- SET logo_url = 'https://your-supabase-project.supabase.co/storage/v1/object/public/logos/default-hockey-logo.png'
-- WHERE logo_url IS NULL;

-- View teams after update
SELECT id, name, short_name, logo_url, primary_color 
FROM teams 
ORDER BY name;
