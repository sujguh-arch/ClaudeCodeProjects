import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// If no Supabase configured, fall back to filesystem DB
export const useSupabase = !!supabaseUrl;

/*
SQL to create tables in Supabase:

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT,
  title TEXT NOT NULL,
  price DECIMAL,
  store TEXT,
  category TEXT DEFAULT 'dress',
  length_inches DECIMAL,
  images JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE renderings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  original_image TEXT,
  generated_image TEXT,
  status TEXT DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  reference_photo TEXT,
  replicate_token TEXT,
  model TEXT DEFAULT 'google/nano-banana-pro'
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE renderings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (personal app)
CREATE POLICY "allow_all" ON products FOR ALL USING (true);
CREATE POLICY "allow_all" ON renderings FOR ALL USING (true);
CREATE POLICY "allow_all" ON settings FOR ALL USING (true);

-- Storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('generated', 'generated', true);
CREATE POLICY "allow_all" ON storage.objects FOR ALL USING (bucket_id = 'generated');
*/
