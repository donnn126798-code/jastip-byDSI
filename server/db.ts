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

export const hasSupabaseConfig = !!(supabaseUrl && supabaseKey);
export let isSupabaseEnabled = false;
let supabase: any = null;

if (supabaseUrl && supabaseKey) {
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
  }
}

// 2. Initialize Firebase Firestore from config file (primarily for AI Studio preview)
let db: any = null;
let isFirebaseEnabled = false;

try {
  const configPath = join(process.cwd(), 'firebase-applet-config.json');
  if (existsSync(configPath)) {
    const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf8'));
    const app = initializeApp(firebaseConfig);
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    isFirebaseEnabled = true;
    console.log('[DSI Database] Firebase Firestore Cloud Live activated! ☁️🔥');
  } else {
    console.warn('[DSI Database] firebase-applet-config.json not found! Firestore fallback inactive.');
  }
} catch (err: any) {
  console.error('[DSI Database] Error initializing Firebase Firestore:', err.message || err);
}

// Variable to signal that we are running 100% on cloud databases (Supabase or Firebase)
export const fallbackToSqlite = false;

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

  return [];
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

  return null;
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

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('products').insert(pData);
      if (error) throw error;
      return pData;
    } catch (err) {
      console.error('[DSI Database - Supabase] createProduct error:', err);
      throw err;
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
      throw err;
    }
  }

  throw new Error('No live cloud database client is configured to save data');
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

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('products').update(updateData).eq('id', id);
      if (error) throw error;
      return { id, ...updateData };
    } catch (err) {
      console.error('[DSI Database - Supabase] updateProduct error:', err);
      throw err;
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
      throw err;
    }
  }

  throw new Error('No live cloud database client is configured to update data');
}

export async function deleteProduct(id: string): Promise<boolean> {
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[DSI Database - Supabase] deleteProduct error:', err);
      return false;
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'products', id);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error('[DSI Database - Firebase] deleteProduct error:', err);
      return false;
    }
  }

  return false;
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
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('orders').insert(o);
      if (error) throw error;
      return o;
    } catch (err) {
      console.error('[DSI Database - Supabase] createOrder error:', err);
      throw err;
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'orders', o.id);
      await setDoc(docRef, o);
      return o;
    } catch (err) {
      console.error('[DSI Database - Firebase] createOrder error:', err);
      throw err;
    }
  }

  throw new Error('No live cloud database client is configured to save order');
}

export async function decrementProductStock(productId: string, quantity: number): Promise<void> {
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
        const p = docSnap.data() as any;
        const currentStock = p.stock || 0;
        const nextStock = Math.max(0, currentStock - Number(quantity));
        await setDoc(docRef, { stock: nextStock }, { merge: true });
      }
    } catch (err) {
      console.error('[DSI Database - Firebase] decrementProductStock error:', err);
    }
  }
}

export async function createTrackingHistory(h: { id: string; order_id: string; status: string; updated_at: string }): Promise<any> {
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('tracking_history').insert(h);
      if (error) throw error;
      return h;
    } catch (err) {
      console.error('[DSI Database - Supabase] createTrackingHistory error:', err);
      throw err;
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
      throw err;
    }
  }

  throw new Error('No live cloud database client is configured to save tracking history');
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

  return [];
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
      return (data && data.length > 0) ? data[0] : null;
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
        return { id: docSnap.id, ...docSnap.data() };
      }
      
      // In-memory case insensitive backup
      const allSnap = await getDocs(collection(db, 'orders'));
      let found: any = null;
      allSnap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        if (d.order_code && d.order_code.toUpperCase() === cleanCode) {
          found = { id: docSnap.id, ...d };
        }
      });
      return found;
    } catch (err) {
      console.error('[DSI Database - Firebase] getOrderByCode error:', err);
    }
  }

  return null;
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

  return null;
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

  return [];
}

export async function updateOrderStatus(id: string, status: string, resi: string, notes: string): Promise<any> {
  const updateData = { status, resi_number: resi, admin_notes: notes };

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('orders').update(updateData).eq('id', id);
      if (error) throw error;
      return { id, ...updateData };
    } catch (err) {
      console.error('[DSI Database - Supabase] updateOrderStatus error:', err);
      throw err;
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
      throw err;
    }
  }

  throw new Error('No live cloud database client is configured to update order status');
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

  return 0;
}

export async function updateOrderPaymentReceipt(id: string, payment_receipt: string): Promise<any> {
  const updateData = { payment_receipt };

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('orders').update(updateData).eq('id', id);
      if (error) throw error;
      return { id, ...updateData };
    } catch (err) {
      console.error('[DSI Database - Supabase] updateOrderPaymentReceipt error:', err);
      throw err;
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
      throw err;
    }
  }

  throw new Error('No live cloud database client is configured to update payment receipt');
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

  return [];
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

  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('testimonials').insert(tData);
      if (error) throw error;
      return tData;
    } catch (err) {
      console.error('[DSI Database - Supabase] createTestimonial error:', err);
      throw err;
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
      throw err;
    }
  }

  throw new Error('No live cloud database client is configured to save testimonial');
}

