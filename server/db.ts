/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import crypto from 'crypto';
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

// Password helper using pbkdf2 Node native crypto
export function hashPassword(password: string): string {
  const salt = 'jastip_bydsi_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// 1. Initialize Firebase from config file
let db: any = null;
export let isSupabaseEnabled = false;
export let fallbackToSqlite = false;

try {
  const configPath = join(process.cwd(), 'firebase-applet-config.json');
  if (existsSync(configPath)) {
    const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf8'));
    const app = initializeApp(firebaseConfig);
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    console.log('[DSI Database] Firebase Firestore Cloud Live activated! ☁️🔥');
  } else {
    console.warn('[DSI Database] firebase-applet-config.json not found! Unable to start Firestore.');
  }
} catch (err: any) {
  console.error('[DSI Database] Error initializing Firebase Firestore:', err.message || err);
}

/**
 * ADMINS ENDPOINTS
 */
export async function getAdminByUsername(username: string): Promise<any> {
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
    console.error('[DSI Database] getAdminByUsername error:', err);
    return null;
  }
}

/**
 * PRODUCTS ENDPOINTS
 */
export async function getProducts(category?: string, search?: string): Promise<any[]> {
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
    console.error('[DSI Database] getProducts error:', err);
    return [];
  }
}

export async function getProductById(id: string): Promise<any> {
  try {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (err) {
    console.error('[DSI Database] getProductById error:', err);
    return null;
  }
}

export async function createProduct(p: { name: string; category: string; description: string; price: number; stock: number; image: string }): Promise<any> {
  try {
    const id = 'prod-' + Date.now();
    const docRef = doc(db, 'products', id);
    const pData = {
      id,
      name: p.name,
      category: p.category,
      description: p.description || '',
      price: Number(p.price),
      stock: Number(p.stock),
      image: p.image
    };
    await setDoc(docRef, pData);
    return pData;
  } catch (err) {
    console.error('[DSI Database] createProduct error:', err);
    throw err;
  }
}

export async function updateProduct(id: string, p: { name: string; category: string; description: string; price: number; stock: number; image: string }): Promise<any> {
  try {
    const docRef = doc(db, 'products', id);
    const updateData = {
      name: p.name,
      category: p.category,
      description: p.description || '',
      price: Number(p.price),
      stock: Number(p.stock),
      image: p.image
    };
    await setDoc(docRef, updateData, { merge: true });
    return { id, ...updateData };
  } catch (err) {
    console.error('[DSI Database] updateProduct error:', err);
    throw err;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'products', id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('[DSI Database] deleteProduct error:', err);
    return false;
  }
}

/**
 * ORDERS & TRACKING ENDPOINTS
 */
export async function getLatestOrderCode(): Promise<string | null> {
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
    return null;
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
      return null;
    }
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
  try {
    const docRef = doc(db, 'orders', o.id);
    await setDoc(docRef, o);
    return o;
  } catch (err) {
    console.error('[DSI Database] createOrder error:', err);
    throw err;
  }
}

export async function decrementProductStock(productId: string, quantity: number): Promise<void> {
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
    console.error('[DSI Database] decrementProductStock error:', err);
  }
}

export async function createTrackingHistory(h: { id: string; order_id: string; status: string; updated_at: string }): Promise<any> {
  try {
    const docRef = doc(db, 'tracking_history', h.id);
    await setDoc(docRef, h);
    return h;
  } catch (err) {
    console.error('[DSI Database] createTrackingHistory error:', err);
    throw err;
  }
}

export async function getAllOrders(): Promise<any[]> {
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
      return [];
    }
  }
}

export async function getOrderByCode(code: string): Promise<any> {
  try {
    const q = query(collection(db, 'orders'), where('order_code', '==', code.toUpperCase().trim()));
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
      if (d.order_code && d.order_code.toUpperCase() === code.toUpperCase().trim()) {
        found = { id: docSnap.id, ...d };
      }
    });
    return found;
  } catch (err) {
    console.error('[DSI Database] getOrderByCode error:', err);
    return null;
  }
}

export async function getOrderById(id: string): Promise<any> {
  try {
    const docRef = doc(db, 'orders', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (err) {
    console.error('[DSI Database] getOrderById error:', err);
    return null;
  }
}

export async function getTrackingHistoryForOrder(orderId: string): Promise<any[]> {
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
      return [];
    }
  }
}

export async function updateOrderStatus(id: string, status: string, resi: string, notes: string): Promise<any> {
  try {
    const docRef = doc(db, 'orders', id);
    const updateData = { status, resi_number: resi, admin_notes: notes };
    await setDoc(docRef, updateData, { merge: true });
    return { id, ...updateData };
  } catch (err) {
    console.error('[DSI Database] updateOrderStatus error:', err);
    throw err;
  }
}

export async function countTrackingHistory(orderId: string, status: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'tracking_history'),
      where('order_id', '==', orderId),
      where('status', '==', status)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.error('[DSI Database] countTrackingHistory error:', err);
    return 0;
  }
}

export async function updateOrderPaymentReceipt(id: string, payment_receipt: string): Promise<any> {
  try {
    const docRef = doc(db, 'orders', id);
    const updateData = { payment_receipt };
    await setDoc(docRef, updateData, { merge: true });
    return { id, ...updateData };
  } catch (err) {
    console.error('[DSI Database] updateOrderPaymentReceipt error:', err);
    throw err;
  }
}

/**
 * TESTIMONIALS ENDPOINTS
 */
export async function getTestimonials(): Promise<any[]> {
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
      return [];
    }
  }
}

export async function createTestimonial(t: { customer_name: string; review: string; rating: number; image: string }): Promise<any> {
  try {
    const id = 'testi-' + Date.now();
    const docRef = doc(db, 'testimonials', id);
    const tData = {
      id,
      customer_name: t.customer_name,
      review: t.review,
      rating: Number(t.rating),
      image: t.image
    };
    await setDoc(docRef, tData);
    return tData;
  } catch (err) {
    console.error('[DSI Database] createTestimonial error:', err);
    throw err;
  }
}

export async function deleteTestimonial(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'testimonials', id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('[DSI Database] deleteTestimonial error:', err);
    return false;
  }
}

/**
 * AUTO SEED FIREBASE IF EMPTY -- Named autoSeedSupabase to match legacy router imports
 */
export async function autoSeedSupabase() {
  if (!db) return;
  console.log('[DSI Database] Menguji apakah database cloud Firestore memerlukan seeding otomatis... 🚀');
  try {
    // 1. Seed admins if empty
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

    // 2. Seed products if empty
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

    // 3. Seed testimonials if empty
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

    // 4. Seed initial order if empty
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

/**
 * DATABASE DIAGNOSTICS FOR SUPPORT PANEL
 */
export async function getDbDiagnostics() {
  const result = {
    isSupabaseEnabled: false,
    isFirebaseEnabled: true,
    supabaseUrlConfigured: false,
    supabaseAnonKeyConfigured: false,
    fallbackToSqlite: false,
    isVercel: !!process.env.VERCEL,
    supabaseConnectionStatus: 'connected_and_healthy',
    supabaseError: null as string | null,
    sqliteType: 'none',
    catalogCount: 0
  };

  if (db) {
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

// Automatically seed Firebase when module is loaded if db is initialized
if (db) {
  autoSeedSupabase().catch((err) => {
    console.error('[DSI Database] Auto seed loading error:', err);
  });
}
