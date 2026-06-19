-- SPLIT/MIGRATION & FULL SETUP SCRIPT UNTUK SUPABASE SQL EDITOR
-- -------------------------------------------------------------
-- Dashboard Supabase -> SQL Editor -> New Query -> Tempel dan Jalankan.
-- Script ini dirancang aman: mendukung upgrade tabel yang sudah ada 
-- sekaligus instalasi database baru dari nol tanpa kehilangan data lama Anda.

-- =============================================================
-- [BAGIAN A] SAFELY UPGRADE EXISTING TABLES (MIGRASI AMAN)
-- =============================================================

-- 1. Pastikan kolom is_deleted ada pada tabel orders (untuk fitur hapus/pindah ke Tong Sampah)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 2. Memperbarui Relasi agar mendukung Cascade Delete
-- Ini MENCEGAH error constraint database ketika Anda menghapus pesanan (menghapus otomatis riwayat pelacakan terkait)
DO $$
BEGIN
    -- Hapus constraint lama jika ada
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
          AND table_name = 'tracking_history' 
          AND constraint_name = 'tracking_history_order_id_fkey'
    ) THEN
        ALTER TABLE tracking_history DROP CONSTRAINT tracking_history_order_id_fkey;
    END IF;
    
    -- Tambah kembali dengan ON DELETE CASCADE
    ALTER TABLE tracking_history 
    ADD CONSTRAINT tracking_history_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Pemberitahuan: Pembaruan constraint dilewati atau sudah terkonfigurasi otomatis.';
END $$;


-- =============================================================
-- [BAGIAN B] COLD-START FULL SETUP (MEMBUAT TABEL JIKA BELUM ADA)
-- =============================================================

-- 1. Membuat Tabel 'admins'
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

-- 2. Membuat Tabel 'products'
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price DOUBLE PRECISION NOT NULL,
  stock INTEGER NOT NULL,
  image TEXT NOT NULL
);

-- 3. Membuat Tabel 'orders'
CREATE TABLE IF NOT EXISTS orders (
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

-- 4. Membuat Tabel 'tracking_history'
CREATE TABLE IF NOT EXISTS tracking_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. Membuat Tabel 'testimonials'
CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  review TEXT NOT NULL,
  rating INTEGER NOT NULL,
  image TEXT NOT NULL
);


-- =============================================================
-- [BAGIAN C] SEED / DATA AWAL DEFAULT (Mencegah Duplikasi)
-- =============================================================

-- 1. Memasukkan Pengguna Admin Utama (Password default: JastipDesiRistanti123)
-- Menggunakan PBKDF2 sha512 dengan salt "jastip_bydsi_salt_2026"
INSERT INTO admins (id, username, password_hash)
VALUES 
  ('admin-dony', 'Dony', 'd26914ed0dc3fc64b97f0a9f5cbea899f84852934eedee2bcab42fbe59c3cca036a44cbd935ee588b43bd7ba78f1f56860ac45330a133df1fe881c15f9ee29fe'),
  ('admin-desi', 'Desi', 'd26914ed0dc3fc64b97f0a9f5cbea899f84852934eedee2bcab42fbe59c3cca036a44cbd935ee588b43bd7ba78f1f56860ac45330a133df1fe881c15f9ee29fe'),
  ('admin-rori', 'Rori', 'd26914ed0dc3fc64b97f0a9f5cbea899f84852934eedee2bcab42fbe59c3cca036a44cbd935ee588b43bd7ba78f1f56860ac45330a133df1fe881c15f9ee29fe')
ON CONFLICT (username) DO NOTHING;

