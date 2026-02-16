#!/bin/bash

# Load service role key from .env.local
SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2)
SUPABASE_URL="https://ntplczcmhvfkijjxavdl.supabase.co"
BUCKET="gallery-images"

echo "Uploading WOHA high-res images to Supabase Storage..."

# Function to upload a file
upload_file() {
  local file_path=$1
  local storage_path=$2
  local content_type=$3

  echo "Uploading: $storage_path"
  curl -X POST \
    "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storage_path}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: ${content_type}" \
    -F "file=@${file_path}" \
    --silent --show-error
  echo ""
}

# Upload history images
echo -e "\n=== Uploading History Images ==="
for file in apps/league-sites/public/leagues/woha/history/*.jpg; do
  filename=$(basename "$file")
  upload_file "$file" "woha/history/$filename" "image/jpeg"
done

# Upload 2021-2022 team photos
echo -e "\n=== Uploading 2021-2022 Team Photos ==="
for file in apps/league-sites/public/leagues/woha/gallery/2021-2022/*.jpg; do
  filename=$(basename "$file")
  upload_file "$file" "woha/2021-2022/$filename" "image/jpeg"
done

# Upload father-son photos
echo -e "\n=== Uploading Father-Son Photos ==="
for file in apps/league-sites/public/leagues/woha/gallery/father-son/*.jpg; do
  filename=$(basename "$file")
  upload_file "$file" "woha/father-son/$filename" "image/jpeg"
done

for file in apps/league-sites/public/leagues/woha/gallery/father-son/*.png; do
  filename=$(basename "$file")
  upload_file "$file" "woha/father-son/$filename" "image/png"
done

# Upload 2023-2024 team photos
echo -e "\n=== Uploading 2023-2024 Team Photos ==="
for file in apps/league-sites/public/leagues/woha/gallery/2023-2024/*.jpg; do
  filename=$(basename "$file")
  upload_file "$file" "woha/2023-2024/$filename" "image/jpeg"
done

echo -e "\n✅ All uploads complete!"
