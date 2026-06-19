/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

// Load environmental configuration (.env file)
dotenv.config();

// Password helper using pbkdf2 Node native crypto
export function hashPassword(password: string): string {
  const salt = 'jastip_bydsi_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// 1. Initialize Supabase if credentials are provided in env (such as on Vercel)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

export const hasSupabaseConfig = !!(
  supabaseUrl && 
  supabaseKey && 
  supabaseUrl.startsWith('https://') && 
  !supabaseUrl.includes('xxxxxx') && 
  !supabaseUrl.includes('placeholder')
);
export let isSupabaseEnabled = false;
let supabase: any = null;

if (hasSupabaseConfig) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    isSupabaseEnabled = true;
    console.log('[DSI Database] Supabase Cloud Engine activated successfully! 🟢⚡');
  } catch (err: any) {
    console.error('[DSI Database] Failed to initialize Supabase Engine:', err.message || err);
    isSupabaseEnabled = false;
  }
}

// 2. Initialize Firebase Firestore from config file (primarily for AI Studio preview)
let db: any = null;
export let isFirebaseEnabled = false;

try {
  const configPath = join(process.cwd(), 'firebase-applet-config.json');
  if (existsSync(configPath)) {
    const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf8'));
    if (firebaseConfig && firebaseConfig.projectId && !firebaseConfig.projectId.includes('placeholder')) {
      const app = initializeApp(firebaseConfig);
      const dbId = firebaseConfig.firestoreDatabaseId;
      if (dbId && dbId !== '(default)' && dbId.trim() !== '') {
        db = initializeFirestore(app, {
          experimentalForceLongPolling: true,
          ignoreUndefinedProperties: true
        }, dbId);
      } else {
        db = initializeFirestore(app, {
          experimentalForceLongPolling: true,
          ignoreUndefinedProperties: true
        });
      }
      isFirebaseEnabled = true;
      console.log('[DSI Database] Firebase Firestore Cloud Live activated! ☁️🔥 Database ID:', dbId || '(default)');
    } else {
      console.warn('[DSI Database] Firebase config file exists but contains a placeholder or invalid project ID.');
    }
  } else {
    console.warn('[DSI Database] firebase-applet-config.json not found! Firestore fallback inactive.');
  }
} catch (err: any) {
  console.error('[DSI Database] Error initializing Firebase Firestore:', err.message || err);
}

// Variable to signal that we are running 100% on cloud databases (Supabase or Firebase) (now also backed by in-memory graceful fallback)
export const fallbackToSqlite = false;

// 3. Fallback In-Memory Datastore to prevent failure if cloud services are disconnected/offline
export const inMemoryAdmins: any[] = [
  { id: 'admin-dony', username: 'Dony', password_hash: hashPassword('JastipDesiRistanti123') },
  { id: 'admin-desi', username: 'Desi', password_hash: hashPassword('JastipDesiRistanti123') },
  { id: 'admin-rori', username: 'Rori', password_hash: hashPassword('JastipDesiRistanti123') }
];

export const inMemoryProducts: any[] = [
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
    price: 180005,
    stock: 15,
    image: '/rose_gold_charms.png'
  }
];

export const inMemoryOrders: any[] = [
  {
    id: 'order-initial-01',
    order_code: 'BYDSI-0001',
    customer_name: 'Budi Santoso',
    whatsapp: '6281234567890',
    product: 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink',
    quantity: 1,
    notes: 'Kado ultah adik, tolong dibungkus rapi aman!',
    total_price: 1150000,
    status: 'In Transit',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    is_deleted: false,
    payment_receipt: ''
  }
];

export const inMemoryTrackingHistory: any[] = [
  { id: 'track-01', order_id: 'order-initial-01', status: 'Waiting for Payment', updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'track-02', order_id: 'order-initial-01', status: 'Paid', updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000).toISOString() },
  { id: 'track-03', order_id: 'order-initial-01', status: 'Ordered', updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'track-04', order_id: 'order-initial-01', status: 'In Transit', updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }
];