-- 2. Memasukkan Katalog Produk Utama
INSERT INTO products (id, name, category, description, price, stock, image)
VALUES
  ('prod-001', 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink', 'Stanley', 'The iconic Stanley Quencher in a stunning, bright pastel matte pink finish. Your perfect companion for premium all-day hydration. Comes with the modern FlowState™ 3-way lid.', 1150000, 12, '/pastel_pink_tumbler.png'),
  ('prod-002', 'Stanley Quencher H2.0 (40oz) - Limited Edition Floral Watercolor', 'Limited Edition', 'An elegant limited-edition Stanley tumbler adorned with exquisite blush pink watercolor florals. Features an insulated double-wall vacuum stainless steel design. Intricately numbered.', 1450000, 4, '/floral_watercolor_tumbler.png'),
  ('prod-003', 'Sakura Blossom Curated Gift Set Box', 'Gift Set', 'A beautifully-curated luxury boutique gift box. Includes a pastel pink tumbler, custom satin sleeping mask, vanilla orchid lavender aromatherapy candle, and a gold-stamped greeting card.', 1950000, 6, '/sakura_gift_box.png'),
  ('prod-004', 'Handcrafted Blush Pink Leather Crossbody Strap', 'Tumbler Accessories', 'Carry your luxury tumbler in ultimate hands-free style. Lovingly hand-cut from premium full-grain Italian leather in a soft rose blush color, featuring beautiful, heavy brass clips.', 380000, 20, '/pink_leather_strap.png'),
  ('prod-005', 'Stanley IceFlow Flip Straw Tumbler (30oz) - Soft Rose', 'Stanley', 'Designed for on-the-go luxury life. This beautiful soft rose tumbler features leakproof flip straw technology and an integrated folding carrying handle.', 1050000, 8, '/soft_rose_tumbler.png'),
  ('prod-006', 'Rose Gold Metallic Stanley Accessory Charm Set', 'Tumbler Accessories', 'Dazzle up your Stanley Quencher. Premium metallic rose-gold personalized name tag and matching silicon straw cover shaped like a beautiful pink cherry blossom blossom.', 180000, 15, '/rose_gold_charms.png')
ON CONFLICT (id) DO NOTHING;

-- 3. Memasukkan Testimonial Autentik Awal
INSERT INTO testimonials (id, customer_name, review, rating, image)
VALUES
  ('testi-001', 'Anindya Kirana', 'My pink Stanley arrived in perfect condition! The packaging was so beautiful, like unboxing a luxury designer piece. Truly reliable personal shopping service. Custom notes were handwritten too!', 5, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'),
  ('testi-002', 'Sherly Septiani', 'Very fast and responsive! Best Jastip service I have ever tried. Always get the rarest limited edition Stanley colors that other shoppers cannot secure. 10/10 recommended for active tumbler lovers!', 5, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'),
  ('testi-003', 'Nadia Salsabila', 'The Sakura Blossom Gift Set was the absolute perfect bridal shower gift for my best friend. The satin-lined box was stunningly luxurious. Jastip byDSI provides exceptional high-society aesthetic!', 5, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150')
ON CONFLICT (id) DO NOTHING;

-- 4. Memasukkan Pesanan Simulasi Berhasil
INSERT INTO orders (id, order_code, customer_name, whatsapp, product, quantity, notes, total_price, status, created_at, payment_receipt, resi_number, admin_notes, is_deleted)
VALUES
  ('order-initial-01', 'BYDSI-0001', 'Clarissa Putri', '6281234567890', 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink', 1, 'Please wrap safely as a birthday surprise!', 1150000, 'In Transit', '2026-06-11T12:00:00.000Z', NULL, 'RESI-DSI-8891', 'Sudah dibungkus kado premium pink', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 5. Memasukkan Riwayat Pelacakan Terkait
INSERT INTO tracking_history (id, order_id, status, updated_at)
VALUES
  ('track-01', 'order-initial-01', 'Waiting for Payment', '2026-06-11T12:00:00.000Z'),
  ('track-02', 'order-initial-01', 'Paid', '2026-06-11T15:30:00.000Z'),
  ('track-03', 'order-initial-01', 'Ordered', '2026-06-12T09:00:00.000Z'),
  ('track-04', 'order-initial-01', 'In Transit', '2026-06-13T10:15:00.000Z')
ON CONFLICT (id) DO NOTHING;