export async function deleteTestimonial(id: string): Promise<boolean> {
  // Try Supabase first if active
  if (isSupabaseEnabled && supabase) {
    try {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[DSI Database - Supabase] deleteTestimonial error:', err);
      return false;
    }
  }

  // Fallback to Firebase Firestore
  if (db) {
    try {
      const docRef = doc(db, 'testimonials', id);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error('[DSI Database - Firebase] deleteTestimonial error:', err);
      return false;
    }
  }

  return false;
}

/**
 * AUTO SEED DATABASE (Both Supabase and Firebase if empty)
 */
export async function autoSeedSupabase() {
  console.log('[DSI Database] Menguji apakah database cloud memerlukan seeding otomatis... 🚀');
  
  // If we have configurations, temporarily assume enabled to perform active verification query
  if (hasSupabaseConfig && supabase) {
    isSupabaseEnabled = true;
  }

  // 1. Seed Supabase if active & empty
  if (isSupabaseEnabled && supabase) {
    try {
      console.log('[DSI Database] Mengecek status seed di Supabase...');
      
      // Seed admins if empty, checking if relation/table exists
      const { data: adminSnap, error: adminErr } = await supabase.from('admins').select('id').limit(1);
      if (adminErr) {
        console.warn('[DSI Database] Supabase connection failed or tables do not exist. Bypassing Supabase and falling back to Firebase Firestore:', adminErr.message || adminErr);
        isSupabaseEnabled = false;
        // Skip Supabase seeding since tables aren't deployed
      } else {
        if (!adminSnap || adminSnap.length === 0) {
          console.log('[DSI Database] Melakukan seed data admin awal di Supabase...');
          await supabase.from('admins').insert([
            { id: 'admin-dony', username: 'Dony', password_hash: hashPassword('JastipDesiRistanti123') },
            { id: 'admin-desi', username: 'Desi', password_hash: hashPassword('JastipDesiRistanti123') },
            { id: 'admin-rori', username: 'Rori', password_hash: hashPassword('JastipDesiRistanti123') }
          ]);
        }

        // Seed products if empty
        const { data: productSnap } = await supabase.from('products').select('id').limit(1);
        if (!productSnap || productSnap.length === 0) {
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
        }

        // Seed testimonials if empty
        const { data: testiSnap } = await supabase.from('testimonials').select('id').limit(1);
        if (!testiSnap || testiSnap.length === 0) {
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

        // Seed initial order if empty
        const { data: orderSnap } = await supabase.from('orders').select('id').limit(1);
        if (!orderSnap || orderSnap.length === 0) {
          console.log('[DSI Database] Melakukan seed data pesanan awal di Supabase...');
          const orderId = 'order-initial-01';
          const initialOrder = {
            id: orderId,
            order_code: 'BYDSI-0001',
            customer_name: 'Clarissa Putri',
            whatsapp: '6281234567890',
            product: 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink',
            quantity: 1,
            notes: 'Please wrap safely as a birthday surprise!',
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
        }
        
        if (isSupabaseEnabled) {
          console.log('[DSI Database] Proses seeding Supabase selesai dengan aman! 🎆');
        }
      }
    } catch (err: any) {
      console.error('[DSI Database] Seeding Supabase gagal:', err.message || err);
    }
  }

  // 2. Seed Firebase Firestore if active & empty
  if (db) {
    try {
      // Seed admins if empty
      const adminRef = collection(db, 'admins');
      const adminSnap = await getDocs(query(adminRef, limit(1)));
      if (adminSnap.empty) {
        console.log('[DSI Database] Melakukan seed data admin awal di Firebase Firestore...');
        const targetAdmins = [
          { id: 'admin-dony', username: 'Dony', password_hash: hashPassword('JastipDesiRistanti123') },
          { id: 'admin-desi', username: 'Desi', password_hash: hashPassword('JastipDesiRistanti123') },
          { id: 'admin-rori', username: 'Rori', password_hash: hashPassword('JastipDesiRistanti123') }
        ];
        for (const a of targetAdmins) {
          await setDoc(doc(db, 'admins', a.id), a);
        }
      }

      // Seed products if empty
      const productRef = collection(db, 'products');
      const productSnap = await getDocs(query(productRef, limit(1)));
      if (productSnap.empty) {
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
      }

      // Seed testimonials if empty
      const testiRef = collection(db, 'testimonials');
      const testiSnap = await getDocs(query(testiRef, limit(1)));
      if (testiSnap.empty) {
        console.log('[DSI Database] Melakukan seed data testimoni awal di Firebase Firestore...');
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
        for (const t of seedTestimonials) {
          await setDoc(doc(db, 'testimonials', t.id), t);
        }
      }

      // Seed initial order if empty
      const orderRef = collection(db, 'orders');
      const orderSnap = await getDocs(query(orderRef, limit(1)));
      if (orderSnap.empty) {
        console.log('[DSI Database] Melakukan seed data pesanan awal di Firebase Firestore...');
        const orderId = 'order-initial-01';
        const initialOrder = {
          id: orderId,
          order_code: 'BYDSI-0001',
          customer_name: 'Clarissa Putri',
          whatsapp: '6281234567890',
          product: 'Stanley Quencher H2.0 FlowState (40oz) - Pastel Pink',
          quantity: 1,
          notes: 'Please wrap safely as a birthday surprise!',
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
