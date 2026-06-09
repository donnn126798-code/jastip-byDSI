/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Load environment variables (useful for local .env testing if needed)
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase if credentials are provided in env
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
export const isSupabaseEnabled = supabaseUrl !== '' && supabaseAnonKey !== '';

export const supabase = isSupabaseEnabled 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (isSupabaseEnabled) {
  console.log('[DSI Database] Supabase Cloud PostgreSQL mode activated! ☁️🚀');
} else {
  console.log('[DSI Database] SQLite Local mode activated! 💾');
}

// Ensure /database directory exists for local SQLite mode
const dbDir = join(process.cwd(), 'database');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const dbPath = join(dbDir, 'jastip.db');
export const db = new Database(dbPath);

// Enable foreign keys for SQLite
db.pragma('foreign_keys = ON');

// Password helper using pbkdf2 Node native crypto
export function hashPassword(password: string): string {
  const salt = 'jastip_bydsi_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Initialize SQLite tables if in local mode
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER NOT NULL,
    image TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_code TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    product TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    total_price REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tracking_history (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    review TEXT NOT NULL,
    rating INTEGER NOT NULL,
    image TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );
`);

// Dynamically run local sqlite migrations
try {
  db.exec("ALTER TABLE orders ADD COLUMN payment_receipt TEXT;");
} catch (_) {}

try {
  db.exec("ALTER TABLE orders ADD COLUMN resi_number TEXT;");
} catch (_) {}

try {
  db.exec("ALTER TABLE orders ADD COLUMN admin_notes TEXT;");
} catch (_) {}

/* ==========================================================================
   SEED DATA FOR LOCAL MODE (SQLite)
   ========================================================================== */

// Seed Admin
const targetAdmins = [
  { username: 'Dony', password: 'JastipDesiRistanti123' },
  { username: 'Desi', password: 'JastipDesiRistanti123' },
  { username: 'Rori', password: 'JastipDesiRistanti123' }
];

for (const ta of targetAdmins) {
  const hash = hashPassword(ta.password);
  const existing = db.prepare('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)').get(ta.username) as any;
  if (!existing) {
    db.prepare('INSERT INTO admins (id, username, password_hash) VALUES (?, ?, ?)').run(
      crypto.randomUUID(),
      ta.username,
      hash
    );
  } else {
    db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, existing.id);
  }
}

// Seed Products
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
if (productCount.count === 0) {
  const seedProducts = [
    {
      id: 'prod-001',
      name: 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink',
      category: 'Stanley',
      description: 'The iconic Stanley Quencher in a stunning, bright pastel matte pink finish. Your perfect companion for premium all-day hydration. Comes with the modern FlowState™ 3-way lid.',
      price: 1150000,
      stock: 12,
      image: '/pastel_pink_tumbler.png'
    },
    {
      id: 'prod-002',
      name: 'Stanley Quencher H2.0 (40oz) - Limited Edition Floral Watercolor',
      category: 'Limited Edition',
      description: 'An elegant limited-edition Stanley tumbler adorned with exquisite blush pink watercolor florals. Features an insulated double-wall vacuum stainless steel design. Intricately numbered.',
      price: 1450000,
      stock: 4,
      image: '/floral_watercolor_tumbler.png'
    },
    {
      id: 'prod-003',
      name: 'Sakura Blossom Curated Gift Set Box',
      category: 'Gift Set',
      description: 'A beautifully-curated luxury boutique gift box. Includes a pastel pink tumbler, custom satin sleeping mask, vanilla orchid lavender aromatherapy candle, and a gold-stamped greeting card.',
      price: 1950000,
      stock: 6,
      image: '/sakura_gift_box.png'
    },
    {
      id: 'prod-004',
      name: 'Handcrafted Blush Pink Leather Crossbody Strap',
      category: 'Tumbler Accessories',
      description: 'Carry your luxury tumbler in ultimate hands-free style. Lovingly hand-cut from premium full-grain Italian leather in a soft rose blush color, featuring beautiful, heavy brass clips.',
      price: 380000,
      stock: 20,
      image: '/pink_leather_strap.png'
    },
    {
      id: 'prod-005',
      name: 'Stanley IceFlow Flip Straw Tumbler (30oz) - Soft Rose',
      category: 'Stanley',
      description: 'Designed for on-the-go luxury life. This beautiful soft rose tumbler features leakproof flip straw technology and an integrated folding carrying handle.',
      price: 1050000,
      stock: 8,
      image: '/soft_rose_tumbler.png'
    },
    {
      id: 'prod-006',
      name: 'Rose Gold Metallic Stanley Accessory Charm Set',
      category: 'Tumbler Accessories',
      description: 'Dazzle up your Stanley Quencher. Premium metallic rose-gold personalized name tag and matching silicon straw cover shaped like a beautiful pink cherry blossom blossom.',
      price: 180000,
      stock: 15,
      image: '/rose_gold_charms.png'
    }
  ];

  const insertProduct = db.prepare('INSERT INTO products (id, name, category, description, price, stock, image) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const p of seedProducts) {
    insertProduct.run(p.id, p.name, p.category, p.description, p.price, p.stock, p.image);
  }
} else {
  // Gracefully auto-update product images in local sqlite
  try {
    db.prepare("UPDATE products SET image = '/pastel_pink_tumbler.png' WHERE id = 'prod-001'").run();
    db.prepare("UPDATE products SET image = '/floral_watercolor_tumbler.png' WHERE id = 'prod-002'").run();
    db.prepare("UPDATE products SET image = '/sakura_gift_box.png' WHERE id = 'prod-003'").run();
    db.prepare("UPDATE products SET image = '/pink_leather_strap.png' WHERE id = 'prod-004'").run();
    db.prepare("UPDATE products SET image = '/soft_rose_tumbler.png' WHERE id = 'prod-005'").run();
    db.prepare("UPDATE products SET image = '/rose_gold_charms.png' WHERE id = 'prod-006'").run();
  } catch (_) {}
}

// Seed Testimonials
const testimonialCount = db.prepare('SELECT COUNT(*) as count FROM testimonials').get() as { count: number };
if (testimonialCount.count === 0) {
  const seedTestimonials = [
    {
      id: 'testi-001',
      customer_name: 'Anindya Kirana',
      review: 'My pink Stanley arrived in perfect condition! The packaging was so beautiful, like unboxing a luxury designer piece. Truly reliable personal shopping service. Custom notes were handwritten too!',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
    },
    {
      id: 'testi-002',
      customer_name: 'Sherly Septiani',
      review: 'Very fast and responsive! Best Jastip service I have ever tried. Always get the rarest limited edition Stanley colors that other shoppers cannot secure. 10/10 recommended for active tumbler lovers!',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
    },
    {
      id: 'testi-003',
      customer_name: 'Nadia Salsabila',
      review: 'The Sakura Blossom Gift Set was the absolute perfect bridal shower gift for my best friend. The satin-lined box was stunningly luxurious. Jastip byDSI provides exceptional high-society aesthetic!',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'
    }
  ];

  const insertTestimonial = db.prepare('INSERT INTO testimonials (id, customer_name, review, rating, image) VALUES (?, ?, ?, ?, ?)');
  for (const t of seedTestimonials) {
    insertTestimonial.run(t.id, t.customer_name, t.review, t.rating, t.image);
  }
}

// Seed Mock Order
const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
if (orderCount.count === 0) {
  const orderId = 'order-initial-01';
  db.prepare(`
    INSERT INTO orders (id, order_code, customer_name, whatsapp, product, quantity, notes, total_price, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId,
    'BYDSI-0001',
    'Clarissa Putri',
    '6281234567890',
    'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink',
    1,
    'Please wrap safely as a birthday surprise!',
    1150000,
    'In Transit',
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  );

  const trackingHistories = [
    { id: 'track-01', status: 'Waiting for Payment', offset: 3 * 24 * 60 * 60 * 1000 },
    { id: 'track-02', status: 'Paid', offset: 2 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000 },
    { id: 'track-03', status: 'Ordered', offset: 2 * 24 * 60 * 60 * 1000 },
    { id: 'track-04', status: 'In Transit', offset: 1 * 24 * 60 * 60 * 1000 }
  ];

  const insertHistory = db.prepare('INSERT INTO tracking_history (id, order_id, status, updated_at) VALUES (?, ?, ?, ?)');
  for (const th of trackingHistories) {
    insertHistory.run(
      th.id,
      orderId,
      th.status,
      new Date(Date.now() - th.offset).toISOString()
    );
  }
}


