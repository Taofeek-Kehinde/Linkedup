-- Create storage bucket for user selfies and set public policies
-- This migration creates the bucket and configures it for public read access

-- Note: Storage bucket creation via SQL requires extensions
-- If using Supabase dashboard, create bucket named 'selfies' and set these policies manually

-- Create storage bucket using SQL (requires postgres admin permissions)
-- If the following fails, create the bucket manually in Supabase Dashboard > Storage > Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('selfies', 'selfies', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow anyone to view files in the selfies bucket (for displaying user selfies)
CREATE POLICY "Public can view selfies" ON storage.objects
FOR SELECT USING (bucket_id = 'selfies');

-- Policy: Allow authenticated users to upload their selfies
CREATE POLICY "Authenticated users can upload selfies" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'selfies' 
  AND auth.uid() IS NOT NULL
);

-- Policy: Allow users to update their own selfies (optional, for future use)
CREATE POLICY "Users can update own selfies" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'selfies' 
  AND auth.uid() IS NOT NULL
);