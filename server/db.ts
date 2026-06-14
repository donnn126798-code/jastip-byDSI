/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
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

// Password helper using pbkdf2 Node native crypto
export function hashPassword(password: string): string {
  const salt = 'jastip_bydsi_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export let db: any = null;
export let fallbackToSqlite = false;

// Safe in-memory database simulator for environments where better-sqlite3 cannot compile
class SqliteSimulator {
  data: {
    products: any[];
    orders: any[];
    tracking_history: any[];
    testimonials: any[];
    admins: any[];
  };

  constructor() {
    this.data = {
      products: [],
      orders: [],
      tracking_history: [],
      testimonials: [],
      admins: []
    };

    // Seed Admins
    this.data.admins = [
      { id: 'admin-dony', username: 'Dony', password_hash: hashPassword('JastipDesiRistanti123') },
      { id: 'admin-desi', username: 'Desi', password_hash: hashPassword('JastipDesiRistanti123') },
      { id: 'admin-rori', username: 'Rori', password_hash: hashPassword('JastipDesiRistanti123') }
    ];

    // Seed Products
    this.data.products = [
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

    // Seed Testimonials
    this.data.testimonials = [
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

    // Seed Order
    const orderId = 'order-initial-01';
    this.data.orders.push({
      id: orderId,
      order_code: 'BYDSI-0001',
      customer_name: 'Clarissa Putri',
      whatsapp: '6281234567890',
      product: 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink',
      quantity: 1,
      notes: 'Please wrap safely as a birthday surprise!',
      total_price: 1150000,
      status: 'In Transit',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    });

    const trackingHistories = [
      { id: 'track-01', status: 'Waiting for Payment', offset: 3 * 24 * 60 * 60 * 1000 },
      { id: 'track-02', status: 'Paid', offset: 2 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000 },
      { id: 'track-03', status: 'Ordered', offset: 2 * 24 * 60 * 60 * 1000 },
      { id: 'track-04', status: 'In Transit', offset: 1 * 24 * 60 * 60 * 1000 }
    ];

    for (const th of trackingHistories) {
      this.data.tracking_history.push({
        id: th.id,
        order_id: orderId,
        status: th.status,
        updated_at: new Date(Date.now() - th.offset).toISOString()
      });
    }
  }

  pragma(str: string) {}
  exec(str: string) {}

  prepare(sql: string) {
    const self = this;
    const lowerSql = sql.toLowerCase();

    return {
      get(...args: any[]) {
        if (lowerSql.includes('from admins')) {
          const username = args[0];
          return self.data.admins.find(a => a.username.toLowerCase() === username.toLowerCase());
        }
        if (lowerSql.includes('select count(*) as count from products')) {
          return { count: self.data.products.length };
        }
        if (lowerSql.includes('select count(*) as count from testimonials')) {
          return { count: self.data.testimonials.length };
        }
        if (lowerSql.includes('select count(*) as count from orders')) {
          return { count: self.data.orders.length };
        }
        if (lowerSql.includes('select * from products where id = ?')) {
          const id = args[0];
          return self.data.products.find(p => p.id === id);
        }
        if (lowerSql.includes('select order_code from orders order by')) {
          if (self.data.orders.length === 0) return undefined;
          const sorted = [...self.data.orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
          return { order_code: sorted[0].order_code };
        }
        if (lowerSql.includes('select * from orders where upper(order_code) = ?')) {
          const val = String(args[0]).toUpperCase();
          return self.data.orders.find(o => o.order_code.toUpperCase() === val);
        }
        if (lowerSql.includes('select * from orders where id = ?')) {
          const id = args[0];
          return self.data.orders.find(o => o.id === id);
        }
        if (lowerSql.includes('select count(*) as count from tracking_history where order_id = ? and status = ?')) {
          const orderId = args[0];
          const status = args[1];
          const matches = self.data.tracking_history.filter(t => t.order_id === orderId && t.status === status);
          return { count: matches.length };
        }
        return undefined;
      },

      all(...args: any[]) {
        if (lowerSql.includes('select * from products')) {
          let res = [...self.data.products];
          if (lowerSql.includes('where')) {
             if (args.length === 1) {
               const param = args[0];
               if (param.startsWith('%') && param.endsWith('%')) {
                 const term = param.replace(/%/g, '').toLowerCase();
                 res = res.filter(p => p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term));
               } else {
                 res = res.filter(p => p.category === param);
               }
             } else if (args.length === 3) {
               const cat = args[0];
               const term = String(args[1]).replace(/%/g, '').toLowerCase();
               res = res.filter(p => p.category === cat && (p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)));
             }
          }
          return res;
        }
        if (lowerSql.includes('select * from orders')) {
          return [...self.data.orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
        }
        if (lowerSql.includes('select * from tracking_history')) {
          const orderId = args[0];
          return self.data.tracking_history.filter(t => t.order_id === orderId).sort((a, b) => a.updated_at.localeCompare(b.updated_at));
        }
        if (lowerSql.includes('select * from testimonials')) {
          return [...self.data.testimonials].sort((a, b) => a.customer_name.localeCompare(b.customer_name));
        }
        return [];
      },

      run(...args: any[]) {
        if (lowerSql.includes('insert into admins')) {
          self.data.admins.push({ id: args[0], username: args[1], password_hash: args[2] });
        } else if (lowerSql.includes('update admins set password_hash = ? where id = ?')) {
          const user = self.data.admins.find(a => a.id === args[1]);
          if (user) user.password_hash = args[0];
        } else if (lowerSql.includes('insert into products')) {
          self.data.products.push({
            id: args[0], name: args[1], category: args[2], description: args[3],
            price: Number(args[4]), stock: Number(args[5]), image: args[6]
          });
        } else if (lowerSql.includes('update products set name = ?')) {
          const item = self.data.products.find(p => p.id === args[6]);
          if (item) {
            item.name = args[0];
            item.category = args[1];
            item.description = args[2];
            item.price = Number(args[3]);
            item.stock = Number(args[4]);
            item.image = args[5];
          }
        } else if (lowerSql.includes('delete from products where id = ?')) {
          self.data.products = self.data.products.filter(p => p.id !== args[0]);
        } else if (lowerSql.includes('insert into orders')) {
          self.data.orders.push({
            id: args[0], order_code: args[1], customer_name: args[2], whatsapp: args[3],
            product: args[4], quantity: Number(args[5]), notes: args[6], total_price: Number(args[7]),
            status: args[8], created_at: args[9]
          });
        } else if (lowerSql.includes('update products set stock = stock - ? where id = ?')) {
          const item = self.data.products.find(p => p.id === args[1]);
          if (item) item.stock = Math.max(0, item.stock - Number(args[0]));
        } else if (lowerSql.includes('insert into tracking_history')) {
          self.data.tracking_history.push({
            id: args[0], order_id: args[1], status: args[2], updated_at: args[3]
          });
        } else if (lowerSql.includes('update orders set status = ?')) {
          const o = self.data.orders.find(o => o.id === args[3]);
          if (o) {
            o.status = args[0];
            o.resi_number = args[1];
            o.admin_notes = args[2];
          }
        } else if (lowerSql.includes('update orders set payment_receipt = ? where id = ?')) {
          const o = self.data.orders.find(o => o.id === args[1]);
          if (o) o.payment_receipt = args[0];
        } else if (lowerSql.includes('insert into testimonials')) {
          self.data.testimonials.push({
            id: args[0], customer_name: args[1], review: args[2], rating: Number(args[3]), image: args[4]
          });
        } else if (lowerSql.includes('delete from testimonials where id = ?')) {
          self.data.testimonials = self.data.testimonials.filter(t => t.id !== args[0]);
        }
        return { changes: 1 };
      }
    };
  }
}


// Helpers to handle database fallback transparently when Supabase tables are missing or misconfigured
export function checkAndSetFallback(err: any): boolean {
  if (!isSupabaseEnabled) return false;
  
  if (!fallbackToSqlite) {
    console.warn('[DSI Database] WARNING: Supabase query or connection encountered an error. Automatically falling back to Simulator/SQLite database to ensure the app continues working flawlessly! ⚠️ Error details:', err?.message || err);
    fallbackToSqlite = true;
  }
  return true;
}

export async function dbCall<T>(supabaseFn: () => Promise<T>, sqliteFn: () => T): Promise<T> {
  if (isSupabaseEnabled && supabase && !fallbackToSqlite) {
    try {
      return await supabaseFn();
    } catch (err) {
      if (checkAndSetFallback(err)) {
        return sqliteFn();
      }
      throw err;
    }
  }
  return sqliteFn();
}

// Always initialize SQLite database as fallback or local storage option
try {
  if (process.env.VERCEL) {
    throw new Error('Running in Vercel serverless environment: Skipping native SQLITE loading to prevent runtime errors.');
  }
  const requireLocal = createRequire(import.meta.url);
  const sqliteModuleName = 'better-sqlite3';
  const Database = requireLocal(sqliteModuleName);

  // Ensure /database directory exists for local SQLite mode
  const dbDir = join(process.cwd(), 'database');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = join(dbDir, 'jastip.db');
  db = new Database(dbPath);

  // Enable foreign keys for SQLite
  db.pragma('foreign_keys = ON');

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
} catch (err: any) {
  console.warn('[DSI Database] Warn: Failed to load local sqlite database. Activating beautiful in-memory simulator as safe backup! Error:', err.message);
  db = new SqliteSimulator();
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
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('admins')
        .select('*')
        .ilike('username', username)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    () => {
      return db.prepare('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)').get(username);
    }
  );
}

/**
 * PRODUCTS ENDPOINTS
 */
export async function getProducts(category?: string, search?: string): Promise<any[]> {
  return dbCall(
    async () => {
      let q = supabase!.from('products').select('*');
      if (category && category !== 'All') {
        q = q.eq('category', category);
      }
      if (search && search.trim() !== '') {
        q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    () => {
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
  );
}

export async function getProductById(id: string): Promise<any> {
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    () => {
      return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    }
  );
}

export async function createProduct(p: { name: string; category: string; description: string; price: number; stock: number; image: string }): Promise<any> {
  const id = 'prod-' + Date.now();
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('products')
        .insert({ id, ...p })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    () => {
      db.prepare(`
        INSERT INTO products (id, name, category, description, price, stock, image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, p.name, p.category, p.description || '', Number(p.price), Number(p.stock), p.image);
      return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    }
  );
}

export async function updateProduct(id: string, p: { name: string; category: string; description: string; price: number; stock: number; image: string }): Promise<any> {
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('products')
        .update(p)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    () => {
      db.prepare(`
        UPDATE products 
        SET name = ?, category = ?, description = ?, price = ?, stock = ?, image = ?
        WHERE id = ?
      `).run(p.name, p.category, p.description || '', Number(p.price), Number(p.stock), p.image, id);
      return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    }
  );
}

export async function deleteProduct(id: string): Promise<boolean> {
  return dbCall(
    async () => {
      const { error, status } = await supabase!
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return status >= 200 && status < 300;
    },
    () => {
      const expr = db.prepare('DELETE FROM products WHERE id = ?').run(id);
      return expr.changes > 0;
    }
  );
}

/**
 * ORDERS & TRACKING ENDPOINTS
 */
export async function getLatestOrderCode(): Promise<string | null> {
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('orders')
        .select('order_code')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? data.order_code : null;
    },
    () => {
      const lastOrder = db.prepare("SELECT order_code FROM orders ORDER BY created_at DESC, id DESC LIMIT 1").get() as { order_code: string } | undefined;
      return lastOrder ? lastOrder.order_code : null;
    }
  );
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
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('orders')
        .insert(o)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    () => {
      db.prepare(`
        INSERT INTO orders (id, order_code, customer_name, whatsapp, product, quantity, notes, total_price, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(o.id, o.order_code, o.customer_name, o.whatsapp, o.product, o.quantity, o.notes, o.total_price, o.status, o.created_at);
      return db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id);
    }
  );
}

export async function decrementProductStock(productId: string, quantity: number): Promise<void> {
  return dbCall(
    async () => {
      const { data: prod, error: getErr } = await supabase!.from('products').select('stock').eq('id', productId).single();
      if (getErr) throw getErr;

      const nextStock = Math.max(0, (prod?.stock || 0) - Number(quantity));
      const { error: updErr } = await supabase!.from('products').update({ stock: nextStock }).eq('id', productId);
      if (updErr) throw updErr;
    },
    () => {
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(Number(quantity), productId);
    }
  );
}

export async function createTrackingHistory(h: { id: string; order_id: string; status: string; updated_at: string }): Promise<any> {
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('tracking_history')
        .insert(h)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    () => {
      db.prepare(`
        INSERT INTO tracking_history (id, order_id, status, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(h.id, h.order_id, h.status, h.updated_at);
      return h;
    }
  );
}

export async function getAllOrders(): Promise<any[]> {
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    () => {
      return db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    }
  );
}

export async function getOrderByCode(code: string): Promise<any> {
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('orders')
        .select('*')
        .ilike('order_code', code)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    () => {
      return db.prepare('SELECT * FROM orders WHERE UPPER(order_code) = ?').get(code.toUpperCase());
    }
  );
}

export async function getOrderById(id: string): Promise<any> {
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    () => {
      return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    }
  );
}

export async function getTrackingHistoryForOrder(orderId: string): Promise<any[]> {
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('tracking_history')
        .select('*')
        .eq('order_id', orderId)
        .order('updated_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    () => {
      return db.prepare('SELECT * FROM tracking_history WHERE order_id = ? ORDER BY updated_at ASC').all(orderId);
    }
  );
}

export async function updateOrderStatus(id: string, status: string, resi: string, notes: string): Promise<any> {
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('orders')
        .update({ status, resi_number: resi, admin_notes: notes })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    () => {
      db.prepare(`
        UPDATE orders 
        SET status = ?, resi_number = ?, admin_notes = ? 
        WHERE id = ?
      `).run(status, resi, notes, id);
      return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    }
  );
}

export async function countTrackingHistory(orderId: string, status: string): Promise<number> {
  return dbCall(
    async () => {
      const { count, error } = await supabase!
        .from('tracking_history')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)
        .eq('status', status);
      if (error) throw error;
      return count || 0;
    },
    () => {
      const res = db.prepare('SELECT COUNT(*) as count FROM tracking_history WHERE order_id = ? AND status = ?').get(orderId, status) as any;
      return res ? res.count : 0;
    }
  );
}

export async function updateOrderPaymentReceipt(id: string, payment_receipt: string): Promise<any> {
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('orders')
        .update({ payment_receipt })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    () => {
      db.prepare('UPDATE orders SET payment_receipt = ? WHERE id = ?').run(payment_receipt, id);
      return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    }
  );
}

/**
 * TESTIMONIALS ENDPOINTS
 */
export async function getTestimonials(): Promise<any[]> {
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('testimonials')
        .select('*')
        .order('customer_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    () => {
      return db.prepare('SELECT * FROM testimonials').all();
    }
  );
}

export async function createTestimonial(t: { customer_name: string; review: string; rating: number; image: string }): Promise<any> {
  const id = 'testi-' + Date.now();
  return dbCall(
    async () => {
      const { data, error } = await supabase!
        .from('testimonials')
        .insert({ id, ...t })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    () => {
      db.prepare(`
        INSERT INTO testimonials (id, customer_name, review, rating, image)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, t.customer_name, t.review, Number(t.rating), t.image);
      return db.prepare('SELECT * FROM testimonials WHERE id = ?').get(id);
    }
  );
}

export async function deleteTestimonial(id: string): Promise<boolean> {
  return dbCall(
    async () => {
      const { error, status } = await supabase!
        .from('testimonials')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return status >= 200 && status < 300;
    },
    () => {
      const result = db.prepare('DELETE FROM testimonials WHERE id = ?').run(id);
      return result.changes > 0;
    }
  );
}

/**
 * AUTO SEED SUPABASE IF EMPTY
 */
export async function autoSeedSupabase() {
  if (!isSupabaseEnabled || !supabase) return;
  
  console.log('[DSI Database] Menguji apakah database Supabase memerlukan seeding otomatis... 🚀');
  try {
    // 1. Check if admins has tables and needs seeding
    const { data: existingAdmins, error: adminErr } = await supabase
      .from('admins')
      .select('username')
      .limit(1);
      
    if (adminErr) {
       console.warn('[DSI Database] Supabase admins table check error (tabel mungkin belum dibuat):', adminErr.message);
       // We do not return immediately, we can try other tables too
    } else if (!existingAdmins || existingAdmins.length === 0) {
      console.log('[DSI Database] Melakukan seed data admin awal di Supabase...');
      const targetAdmins = [
        { id: 'admin-dony', username: 'Dony', password_hash: 'd26914ed0dc3fc64b97f0a9f5cbea899f84852934eedee2bcab42fbe59c3cca036a44cbd935ee588b43bd7ba78f1f56860ac45330a133df1fe881c15f9ee29fe' },
        { id: 'admin-desi', username: 'Desi', password_hash: 'd26914ed0dc3fc64b97f0a9f5cbea899f84852934eedee2bcab42fbe59c3cca036a44cbd935ee588b43bd7ba78f1f56860ac45330a133df1fe881c15f9ee29fe' },
        { id: 'admin-rori', username: 'Rori', password_hash: 'd26914ed0dc3fc64b97f0a9f5cbea899f84852934eedee2bcab42fbe59c3cca036a44cbd935ee588b43bd7ba78f1f56860ac45330a133df1fe881c15f9ee29fe' }
      ];
      await supabase.from('admins').insert(targetAdmins);
    }

    // 2. Check & Seed Products
    const { data: existingProducts, error: prodErr } = await supabase
      .from('products')
      .select('id')
      .limit(1);
      
    if (prodErr) {
      console.warn('[DSI Database] Supabase products table check error:', prodErr.message);
    } else if (!existingProducts || existingProducts.length === 0) {
      console.log('[DSI Database] Melakukan seed data katalog jastip awal di Supabase...');
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
      await supabase.from('products').insert(seedProducts);
    }

    // 3. Check & Seed Testimonials
    const { data: existingTestimonials, error: testiErr } = await supabase
      .from('testimonials')
      .select('id')
      .limit(1);

    if (testiErr) {
      console.warn('[DSI Database] Supabase testimonials table check error:', testiErr.message);
    } else if (!existingTestimonials || existingTestimonials.length === 0) {
      console.log('[DSI Database] Melakukan seed data testimoni awal di Supabase...');
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
      await supabase.from('testimonials').insert(seedTestimonials);
    }
    
    console.log('[DSI Database] Proses pengecekan & seeding Supabase selesai dengan aman! Cloud database siap pakai.');
  } catch (err: any) {
    console.warn('[DSI Database] Seeding database Supabase gagal/terlewati:', err.message || err);
  }
}

/**
 * DATABASE DIAGNOSTICS FOR SUPPORT PANEL
 */
export async function getDbDiagnostics() {
  const result = {
    isSupabaseEnabled,
    supabaseUrlConfigured: !!supabaseUrl,
    supabaseAnonKeyConfigured: !!supabaseAnonKey,
    fallbackToSqlite,
    isVercel: !!process.env.VERCEL,
    supabaseConnectionStatus: 'untested',
    supabaseError: null as string | null,
    sqliteType: db ? db.constructor.name : 'none',
    catalogCount: 0
  };

  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase.from('products').select('id');
      if (error) {
        result.supabaseConnectionStatus = 'error';
        result.supabaseError = error.message;
      } else {
        result.supabaseConnectionStatus = 'connected_and_healthy';
        result.catalogCount = data ? data.length : 0;
      }
    } catch (err: any) {
      result.supabaseConnectionStatus = 'error_exception';
      result.supabaseError = err?.message || String(err);
    }
  } else {
    result.supabaseConnectionStatus = 'disabled';
  }

  return result;
}

// Jalankan auto-seed secara asinkron di background saat modul ini dimuat jika Supabase diaktifkan
if (isSupabaseEnabled && supabase) {
  autoSeedSupabase().catch((err) => {
    console.error('[DSI Database] Auto seed fatal error:', err);
  });
}