export const inMemoryTestimonials: any[] = [
  {
    id: 'testi-001',
    customer_name: 'Clarissa Putri',
    rating: 5,
    comment: 'Sangat puas dengan Jastip BYDSI! Barangnya dijamin 100% original, pengemasan tebal berlipat, dan seller ramah responsif memberi informasi transit.',
    product_purchased: 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink',
    review: 'Sangat puas dengan Jastip BYDSI! Barangnya dijamin 100% original, pengemasan tebal berlipat, dan seller ramah responsif memberi informasi transit.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

/**
 * ADMINS ENDPOINTS
 */
export async function getAdminByUsername(username: string): Promise<any> {
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username);
      
      if (error) throw error;
      return (data && data.length > 0) ? data[0] : null;
    } catch (err) {
      console.error('[DSI Database - Supabase] getAdminByUsername error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const q = query(collection(db, 'admins'));
      const snap = await getDocs(q);
      let found: any = null;
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.username && d.username.toLowerCase() === username.toLowerCase()) {
          found = { id: docSnap.id, ...d };
        }
      });
      return found;
    } catch (err) {
      console.error('[DSI Database - Firebase] getAdminByUsername error:', err);
    }
  }

  return null;
}

/**
 * PRODUCTS ENDPOINTS
 */
export async function getProducts(category?: string, search?: string): Promise<any[]> {
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      let q = supabase.from('products').select('*');
      if (category && category !== 'All') {
        q = q.eq('category', category);
      }
      const { data, error } = await q;
      if (error) throw error;
      
      let products = data || [];
      if (search && search.trim() !== '') {
        const term = search.toLowerCase().trim();
        products = products.filter((p: any) => 
          (p.name && p.name.toLowerCase().includes(term)) ||
          (p.description && p.description.toLowerCase().includes(term))
        );
      }
      return products;
    } catch (err) {
      console.error('[DSI Database - Supabase] getProducts error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const ref = collection(db, 'products');
      let snap;
      if (category && category !== 'All') {
        const q = query(ref, where('category', '==', category));
        snap = await getDocs(q);
      } else {
        snap = await getDocs(ref);
      }

      const products: any[] = [];
      snap.forEach((docSnap) => {
        products.push({ id: docSnap.id, ...docSnap.data() });
      });

      if (search && search.trim() !== '') {
        const term = search.toLowerCase().trim();
        return products.filter(p => 
          (p.name && p.name.toLowerCase().includes(term)) ||
          (p.description && p.description.toLowerCase().includes(term))
        );
      }
      return products;
    } catch (err) {
      console.error('[DSI Database - Firebase] getProducts error:', err);
    }
  }

  // Graceful in-memory fallback
  let localProductsList = [...inMemoryProducts];
  if (category && category !== 'All') {
    localProductsList = localProductsList.filter(p => p.category === category);
  }
  if (search && search.trim() !== '') {
    const term = search.toLowerCase().trim();
    localProductsList = localProductsList.filter(p => 
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  }
  return localProductsList;
}

export async function getProductById(id: string): Promise<any> {
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      return (data && data.length > 0) ? data[0] : null;
    } catch (err) {
      console.error('[DSI Database - Supabase] getProductById error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
    } catch (err) {
      console.error('[DSI Database - Firebase] getProductById error:', err);
    }
  }

  return inMemoryProducts.find(p => p.id === id) || null;
}

export async function createProduct(p: { name: string; category: string; description: string; price: number; stock: number; image: string }): Promise<any> {
  const id = 'prod-' + Date.now();
  const pData = {
    id,
    name: p.name,
    category: p.category,
    description: p.description || '',
    price: Number(p.price),
    stock: Number(p.stock),
    image: p.image
  };

  // Sync to in-memory datastore
  inMemoryProducts.push(pData);

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('products').insert(pData);
      if (error) throw error;
      return pData;
    } catch (err) {
      console.error('[DSI Database - Supabase] createProduct error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'products', id);
      await setDoc(docRef, pData);
      return pData;
    } catch (err) {
      console.error('[DSI Database - Firebase] createProduct error:', err);
    }
  }

  return pData;
}

export async function updateProduct(id: string, p: { name: string; category: string; description: string; price: number; stock: number; image: string }): Promise<any> {
  const updateData = {
    name: p.name,
    category: p.category,
    description: p.description || '',
    price: Number(p.price),
    stock: Number(p.stock),
    image: p.image
  };

  // Sync to in-memory datastore
  const idx = inMemoryProducts.findIndex(item => item.id === id);
  if (idx !== -1) {
    inMemoryProducts[idx] = { ...inMemoryProducts[idx], ...updateData };
  }

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('products').update(updateData).eq('id', id);
      if (error) throw error;
      return { id, ...updateData };
    } catch (err) {
      console.error('[DSI Database - Supabase] updateProduct error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'products', id);
      await setDoc(docRef, updateData, { merge: true });
      return { id, ...updateData };
    } catch (err) {
      console.error('[DSI Database - Firebase] updateProduct error:', err);
    }
  }

  return { id, ...updateData };
}