/* ==========================================================================
   UNIFIED ASYNC DATABASE API (AUTOMATICALLY MULTIPLEXED)
   ========================================================================== */

// Helper to provide human-friendly Supabase setup instructions when tables are missing
function handleDbError(err: any): never {
  if (err && (err.code === 'PGRST125' || (err.message && err.message.includes('Invalid path specified')))) {
    throw new Error(
      'Tabel-tabel database belum dibuat di Supabase Anda! Silakan salin semua teks SQL dari file "supabase_schema.sql" di dashboard website Anda, tempel (paste) ke menu SQL Editor di dashboard Supabase Anda, lalu klik tombol "Run" berwarna hijau di kanan bawah untuk membuat tabel dan data awal admin.'
    );
  }
  throw err;
}

/**
 * ADMINS ENDPOINTS
 */
export async function getAdminByUsername(username: string): Promise<any> {
  try {
    if (isSupabaseEnabled && supabase) {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .ilike('username', username)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      return db.prepare('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)').get(username);
    }
  } catch (err: any) {
    handleDbError(err);
  }
}

/**
 * PRODUCTS ENDPOINTS
 */
export async function getProducts(category?: string, search?: string): Promise<any[]> {
  try {
    if (isSupabaseEnabled && supabase) {
      let q = supabase.from('products').select('*');
      if (category && category !== 'All') {
        q = q.eq('category', category);
      }
      if (search && search.trim() !== '') {
        q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    } else {
      let queryStr = 'SELECT * FROM products';
      const params: any[] = [];
      const conditions: string[] = [];

      if (category && category !== 'All') {
        conditions.push('category = ?');
        params.push(category);
      }

      if (search && search.trim() !== '') {
        conditions.push('(name LIKE ? OR description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      if (conditions.length > 0) {
        queryStr += ' WHERE ' + conditions.join(' AND ');
      }
      return db.prepare(queryStr).all(...params);
    }
  } catch (err: any) {
    handleDbError(err);
  }
}

export async function getProductById(id: string): Promise<any> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  }
}

