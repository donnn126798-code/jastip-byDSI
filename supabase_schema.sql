-- =========================================================================
-- DATABASE SETUP & COMPLETE SEED SCRIPT FOR SUPABASE SQL EDITOR
-- =========================================================================
-- How to Use:
-- 1. Open your Supabase Dashboard (https://supabase.com).
-- 2. Select your Project -> Go to "SQL Editor" on the left sidebar.
-- 3. Click "New Query" -> Paste this entire script.
-- 4. Click "Run" (button in bottom-right/top-right).
--
-- This script is completely safe: it supports clean cold-starts, re-runs, and 
-- automatically disables Row Level Security (RLS) so that your deployed web application 
-- can immediately fetch the catalog, reviews, and tracking history with NO "blank screen" bugs!
-- =========================================================================

-- =========================================================================
-- [OPTIONAL] CLEAN RESET (RECOMENDED FOR FRESH DEPLOYMENTS TO MATCH AI STUDIO)
-- =========================================================================
-- If you want to wipe any old, corrupted tables and start fresh, remove the dashes (--)
-- from the lines below before running:

-- DROP TABLE IF EXISTS public.tracking_history CASCADE;
-- DROP TABLE IF EXISTS public.orders CASCADE;
-- DROP TABLE IF EXISTS public.products CASCADE;
-- DROP TABLE IF EXISTS public.admins CASCADE;
-- DROP TABLE IF EXISTS public.testimonials CASCADE;


-- =========================================================================
-- [PART A] CREATE SCHEMAS (IF NOT EXIST)
-- =========================================================================

-- 1. Create 'admins' table
CREATE TABLE IF NOT EXISTS public.admins (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

-- 2. Create 'products' table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price DOUBLE PRECISION NOT NULL,
  stock INTEGER NOT NULL,
  image TEXT NOT NULL
);

-- 3. Create 'orders' table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  product TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  notes TEXT,
  total_price DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payment_receipt TEXT,
  resi_number TEXT,
  admin_notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- 4. Create 'tracking_history' table
CREATE TABLE IF NOT EXISTS public.tracking_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. Create 'testimonials' table
CREATE TABLE IF NOT EXISTS public.testimonials (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  review TEXT NOT NULL,
  rating INTEGER NOT NULL,
  image TEXT NOT NULL
);


-- =========================================================================
-- [PART B] STICKY BUG FIX: DISABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
-- =========================================================================
-- By default, Supabase activates Row Level Security on newly created tables,
-- which silently blocks all SELECT and INSERT queries (returning empty arrays) 
-- unless policies are configured. Running the following lines disables RLS, 
-- ensuring full, seamless operations from your deployed full-stack web app.

ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials DISABLE ROW LEVEL SECURITY;


-- =========================================================================
-- [PART C] INITIAL DATA SEEDING (ON CONFLICT DO NOTHING TO PREVENT DUPLICATES)
-- =========================================================================

-- 1. Seed Main Administrators (Default Password: JastipDesiRistanti123)
-- Authenticated via Node pbkdf2 algorithm matching your AI Studio server config.
INSERT INTO public.admins (id, username, password_hash)
VALUES 
  ('admin-dony', 'Dony', 'dd52882c4592ed10076ba30adb706cdcb7a44603fb041a2375d6c4320f42052b278028b8b12e11bec7f5da740290aa35bd265589f3f96c022d40dc17e4d88ff5'),
  ('admin-desi', 'Desi', 'dd52882c4592ed10076ba30adb706cdcb7a44603fb041a2375d6c4320f42052b278028b8b12e11bec7f5da740290aa35bd265589f3f96c022d40dc17e4d88ff5'),
  ('admin-rori', 'Rori', 'dd52882c4592ed10076ba30adb706cdcb7a44603fb041a2375d6c4320f42052b278028b8b12e11bec7f5da740290aa35bd265589f3f96c022d40dc17e4d88ff5')
ON CONFLICT (username) DO NOTHING;

-- 2. Seed Premium Curated Product Catalog
INSERT INTO public.products (id, name, category, description, price, stock, image)
VALUES
  ('prod-001', 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink', 'Stanley', 'The iconic Stanley Quencher in a stunning, bright pastel matte pink finish. Your perfect companion for premium all-day hydration. Comes with the modern FlowState™ 3-way lid.', 1150000, 12, '/pastel_pink_tumbler.png'),
  ('prod-002', 'Stanley Quencher H2.0 (40oz) - Limited Edition Floral Watercolor', 'Limited Edition', 'An elegant limited-edition Stanley tumbler adorned with exquisite blush pink watercolor florals. Features an insulated double-wall vacuum stainless steel design. Intricately numbered.', 1450000, 4, '/floral_watercolor_tumbler.png'),
  ('prod-003', 'Sakura Blossom Curated Gift Set Box', 'Gift Set', 'A beautifully-curated luxury boutique gift box. Includes a pastel pink tumbler, custom satin sleeping mask, vanilla orchid lavender aromatherapy candle, and a gold-stamped greeting card.', 1950000, 6, '/sakura_gift_box.png'),
  ('prod-004', 'Handcrafted Blush Pink Leather Crossbody Strap', 'Tumbler Accessories', 'Carry your luxury tumbler in ultimate hands-free style. Lovingly hand-cut from premium full-grain Italian leather in a soft rose blush color, featuring beautiful, heavy brass clips.', 380000, 20, '/pink_leather_strap.png'),
  ('prod-005', 'Stanley IceFlow Flip Straw Tumbler (30oz) - Soft Rose', 'Stanley', 'Designed for on-the-go luxury life. This beautiful soft rose tumbler features leakproof flip straw technology and an integrated folding carrying handle.', 1050000, 8, '/soft_rose_tumbler.png'),
  ('prod-006', 'Rose Gold Metallic Stanley Accessory Charm Set', 'Tumbler Accessories', 'Dazzle up your Stanley Quencher. Premium metallic rose-gold personalized name tag and matching silicon straw cover shaped like a beautiful pink cherry blossom blossom.', 180005, 15, '/rose_gold_charms.png')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Authentic Luxury Testimonials
INSERT INTO public.testimonials (id, customer_name, review, rating, image)
VALUES
  ('testi-001', 'Clarissa Putri', 'Sangat puas dengan Jastip BYDSI! Barangnya dijamin 100% original, pengemasan tebal berlipat, dan seller ramah responsif memberi informasi transit.', 5, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'),
  ('testi-002', 'Anindya Kirana', 'My pink Stanley arrived in perfect condition! The packaging was so beautiful, like unboxing a luxury designer piece. Truly reliable personal shopping service. Custom notes were handwritten too!', 5, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'),
  ('testi-003', 'Sherly Septiani', 'Very fast and responsive! Best Jastip service I have ever tried. Always get the rarest limited edition Stanley colors that other shoppers cannot secure. 10/10 recommended for active tumbler lovers!', 5, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'),
  ('testi-004', 'Nadia Salsabila', 'The Sakura Blossom Gift Set was the absolute perfect bridal shower gift for my best friend. The satin-lined box was stunningly luxurious. Jastip byDSI provides exceptional high-society aesthetic!', 5, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Live Simulation Order
INSERT INTO public.orders (id, order_code, customer_name, whatsapp, product, quantity, notes, total_price, status, created_at, payment_receipt, resi_number, admin_notes, is_deleted)
VALUES
  ('order-initial-01', 'BYDSI-0001', 'Budi Santoso', '6281234567890', 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink', 1, 'Kado ultah adik, tolong dibungkus rapi aman!', 1150000, 'In Transit', '2026-06-20T12:00:00.000Z', NULL, 'RESI-DSI-8891', 'Sudah dibungkus kado premium pink', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Tracking History for the Order
INSERT INTO public.tracking_history (id, order_id, status, updated_at)
VALUES
  ('track-01', 'order-initial-01', 'Waiting for Payment', '2026-06-20T12:00:00.000Z'),
  ('track-02', 'order-initial-01', 'Paid', '2026-06-20T15:30:00.000Z'),
  ('track-03', 'order-initial-01', 'Ordered', '2026-06-21T09:00:00.000Z'),
  ('track-04', 'order-initial-01', 'In Transit', '2026-06-22T10:15:00.000Z')
ON CONFLICT (id) DO NOTHING;