export async function deleteProduct(id: string): Promise<boolean> {
  // Sync to in-memory datastore
  const idx = inMemoryProducts.findIndex(item => item.id === id);
  if (idx !== -1) {
    inMemoryProducts.splice(idx, 1);
  }

  let success = false;

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      success = true;
    } catch (err) {
      console.error('[DSI Database - Supabase] deleteProduct error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'products', id);
      await deleteDoc(docRef);
      success = true;
    } catch (err) {
      console.error('[DSI Database - Firebase] deleteProduct error:', err);
    }
  }

  return success || (!isSupabaseEnabled && !db);
}

/**
 * ORDERS & TRACKING ENDPOINTS
 */
export async function getLatestOrderCode(): Promise<string | null> {
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('order_code')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return (data && data.length > 0) ? data[0].order_code : null;
    } catch (err) {
      console.error('[DSI Database - Supabase] getLatestOrderCode error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const q = query(
        collection(db, 'orders'),
        orderBy('created_at', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        return docSnap.data().order_code || null;
      }
    } catch (err) {
      console.warn('[DSI Database] getLatestOrderCode ordering failed, fetching all to sort in-memory:', err);
      try {
        const snap = await getDocs(collection(db, 'orders'));
        if (snap.empty) return null;
        const orders: any[] = [];
        snap.forEach(docSnap => {
          orders.push(docSnap.data());
        });
        orders.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        return orders[0]?.order_code || null;
      } catch (innerErr) {
        console.error('[DSI Database] getLatestOrderCode fatal error:', innerErr);
      }
    }
  }

  // Graceful in-memory fallback
  if (inMemoryOrders.length > 0) {
    const list = [...inMemoryOrders];
    list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return list[0].order_code || null;
  }
  return null;
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
  const oData = { ...o, is_deleted: false, payment_receipt: '' };
  
  // Sync to in-memory datastore
  inMemoryOrders.push(oData);

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('orders').insert(oData);
      if (error) throw error;
      return oData;
    } catch (err) {
      console.error('[DSI Database - Supabase] createOrder error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'orders', o.id);
      await setDoc(docRef, oData);
      return oData;
    } catch (err) {
      console.error('[DSI Database - Firebase] createOrder error:', err);
    }
  }

  return oData;
}

export async function decrementProductStock(productId: string, quantity: number): Promise<void> {
  // Sync in-memory stock first
  const p = inMemoryProducts.find(item => item.id === productId);
  if (p) {
    p.stock = Math.max(0, (p.stock || 0) - Number(quantity));
  }

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId);
      
      if (error) throw error;
      if (data && data.length > 0) {
        const currentStock = data[0].stock || 0;
        const nextStock = Math.max(0, currentStock - Number(quantity));
        await supabase.from('products').update({ stock: nextStock }).eq('id', productId);
      }
      return;
    } catch (err) {
      console.error('[DSI Database - Supabase] decrementProductStock error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'products', productId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const pData = docSnap.data() as any;
        const currentStock = pData.stock || 0;
        const nextStock = Math.max(0, currentStock - Number(quantity));
        await setDoc(docRef, { stock: nextStock }, { merge: true });
      }
    } catch (err) {
      console.error('[DSI Database - Firebase] decrementProductStock error:', err);
    }
  }
}

export async function createTrackingHistory(h: { id: string; order_id: string; status: string; updated_at: string }): Promise<any> {
  // Sync to in-memory datastore
  inMemoryTrackingHistory.push(h);

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('tracking_history').insert(h);
      if (error) throw error;
      return h;
    } catch (err) {
      console.error('[DSI Database - Supabase] createTrackingHistory error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'tracking_history', h.id);
      await setDoc(docRef, h);
      return h;
    } catch (err) {
      console.error('[DSI Database - Firebase] createTrackingHistory error:', err);
    }
  }

  return h;
}