export async function createProduct(p: { name: string; category: string; description: string; price: number; stock: number; image: string }): Promise<any> {
  const id = 'prod-' + Date.now();
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('products')
      .insert({ id, ...p })
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    db.prepare(`
      INSERT INTO products (id, name, category, description, price, stock, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, p.name, p.category, p.description || '', Number(p.price), Number(p.stock), p.image);
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  }
}

export async function updateProduct(id: string, p: { name: string; category: string; description: string; price: number; stock: number; image: string }): Promise<any> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('products')
      .update(p)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    db.prepare(`
      UPDATE products 
      SET name = ?, category = ?, description = ?, price = ?, stock = ?, image = ?
      WHERE id = ?
    `).run(p.name, p.category, p.description || '', Number(p.price), Number(p.stock), p.image, id);
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (isSupabaseEnabled && supabase) {
    const { error, status } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return status >= 200 && status < 300;
  } else {
    const expr = db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return expr.changes > 0;
  }
}

/**
 * ORDERS & TRACKING ENDPOINTS
 */
export async function getLatestOrderCode(): Promise<string | null> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('order_code')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? data.order_code : null;
  } else {
    const lastOrder = db.prepare("SELECT order_code FROM orders ORDER BY created_at DESC, id DESC LIMIT 1").get() as { order_code: string } | undefined;
    return lastOrder ? lastOrder.order_code : null;
  }
}

export async function createOrder(o: {
  id: string;
  order_code: string;
  customer_name: string;
  whatsapp: string;
  product: string;
  quantity: number;
  notes: string;
  total_price: number;
  status: string;
  created_at: string;
}): Promise<any> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .insert(o)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    db.prepare(`
      INSERT INTO orders (id, order_code, customer_name, whatsapp, product, quantity, notes, total_price, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(o.id, o.order_code, o.customer_name, o.whatsapp, o.product, o.quantity, o.notes, o.total_price, o.status, o.created_at);
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id);
  }
}

