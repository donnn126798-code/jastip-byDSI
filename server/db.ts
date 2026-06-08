/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import crypto from 'crypto';

// Ensure /database directory exists
const dbDir = join(process.cwd(), 'database');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const dbPath = join(dbDir, 'jastip.db');
export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Password helper using pbkdf2 Node native crypto
export function hashPassword(password: string): string {
  const salt = 'jastip_bydsi_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Initialize tables
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

// Dynamic schema migrations for the 4 power features (Proof of Payment, Logistics tracking, Admin notes)
try {
  db.exec("ALTER TABLE orders ADD COLUMN payment_receipt TEXT;");
  console.log("Database schema migrated: added 'payment_receipt' to orders.");
} catch (_) {}

try {
  db.exec("ALTER TABLE orders ADD COLUMN resi_number TEXT;");
  console.log("Database schema migrated: added 'resi_number' to orders.");
} catch (_) {}

try {
  db.exec("ALTER TABLE orders ADD COLUMN admin_notes TEXT;");
  console.log("Database schema migrated: added 'admin_notes' to orders.");
} catch (_) {}

// Seed Admin
const targetAdmins = [
  { username: 'Dony', password: 'JastipDesiRistanti123' },
  { username: 'Desi', password: 'JastipDesiRistanti123' },
  { username: 'Rori', password: 'JastipDesiRistanti123' }
];

for (const ta of targetAdmins) {
  const existing = db.prepare('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)').get(ta.username) as any;
  const hash = hashPassword(ta.password);
  if (!existing) {
    db.prepare('INSERT INTO admins (id, username, password_hash) VALUES (?, ?, ?)').run(
      crypto.randomUUID(),
      ta.username,
      hash
    );
    console.log(`Seeded admin user: ${ta.username}`);
  } else {
    // If password hash changed or for consistency, update it
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
  console.log('Seeded initial premium products.');
} else {
  // Gracefully auto-update any outdated Unsplash links in the existing SQLite records
  try {
    db.prepare(`
      UPDATE products 
      SET image = '/pastel_pink_tumbler.png'
      WHERE id = 'prod-001'
    `).run();

    db.prepare(`
      UPDATE products 
      SET image = '/floral_watercolor_tumbler.png'
      WHERE id = 'prod-002'
    `).run();

    db.prepare(`
      UPDATE products 
      SET image = '/sakura_gift_box.png'
      WHERE id = 'prod-003'
    `).run();

    db.prepare(`
      UPDATE products 
      SET image = '/pink_leather_strap.png'
      WHERE id = 'prod-004'
    `).run();

    db.prepare(`
      UPDATE products 
      SET image = '/soft_rose_tumbler.png'
      WHERE id = 'prod-005'
    `).run();

    db.prepare(`
      UPDATE products 
      SET image = '/rose_gold_charms.png'
      WHERE id = 'prod-006'
    `).run();

    console.log('Successfully self-healed and updated product image URLs in database.');
  } catch (e) {
    console.warn('Soft notification: auto-updating product images encountered database state conflict:', e);
  }
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
  console.log('Seeded testimonials.');
}

// Seed a mock order with status for initial tracking validation
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
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  );

  // Add tracking history for this order
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
  console.log('Seeded validation order BYDSI-0001.');
}