export async function getAllOrders(): Promise<any[]> {
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[DSI Database - Supabase] getAllOrders error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
      const snap = await getDocs(q);
      const orders: any[] = [];
      snap.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...docSnap.data() });
      });
      return orders;
    } catch (err) {
      console.warn('[DSI Database] getAllOrders sorting failed, falling back to memory sort:', err);
      try {
        const snap = await getDocs(collection(db, 'orders'));
        const orders: any[] = [];
        snap.forEach((docSnap) => {
          orders.push({ id: docSnap.id, ...docSnap.data() });
        });
        return orders.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      } catch (innerErr) {
        console.error('[DSI Database] getAllOrders fatal error:', innerErr);
      }
    }
  }

  // Graceful in-memory fallback
  const list = [...inMemoryOrders];
  list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return list;
}

export async function getOrderByCode(code: string): Promise<any> {
  const cleanCode = code.toUpperCase().trim();

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .ilike('order_code', cleanCode);
      
      if (error) throw error;
      const order = (data && data.length > 0) ? data[0] : null;
      if (order && order.is_deleted) return null;
      return order;
    } catch (err) {
      console.error('[DSI Database - Supabase] getOrderByCode error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const q = query(collection(db, 'orders'), where('order_code', '==', cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const order: any = { id: docSnap.id, ...docSnap.data() };
        if (order.is_deleted) return null;
        return order;
      }
      
      // Case insensitive fallback over all docs
      const allSnap = await getDocs(collection(db, 'orders'));
      let found: any = null;
      allSnap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        if (d.order_code && d.order_code.toUpperCase() === cleanCode) {
          if (!d.is_deleted) {
            found = { id: docSnap.id, ...d };
          }
        }
      });
      return found;
    } catch (err) {
      console.error('[DSI Database - Firebase] getOrderByCode error:', err);
    }
  }

  return inMemoryOrders.find(o => o.order_code.toUpperCase() === cleanCode && !o.is_deleted) || null;
}

export async function getOrderById(id: string): Promise<any> {
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id);
      if (error) throw error;
      return (data && data.length > 0) ? data[0] : null;
    } catch (err) {
      console.error('[DSI Database - Supabase] getOrderById error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'orders', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
    } catch (err) {
      console.error('[DSI Database - Firebase] getOrderById error:', err);
    }
  }

  return inMemoryOrders.find(o => o.id === id) || null;
}

export async function getTrackingHistoryForOrder(orderId: string): Promise<any[]> {
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('tracking_history')
        .select('*')
        .eq('order_id', orderId)
        .order('updated_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[DSI Database - Supabase] getTrackingHistoryForOrder error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const q = query(
        collection(db, 'tracking_history'), 
        where('order_id', '==', orderId), 
        orderBy('updated_at', 'asc')
      );
      const snap = await getDocs(q);
      const history: any[] = [];
      snap.forEach((docSnap) => {
        history.push({ id: docSnap.id, ...docSnap.data() });
      });
      return history;
    } catch (err) {
      console.warn('[DSI Database] getTrackingHistoryForOrder sorting failed, falling back to memory sort:', err);
      try {
        const q = query(collection(db, 'tracking_history'), where('order_id', '==', orderId));
        const snap = await getDocs(q);
        const history: any[] = [];
        snap.forEach((docSnap) => {
          history.push({ id: docSnap.id, ...docSnap.data() });
        });
        return history.sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || ''));
      } catch (innerErr) {
        console.error('[DSI Database] getTrackingHistoryForOrder fatal error:', innerErr);
      }
    }
  }

  return inMemoryTrackingHistory
    .filter(h => h.order_id === orderId)
    .sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || ''));
}

export async function updateOrderStatus(id: string, status: string, resi: string, notes: string): Promise<any> {
  const updateData = { status, resi_number: resi, admin_notes: notes };

  // Sync to in-memory datastore
  const oIdx = inMemoryOrders.findIndex(item => item.id === id);
  if (oIdx !== -1) {
    inMemoryOrders[oIdx] = { ...inMemoryOrders[oIdx], ...updateData };
  }

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('orders').update(updateData).eq('id', id);
      if (error) throw error;
      return { id, ...updateData };
    } catch (err) {
      console.error('[DSI Database - Supabase] updateOrderStatus error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'orders', id);
      await setDoc(docRef, updateData, { merge: true });
      return { id, ...updateData };
    } catch (err) {
      console.error('[DSI Database - Firebase] updateOrderStatus error:', err);
    }
  }

  return { id, ...updateData };
}