export async function decrementProductStock(productId: string, quantity: number): Promise<void> {
  if (isSupabaseEnabled && supabase) {
    // Standard RPC function stock decrement in Supabase, or clientside direct fetch/update for atomic robustness
    const { data: prod, error: getErr } = await supabase.from('products').select('stock').eq('id', productId).single();
    if (getErr) throw getErr;

    const nextStock = Math.max(0, (prod?.stock || 0) - Number(quantity));
    const { error: updErr } = await supabase.from('products').update({ stock: nextStock }).eq('id', productId);
    if (updErr) throw updErr;
  } else {
    db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(Number(quantity), productId);
  }
}

export async function createTrackingHistory(h: { id: string; order_id: string; status: string; updated_at: string }): Promise<any> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('tracking_history')
      .insert(h)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    db.prepare(`
      INSERT INTO tracking_history (id, order_id, status, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(h.id, h.order_id, h.status, h.updated_at);
    return h;
  }
}

export async function getAllOrders(): Promise<any[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } else {
    return db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  }
}

export async function getOrderByCode(code: string): Promise<any> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .ilike('order_code', code)
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    return db.prepare('SELECT * FROM orders WHERE UPPER(order_code) = ?').get(code.toUpperCase());
  }
}

export async function getOrderById(id: string): Promise<any> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  }
}

export async function getTrackingHistoryForOrder(orderId: string): Promise<any[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('tracking_history')
      .select('*')
      .eq('order_id', orderId)
      .order('updated_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } else {
    return db.prepare('SELECT * FROM tracking_history WHERE order_id = ? ORDER BY updated_at ASC').all(orderId);
  }
}

export async function updateOrderStatus(id: string, status: string, resi: string, notes: string): Promise<any> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, resi_number: resi, admin_notes: notes })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    db.prepare(`
      UPDATE orders 
      SET status = ?, resi_number = ?, admin_notes = ? 
      WHERE id = ?
    `).run(status, resi, notes, id);
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  }
}

export async function countTrackingHistory(orderId: string, status: string): Promise<number> {
  if (isSupabaseEnabled && supabase) {
    const { count, error } = await supabase
      .from('tracking_history')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('status', status);
    if (error) throw error;
    return count || 0;
  } else {
    const res = db.prepare('SELECT COUNT(*) as count FROM tracking_history WHERE order_id = ? AND status = ?').get(orderId, status) as any;
    return res ? res.count : 0;
  }
}

export async function updateOrderPaymentReceipt(id: string, payment_receipt: string): Promise<any> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .update({ payment_receipt })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    db.prepare('UPDATE orders SET payment_receipt = ? WHERE id = ?').run(payment_receipt, id);
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  }
}

/**
 * TESTIMONIALS ENDPOINTS
 */
export async function getTestimonials(): Promise<any[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('customer_name', { ascending: true }); // Standard sorting
    if (error) throw error;
    return data || [];
  } else {
    return db.prepare('SELECT * FROM testimonials').all();
  }
}

export async function createTestimonial(t: { customer_name: string; review: string; rating: number; image: string }): Promise<any> {
  const id = 'testi-' + Date.now();
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from('testimonials')
      .insert({ id, ...t })
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    db.prepare(`
      INSERT INTO testimonials (id, customer_name, review, rating, image)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, t.customer_name, t.review, Number(t.rating), t.image);
    return db.prepare('SELECT * FROM testimonials WHERE id = ?').get(id);
  }
}

export async function deleteTestimonial(id: string): Promise<boolean> {
  if (isSupabaseEnabled && supabase) {
    const { error, status } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return status >= 200 && status < 300;
  } else {
    const result = db.prepare('DELETE FROM testimonials WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