export async function countTrackingHistory(orderId: string, status: string): Promise<number> {
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { count, error } = await supabase
        .from('tracking_history')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)
        .eq('status', status);
      
      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error('[DSI Database - Supabase] countTrackingHistory error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const q = query(
        collection(db, 'tracking_history'),
        where('order_id', '==', orderId),
        where('status', '==', status)
      );
      const snap = await getDocs(q);
      return snap.size;
    } catch (err) {
      console.error('[DSI Database - Firebase] countTrackingHistory error:', err);
    }
  }

  return inMemoryTrackingHistory.filter(h => h.order_id === orderId && h.status === status).length;
}

export async function updateOrderPaymentReceipt(id: string, payment_receipt: string): Promise<any> {
  const updateData = { payment_receipt };

  // Sync to in-memory datastore
  const oIdx = inMemoryOrders.findIndex(item => item.id === id);
  if (oIdx !== -1) {
    inMemoryOrders[oIdx].payment_receipt = payment_receipt;
  }

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('orders').update(updateData).eq('id', id);
      if (error) throw error;
      return { id, ...updateData };
    } catch (err) {
      console.error('[DSI Database - Supabase] updateOrderPaymentReceipt error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'orders', id);
      await setDoc(docRef, updateData, { merge: true });
      return { id, ...updateData };
    } catch (err) {
      console.error('[DSI Database - Firebase] updateOrderPaymentReceipt error:', err);
    }
  }

  return { id, ...updateData };
}

export async function deleteOrder(id: string): Promise<boolean> {
  // Sync to in-memory datastore
  const oIdx = inMemoryOrders.findIndex(item => item.id === id);
  if (oIdx !== -1) {
    inMemoryOrders[oIdx].is_deleted = true;
  }

  let supabaseSuccess = false;
  let firebaseSuccess = false;

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('orders').update({ is_deleted: true }).eq('id', id);
      if (error) {
        console.warn('[DSI Database - Supabase] deleteOrder soft-delete warn:', error);
      } else {
        supabaseSuccess = true;
      }
    } catch (err) {
      console.error('[DSI Database - Supabase] deleteOrder soft-delete exception:', err);
    }
  }

  // Fallback / sync to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'orders', id);
      await setDoc(docRef, { is_deleted: true }, { merge: true });
      firebaseSuccess = true;
    } catch (err) {
      console.error('[DSI Database - Firebase] deleteOrder soft-delete error:', err);
    }
  }

  return supabaseSuccess || firebaseSuccess || (!isSupabaseEnabled && !db);
}

export async function restoreOrder(id: string): Promise<boolean> {
  // Sync to in-memory datastore
  const oIdx = inMemoryOrders.findIndex(item => item.id === id);
  if (oIdx !== -1) {
    inMemoryOrders[oIdx].is_deleted = false;
  }

  let supabaseSuccess = false;
  let firebaseSuccess = false;

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('orders').update({ is_deleted: false }).eq('id', id);
      if (error) {
        console.warn('[DSI Database - Supabase] restoreOrder warn:', error);
      } else {
        supabaseSuccess = true;
      }
    } catch (err) {
      console.error('[DSI Database - Supabase] restoreOrder error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'orders', id);
      await setDoc(docRef, { is_deleted: false }, { merge: true });
      firebaseSuccess = true;
    } catch (err) {
      console.error('[DSI Database - Firebase] restoreOrder error:', err);
    }
  }

  return supabaseSuccess || firebaseSuccess || (!isSupabaseEnabled && !db);
}

export async function deleteOrderPermanently(id: string): Promise<boolean> {
  // Sync to in-memory datastore
  const oIdx = inMemoryOrders.findIndex(item => item.id === id);
  if (oIdx !== -1) {
    inMemoryOrders.splice(oIdx, 1);
  }
  // also clean corresponding tracking history
  const cleanTrack = inMemoryTrackingHistory.filter(h => h.order_id !== id);
  inMemoryTrackingHistory.length = 0;
  inMemoryTrackingHistory.push(...cleanTrack);

  let supabaseSuccess = false;
  let firebaseSuccess = false;

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) {
        console.warn('[DSI Database - Supabase] deleteOrderPermanently warn:', error);
      } else {
        supabaseSuccess = true;
      }
    } catch (err) {
      console.error('[DSI Database - Supabase] deleteOrderPermanently exception:', err);
    }
  }

  // Fallback / sync to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'orders', id);
      await deleteDoc(docRef);
      firebaseSuccess = true;
    } catch (err) {
      console.error('[DSI Database - Firebase] deleteOrderPermanently error:', err);
    }
  }

  return supabaseSuccess || firebaseSuccess || (!isSupabaseEnabled && !db);
}

/**
 * TESTIMONIALS ENDPOINTS
 */
export async function getTestimonials(): Promise<any[]> {
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('customer_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[DSI Database - Supabase] getTestimonials error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const q = query(collection(db, 'testimonials'), orderBy('customer_name', 'asc'));
      const snap = await getDocs(q);
      const testimonials: any[] = [];
      snap.forEach((docSnap) => {
        testimonials.push({ id: docSnap.id, ...docSnap.data() });
      });
      return testimonials;
    } catch (err) {
      console.warn('[DSI Database] getTestimonials sorting failed, falling back to memory sort:', err);
      try {
        const snap = await getDocs(collection(db, 'testimonials'));
        const testimonials: any[] = [];
        snap.forEach((docSnap) => {
          testimonials.push({ id: docSnap.id, ...docSnap.data() });
        });
        return testimonials.sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''));
      } catch (innerErr) {
        console.error('[DSI Database] getTestimonials fatal error:', innerErr);
      }
    }
  }

  // Graceful in-memory fallback
  const list = [...inMemoryTestimonials];
  list.sort((a,b) => (a.customer_name || '').localeCompare(b.customer_name || ''));
  return list;
}

export async function createTestimonial(t: { customer_name: string; review: string; rating: number; image: string }): Promise<any> {
  const id = 'testi-' + Date.now();
  const tData = {
    id,
    customer_name: t.customer_name,
    review: t.review,
    rating: Number(t.rating),
    image: t.image
  };

  // Sync to in-memory datastore
  inMemoryTestimonials.push(tData);

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('testimonials').insert(tData);
      if (error) throw error;
      return tData;
    } catch (err) {
      console.error('[DSI Database - Supabase] createTestimonial error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'testimonials', id);
      await setDoc(docRef, tData);
      return tData;
    } catch (err) {
      console.error('[DSI Database - Firebase] createTestimonial error:', err);
    }
  }

  return tData;
}

export async function deleteTestimonial(id: string): Promise<boolean> {
  // Sync to in-memory datastore
  const index = inMemoryTestimonials.findIndex(item => item.id === id);
  if (index !== -1) {
    inMemoryTestimonials.splice(index, 1);
  }

  let success = false;

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) throw error;
      success = true;
    } catch (err) {
      console.error('[DSI Database - Supabase] deleteTestimonial error:', err);
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'testimonials', id);
      await deleteDoc(docRef);
      success = true;
    } catch (err) {
      console.error('[DSI Database - Firebase] deleteTestimonial error:', err);
    }
  }

  return success || (!isSupabaseEnabled && !db);
}

/**
 * HELPER TO CLEAR FIRESTORE COLLECTION
 */
async function clearFirestoreCollection(collectionName: string) {
  if (!db) return;
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    for (const docCheck of snap.docs) {
      await deleteDoc(doc(db, collectionName, docCheck.id));
    }
    console.log(`[DSI Database - Firebase] Cleared collection: ${collectionName}`);
  } catch (err: any) {
    console.error(`[DSI Database - Firebase] Error clearing collection ${collectionName}:`, err.message || err);
  }
}

/**
 * AUTO SEED DATABASE (Both Supabase and Firebase if empty or forced reset)
 */
export async function autoSeedSupabase(force = false) {
  console.log(`[DSI Database] Menguji apakah database cloud memerlukan seeding otomatis (force=${force})... 🚀`);
  
  // If we have configurations, temporarily assume enabled to perform active verification query
  if (hasSupabaseConfig && supabase) {
    isSupabaseEnabled = true;
  }

  // 1. Seed Supabase if active
  if (isSupabaseEnabled && supabase) {
    try {
      if (force) {
        console.log('[DSI Database] Force parameter detected! Clearing old data in Supabase tables...');
        await supabase.from('admins').delete().neq('id', 'non-existent');
        await supabase.from('products').delete().neq('id', 'non-existent');
        await supabase.from('orders').delete().neq('id', 'non-existent');
        await supabase.from('tracking_history').delete().neq('id', 'non-existent');
        await supabase.from('testimonials').delete().neq('id', 'non-existent');
      }

      console.log('[DSI Database] Mengecek status seed di Supabase...');
      
      // Seed admins if empty, checking if relation/table exists
      const { data: adminSnap, error: adminErr } = await supabase.from('admins').select('id').limit(1);
      if (adminErr) {
        console.warn('[DSI Database] Supabase connection failed or tables do not exist. Bypassing Supabase and falling back to Firebase Firestore:', adminErr.message || adminErr);
        isSupabaseEnabled = false;
        // Skip Supabase seeding since tables aren't deployed
      } else {
        const isFreshSupabase = (!adminSnap || adminSnap.length === 0) || force;
        
        if (isFreshSupabase) {
          console.log('[DSI Database] Basis data Supabase terdeteksi siap disingkronkan! Mengunggah data awal...');
          
          console.log('[DSI Database] Melakukan seed data admin awal di Supabase...');
          await supabase.from('admins').insert([
            { id: 'admin-dony', username: 'Dony', password_hash: hashPassword('JastipDesiRistanti123') },
            { id: 'admin-desi', username: 'Desi', password_hash: hashPassword('JastipDesiRistanti123') },
            { id: 'admin-rori', username: 'Rori', password_hash: hashPassword('JastipDesiRistanti123') }
          ]);

          // Seed products
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
              price: 180005,
              stock: 15,
              image: '/rose_gold_charms.png'
            }
          ];
          await supabase.from('products').insert(seedProducts);

          // Seed initial order for Budi Santoso
          console.log('[DSI Database] Melakukan seed data pesanan awal di Supabase...');
          const orderId = 'order-initial-01';
          const initialOrder = {
            id: orderId,
            order_code: 'BYDSI-0001',
            customer_name: 'Budi Santoso',
            whatsapp: '6281234567890',
            product: 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink',
            quantity: 1,
            notes: 'Kado ultah adik, tolong dibungkus rapi aman!',
            total_price: 1150000,
            status: 'In Transit',
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1050).toISOString()
          };
          await supabase.from('orders').insert(initialOrder);

          const trackingHistory = [
            { id: 'track-01', order_id: orderId, status: 'Waiting for Payment', updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1050).toISOString() },
            { id: 'track-02', order_id: orderId, status: 'Paid', updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1050 - 4 * 60 * 60 * 1050).toISOString() },
            { id: 'track-03', order_id: orderId, status: 'Ordered', updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1050).toISOString() },
            { id: 'track-04', order_id: orderId, status: 'In Transit', updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1050).toISOString() }
          ];
          await supabase.from('tracking_history').insert(trackingHistory);
          console.log('[DSI Database] Proses seeding Supabase selesai dengan aman! 🎆');
        } else {
          console.log('[DSI Database] Database Supabase sudah terinisialisasi sebelumnya. Melewati auto-seeding untuk mencegah reset data.');
        }
      }
    } catch (err: any) {
      console.error('[DSI Database] Seeding Supabase gagal:', err.message || err);
    }
  }

  // 2. Seed Firebase Firestore if active & empty
  if (db) {
    try {
      if (force) {
        console.log('[DSI Database] Force parameter detected! Clearing old data in Firebase Firestore collections...');
        await clearFirestoreCollection('admins');
        await clearFirestoreCollection('products');
        await clearFirestoreCollection('orders');
        await clearFirestoreCollection('tracking_history');
        await clearFirestoreCollection('testimonials');
      }

      // Seed admins if empty
      const adminRef = collection(db, 'admins');
      const adminSnap = await getDocs(query(adminRef, limit(1)));
      const isFreshFirebase = adminSnap.empty || force;

      if (isFreshFirebase) {
        console.log('[DSI Database] Basis data Firebase Firestore baru terdeteksi! Mengunggah data awal...');
        console.log('[DSI Database] Melakukan seed data admin awal di Firebase Firestore...');
        const targetAdmins = [
          { id: 'admin-dony', username: 'Dony', password_hash: hashPassword('JastipDesiRistanti123') },
          { id: 'admin-desi', username: 'Desi', password_hash: hashPassword('JastipDesiRistanti123') },
          { id: 'admin-rori', username: 'Rori', password_hash: hashPassword('JastipDesiRistanti123') }
        ];
        for (const a of targetAdmins) {
          await setDoc(doc(db, 'admins', a.id), a);
        }

        // Seed products
        console.log('[DSI Database] Melakukan seed data katalog jastip awal di Firebase Firestore...');
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
        for (const p of seedProducts) {
          await setDoc(doc(db, 'products', p.id), p);
        }

        // Seed initial order for Budi Santoso
        console.log('[DSI Database] Melakukan seed data pesanan awal di Firebase Firestore...');
        const orderId = 'order-initial-01';
        const initialOrder = {
          id: orderId,
          order_code: 'BYDSI-0001',
          customer_name: 'Budi Santoso',
          whatsapp: '6281234567890',
          product: 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink',
          quantity: 1,
          notes: 'Kado ultah adik, tolong dibungkus rapi aman!',
          total_price: 1150000,
          status: 'In Transit',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1050).toISOString()
        };
        await setDoc(doc(db, 'orders', orderId), initialOrder);

        const tracking_history = [
          { id: 'track-01', order_id: orderId, status: 'Waiting for Payment', updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1050).toISOString() },
          { id: 'track-02', order_id: orderId, status: 'Paid', updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1050 - 4 * 60 * 60 * 1050).toISOString() },
          { id: 'track-03', order_id: orderId, status: 'Ordered', updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1050).toISOString() },
          { id: 'track-04', order_id: orderId, status: 'In Transit', updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1050).toISOString() }
        ];
        for (const tracker of tracking_history) {
          await setDoc(doc(db, 'tracking_history', tracker.id), tracker);
        }

        // Seed initial testimonial
        console.log('[DSI Database] Melakukan seed data ulasan pelanggan awal di Firebase Firestore...');
        const initialTestimonial = {
          id: 'testi-001',
          customer_name: 'Clarissa Putri',
          comment: 'Sangat puas dengan Jastip BYDSI! Barangnya dijamin 100% original, pengemasan tebal berlipat, dan seller ramah responsif memberi informasi transit.',
          review: 'Sangat puas dengan Jastip BYDSI! Barangnya dijamin 100% original, pengemasan tebal berlipat, dan seller ramah responsif memberi informasi transit.',
          product_purchased: 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink',
          rating: 5,
          image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        };
        await setDoc(doc(db, 'testimonials', initialTestimonial.id), initialTestimonial);

        console.log('[DSI Database] Seeding database Firebase Firestore selesai!');
      } else {
        console.log('[DSI Database] Database Firebase Firestore sudah terinisialisasi sebelumnya. Melewati auto-seeding untuk mencegah reset data.');
      }
      
      console.log('[DSI Database] Proses pengecekan & seeding Firebase selesai! Cloud NoSQL database siap pakai penuh.');
    } catch (err: any) {
      console.error('[DSI Database] Seeding database Firebase Firestore gagal:', err.message || err);
    }
  }
}

/**
 * DATABASE DIAGNOSTICS FOR SUPPORT PANEL
 */
export async function getDbDiagnostics() {
  const result = {
    isSupabaseEnabled,
    isFirebaseEnabled,
    supabaseUrlConfigured: !!supabaseUrl,
    supabaseAnonKeyConfigured: !!supabaseKey,
    fallbackToSqlite: false,
    isVercel: !!process.env.VERCEL,
    supabaseConnectionStatus: 'connected_and_healthy',
    supabaseError: null as string | null,
    sqliteType: 'none',
    catalogCount: 0
  };

  const hasConfig = !!(supabaseUrl && supabaseKey && supabase);
  if (hasConfig) {
    try {
      const { data, error } = await supabase.from('products').select('id').limit(1);
      if (error) throw error;
      result.supabaseConnectionStatus = 'connected_and_healthy';
      result.catalogCount = data ? data.length : 0;
      isSupabaseEnabled = true; // Auto self-heal: enable Supabase if tables / connection restored!
    } catch (err: any) {
      result.supabaseConnectionStatus = 'error';
      result.supabaseError = err?.message || String(err);
      isSupabaseEnabled = false; // Auto fallback: disable if check query fails
    }
    // Update the returned state to reflect verified health
    result.isSupabaseEnabled = isSupabaseEnabled;
  } else if (db) {
    try {
      const snap = await getDocs(collection(db, 'products'));
      result.supabaseConnectionStatus = 'connected_and_healthy';
      result.catalogCount = snap.size;
    } catch (err: any) {
      result.supabaseConnectionStatus = 'error';
      result.supabaseError = err?.message || String(err);
    }
  } else {
    result.supabaseConnectionStatus = 'disabled';
  }

  return result;
}

// Automatically seed database on initialization if either database is active
autoSeedSupabase().catch((err) => {
  console.error('[DSI Database] Auto seed loading error:', err);
});
