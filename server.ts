/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { 
  hashPassword, 
  getAdminByUsername, 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getLatestOrderCode,
  createOrder,
  decrementProductStock,
  createTrackingHistory,
  getAllOrders,
  getOrderByCode,
  getOrderById,
  getTrackingHistoryForOrder,
  updateOrderStatus,
  countTrackingHistory,
  updateOrderPaymentReceipt,
  deleteOrder,
  restoreOrder,
  deleteOrderPermanently,
  getTestimonials,
  createTestimonial,
  deleteTestimonial,
  isSupabaseEnabled,
  isFirebaseEnabled,
  fallbackToSqlite,
  getDbDiagnostics,
  autoSeedSupabase
} from './server/db.js';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
export { app };

app.get('/api/db-status', (req: Request, res: Response) => {
  return res.json({
    isSupabaseEnabled,
    isFirebaseEnabled,
    fallbackToSqlite
  });
});

app.get('/api/db-diagnostics', async (req: Request, res: Response) => {
  try {
    const diag = await getDbDiagnostics();
    return res.json(diag);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/db-seed', async (req: Request, res: Response) => {
  try {
    await autoSeedSupabase();
    const diag = await getDbDiagnostics();
    return res.json({ success: true, message: 'Seeding completed successfully', diagnostics: diag });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Token for simple administration authentication
const ADMIN_TOKEN = 'bydsi-admin-logged-in-token-2026';

// Middleware to audit admin credentials
function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized credentials. Access denied.' });
  }
  next();
}

/* ==========================================================================
   ADMIN AUTHENTICATION ENDPOINTS
   ========================================================================== */

app.post('/api/admin/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await getAdminByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Username atau password admin salah' });
    }

    const inputHash = hashPassword(password);
    if (user.password_hash !== inputHash) {
      return res.status(401).json({ error: 'Username atau password admin salah' });
    }

    return res.json({
      success: true,
      token: ADMIN_TOKEN,
      username: user.username
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   PRODUCT CATALOG ENDPOINTS
   ========================================================================== */

app.get('/api/products', async (req: Request, res: Response) => {
  const category = req.query.category as string;
  const search = req.query.search as string;

  try {
    const products = await getProducts(category, search);
    return res.json(products);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(product);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authenticateAdmin, async (req: Request, res: Response) => {
  const { name, category, description, price, stock, image } = req.body;
  if (!name || !category || !price || stock === undefined || !image) {
    return res.status(400).json({ error: 'Missing required product information' });
  }

  try {
    const newProduct = await createProduct({ name, category, description, price, stock, image });
    return res.status(201).json(newProduct);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', authenticateAdmin, async (req: Request, res: Response) => {
  const { name, category, description, price, stock, image } = req.body;
  if (!name || !category || !price || stock === undefined || !image) {
    return res.status(400).json({ error: 'Missing required product fields' });
  }

  try {
    const updated = await updateProduct(req.params.id, { name, category, description, price, stock, image });
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   ORDER SUBMISSION & TRACKING ENDPOINTS
   ========================================================================== */

app.post('/api/orders', async (req: Request, res: Response) => {
  const { customer_name, whatsapp, product_id, quantity, notes } = req.body;

  if (!customer_name || !whatsapp || !product_id || !quantity) {
    return res.status(400).json({ error: 'Required order details are missing.' });
  }

  try {
    // Check product exists and has stock
    const product = await getProductById(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product requested does not exist.' });
    }

    if (product.stock < Number(quantity)) {
      return res.status(400).json({ error: `Insufficient stock. Only ${product.stock} items left.` });
    }

    // Begin state changes
    const total_price = product.price * Number(quantity);
    const order_id = 'order-' + Date.now();
    
    // Gen Order Code (e.g. BYDSI-0002)
    const lastOrderCode = await getLatestOrderCode();
    let nextNum = 1;
    if (lastOrderCode) {
      const match = lastOrderCode.match(/BYDSI-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const order_code = `BYDSI-${String(nextNum).padStart(4, '0')}`;
    const timestamp = new Date().toISOString();
    const initialStatus = 'Waiting for Payment';

    // Insert Order
    await createOrder({
      id: order_id,
      order_code,
      customer_name,
      whatsapp,
      product: product.name,
      quantity: Number(quantity),
      notes: notes || '',
      total_price,
      status: initialStatus,
      created_at: timestamp
    });

    // Decrement stock
    await decrementProductStock(product_id, Number(quantity));

    // Create Initial Tracking History
    const history_id = 'track-' + Date.now();
    await createTrackingHistory({
      id: history_id,
      order_id,
      status: initialStatus,
      updated_at: timestamp
    });

    const createdOrder = await getOrderById(order_id);
    return res.status(201).json(createdOrder);

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin view all orders
app.get('/api/orders', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const orders = await getAllOrders();
    return res.json(orders);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Track order by order_code
app.get('/api/orders/track/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const order = await getOrderByCode(code);
    
    if (!order) {
      return res.status(404).json({ error: `Order with tracking code "${code}" not found.` });
    }

    const history = await getTrackingHistoryForOrder(order.id);
    return res.json({ order, history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Print-friendly independent checkout receipt bypassing iframe limitation
app.get('/api/orders/print/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const order = await getOrderByCode(code);
    
    if (!order) {
      return res.status(404).send(`
        <html>
          <head>
            <title>Struk Tidak Ditemukan</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-slate-50 flex items-center justify-center min-h-screen font-sans">
            <div class="bg-white p-8 rounded-3xl shadow-xl max-w-sm text-center border border-slate-100">
              <span class="text-4xl">⚠️</span>
              <h1 class="text-lg font-extrabold text-slate-800 mt-4">Struk Tidak Ditemukan</h1>
              <p class="text-sm text-slate-500 mt-2">Kode pesanan <strong>${code}</strong> tidak terdaftar dalam sistem basis data kami.</p>
              <button onclick="window.close()" class="mt-6 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer">Tutup Halaman</button>
            </div>
          </body>
        </html>
      `);
    }

    const formattedDate = new Date(order.created_at).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const formattedTime = new Date(order.created_at).toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit'
    });

    const itemPrice = order.total_price / order.quantity;

    // Send high-fidelity boutique styled printable page
    return res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Struk Belanja Jastip byDSI - ${order.order_code}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
          }
          .font-mono-custom {
            font-family: 'JetBrains Mono', monospace;
          }
          @media print {
            body {
              background-color: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .print-padding-none {
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              max-width: 100% !important;
              width: 100% !important;
            }
          }
        </style>
      </head>
      <body class="bg-slate-50 min-h-screen py-8 px-4 flex flex-col items-center font-sans">
        
        <div class="no-print w-full max-w-sm mb-6 flex gap-2">
          <button onclick="window.print()" class="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95">
            🖨️ Cetak / Simpan PDF
          </button>
          <button onclick="window.close()" class="py-3 px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer">
            Kembali
          </button>
        </div>

        <!-- Receipt Engine container -->
        <div class="print-padding-none w-full max-w-sm bg-white rounded-3xl border border-slate-200/50 p-6 shadow-xl relative space-y-6">
          
          <!-- Receipt Paper Visual Jagged representation at the top -->
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-radial from-slate-200 to-transparent bg-[length:10px_6px] bg-repeat-x print:hidden"></div>

          <!-- Header -->
          <div class="text-center pt-2">
            <span class="inline-block px-3 py-1 bg-rose-50 text-rose-650 font-extrabold uppercase tracking-widest rounded-full text-[8.5px] mb-2 font-mono-custom">
              AUTHENTIC SOURCE HUB
            </span>
            <h1 class="text-xl font-black text-rose-600 tracking-tight">byDSI Sourcing Hub</h1>
            <p class="text-[9.5px] text-slate-400 font-mono-custom mt-1 uppercase tracking-wider">Premium Personal Sourcing Service</p>
            <p class="text-[9.5px] text-slate-400 font-light">Jakarta - Malang, Indonesia</p>
          </div>

          <!-- Decorative Line -->
          <div class="border-t border-dashed border-slate-200 my-4"></div>

          <!-- Meta Data Info -->
          <div class="space-y-1.5 font-mono-custom text-[11px] text-slate-600 leading-normal">
            <div class="flex justify-between">
              <span class="font-bold">KODE STRUK:</span>
              <span class="font-bold text-rose-605">${order.order_code}</span>
            </div>
            <div class="flex justify-between">
              <span>TANGGAL:</span>
              <span>${formattedDate}</span>
            </div>
            <div class="flex justify-between">
              <span>WAKTU:</span>
              <span>${formattedTime} WIB</span>
            </div>
            <div class="flex justify-between">
              <span>KASIR/SENDER:</span>
              <span>AUTOMATED / ADMIN DONY</span>
            </div>
          </div>

          <!-- Decorative Line -->
          <div class="border-t border-slate-100 my-4"></div>

          <!-- Customer Data block -->
          <div class="space-y-1 text-slate-700">
            <p class="text-[9px] font-extrabold tracking-wider font-mono-custom text-slate-400 uppercase">Detil Klien:</p>
            <div class="text-xs space-y-0.5">
              <p class="font-bold uppercase">${order.customer_name}</p>
              <p class="text-slate-500 font-mono-custom text-[11px]">+${order.whatsapp}</p>
            </div>
          </div>

          <!-- Decorative Line -->
          <div class="border-t border-dashed border-slate-200 my-4"></div>

          <!-- Items list -->
          <div class="space-y-3">
            <p class="text-[9px] font-extrabold tracking-wider font-mono-custom text-slate-400 uppercase">Rincian Belanja:</p>
            
            <div class="space-y-2">
              <div class="text-xs">
                <div class="flex justify-between font-semibold text-slate-800">
                  <span class="max-w-[70%]">${order.product}</span>
                  <span class="font-mono-custom text-right ml-2 shrink-0">Rp ${order.total_price.toLocaleString('id-ID')}</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5 font-mono-custom">
                  Spesifikasi: Jastip Premium • Qty: ${order.quantity} x Rp ${itemPrice.toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>

          <!-- Decorative Line -->
          <div class="border-t border-slate-150 my-4"></div>

          <!-- Summary list -->
          <div class="space-y-1.5 font-mono-custom text-[11px] text-slate-600">
            <div class="flex justify-between">
              <span>SUBTOTAL:</span>
              <span>Rp ${order.total_price.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between">
              <span>SENDER CHARGE / TAX:</span>
              <span>Rp 0</span>
            </div>
            <div class="flex justify-between text-xs font-bold text-slate-850 pt-1.5 border-t border-slate-100">
              <span>TOTAL INVOICE:</span>
              <span>Rp ${order.total_price.toLocaleString('id-ID')}</span>
            </div>
            <div class="flex justify-between text-xs font-black text-rose-600 pt-1 border-t border-double border-slate-350">
              <span>TOTAL DIBAYAR:</span>
              <span>Rp ${order.total_price.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <!-- Decorative Line -->
          <div class="border-t border-dashed border-slate-200 my-4"></div>

          <!-- Payment Verification Shield -->
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 text-center space-y-1">
            <div class="text-emerald-700 font-extrabold tracking-widest text-[9.5px] font-mono-custom uppercase flex items-center justify-center gap-1">
              🌟 PAYMENT STATUS: LUNAS 🌟
            </div>
            <p class="text-[9.5px] leading-relaxed text-emerald-800 font-light font-sans">
              Transaksi Anda aman. Bukti transfer telah tervalidasi dan diarsipkan secara permanen oleh tim verified DSI.
            </p>
          </div>

          <!-- Footer Thank You block -->
          <div class="text-center pt-2 space-y-2">
            <p class="text-[10px] text-slate-500 font-light leading-relaxed">
              Terima kasih telah berbelanja jastip premium di <strong>byDSI Sourcing Hub</strong>! Kami berkomitmen menyajikan produk 100% autentik berkualitas tinggi langsung ke tangan Anda.
            </p>
            
            <!-- Quick fake barcode using simple repeated pipes style for premium receipt styling -->
            <div class="pt-2 font-mono-custom text-[11px] text-slate-350 tracking-[4px] select-none text-center leading-none">
              ||||| | ||||| || ||| |||| | || || | |||| |||
            </div>
            <p class="text-[8px] text-slate-400 font-mono-custom tracking-widest uppercase">DSIPAY-AUTHPASS-${order.order_code}</p>
          </div>

        </div>

        <p class="no-print text-center text-slate-400 text-[10.5px] mt-6 font-light">
          Gunakan pintasan browser <kbd class="px-1.5 py-0.5 bg-slate-200 rounded text-[9px] font-bold">Ctrl + P</kbd> atau tombol di atas untuk mencetak langsung.
        </p>

        <!-- Auto invocation script -->
        <script>
          window.onload = function() {
            // Wait slightly for fonts and rendering to build beautifully
            setTimeout(function() {
              window.print();
            }, 600);
          }
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    return res.status(500).send(`Error generating print path: \${err.message}`);
  }
});

// Update order status (Admin)
app.put('/api/orders/:id/status', authenticateAdmin, async (req: Request, res: Response) => {
  const { status, resi_number, admin_notes } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const timestamp = new Date().toISOString();
    
    // Fetch existing order details for potential tracking updates
    const existing = await getOrderById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const nextResi = resi_number !== undefined ? resi_number : (existing.resi_number || '');
    const nextAdminNotes = admin_notes !== undefined ? admin_notes : (existing.admin_notes || '');

    const updatedOrder = await updateOrderStatus(req.params.id, status, nextResi, nextAdminNotes);
    
    // Add to tracking history only if status actually changed or history is empty
    const historyCount = await countTrackingHistory(req.params.id, status);
    if (existing.status !== status || historyCount === 0) {
      const history_id = 'track-' + Date.now() + '-' + Math.floor(Math.random() * 100);
      await createTrackingHistory({
        id: history_id,
        order_id: req.params.id,
        status,
        updated_at: timestamp
      });
    }

    const finalOrder = await getOrderById(req.params.id);
    return res.json(finalOrder);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Upload/Submit Payment Receipt (Public for clients to upload their transfer screenshot)
app.post('/api/orders/:id/receipt', async (req: Request, res: Response) => {
  const { payment_receipt } = req.body;
  if (!payment_receipt) {
    return res.status(400).json({ error: 'Bukti transfer wajib dilampirkan atau format file kosong.' });
  }

  try {
    const updatedOrder = await updateOrderPaymentReceipt(req.params.id, payment_receipt);
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    return res.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete Order (Admin restricted)
app.delete('/api/orders/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await deleteOrder(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }
    return res.json({ success: true, message: 'Pesanan berhasil dihapus.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Restore Order (Admin restricted)
app.post('/api/orders/:id/restore', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const restored = await restoreOrder(req.params.id);
    if (!restored) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }
    return res.json({ success: true, message: 'Pesanan berhasil dikembalikan.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Permanent Delete Order (Admin restricted - from trash bin)
app.delete('/api/orders/:id/permanent', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await deleteOrderPermanently(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }
    return res.json({ success: true, message: 'Pesanan berhasil dihapus secara permanen.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   TESTIMONIALS ENDPOINTS
   ========================================================================== */

app.get('/api/testimonials', async (req: Request, res: Response) => {
  try {
    const testimonials = await getTestimonials();
    return res.json(testimonials);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/testimonials', async (req: Request, res: Response) => {
  const { customer_name, review, rating, image } = req.body;
  if (!customer_name || !review || !rating) {
    return res.status(400).json({ error: 'Missing customer name, review or rating.' });
  }

  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
  try {
    const created = await createTestimonial({
      customer_name,
      review,
      rating: Number(rating),
      image: image || defaultAvatar
    });
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/testimonials/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await deleteTestimonial(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    return res.json({ success: true, message: 'Testimonial deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   SALES ANALYTICS ENDPOINTS
   ========================================================================== */

app.get('/api/stats', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const allOrders = await getAllOrders();
    const orders = allOrders.filter((o: any) => !o.is_deleted);
    const products = await getProducts();

    const productMap = new Map<string, string>();
    for (const p of products) {
      productMap.set(p.name, p.category);
    }

    // Calc aggregates
    let totalOrders = orders.length;
    let totalRevenue = 0;
    
    // Monthly statistics mapping
    const monthsMap = new Map<string, { ordersCount: number; revenue: number }>();
    // Category mapping
    const categoryMap = new Map<string, number>();
    // Popular product aggregates
    const popularMap = new Map<string, { salesCount: number; revenue: number }>();

    for (const order of orders) {
      totalRevenue += order.total_price;

      // Group monthly
      const date = new Date(order.created_at);
      const monthStr = Number.isNaN(date.getTime()) 
        ? "Jun 2026" 
        : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const currentMonth = monthsMap.get(monthStr) || { ordersCount: 0, revenue: 0 };
      currentMonth.ordersCount += 1;
      currentMonth.revenue += order.total_price;
      monthsMap.set(monthStr, currentMonth);

      // Group by category based on mapped product category
      const matchedCategory = productMap.get(order.product) || 'Other';
      categoryMap.set(matchedCategory, (categoryMap.get(matchedCategory) || 0) + Number(order.quantity));

      // Group by popular products
      const currentPop = popularMap.get(order.product) || { salesCount: 0, revenue: 0 };
      currentPop.salesCount += order.quantity;
      currentPop.revenue += order.total_price;
      popularMap.set(order.product, currentPop);
    }

    // Parse structures
    const monthlyOrders = Array.from(monthsMap.entries()).map(([month, data]) => ({
      month,
      ordersCount: data.ordersCount,
      revenue: data.revenue
    })).reverse(); // Standard chron order

    const categoryDistribution = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count
    }));

    const popularProducts = Array.from(popularMap.entries()).map(([name, data]) => ({
      name,
      salesCount: data.salesCount,
      revenue: data.revenue
    })).sort((a, b) => b.salesCount - a.salesCount).slice(0, 5);

    return res.json({
      totalOrders,
      totalRevenue,
      monthlyOrders,
      categoryDistribution,
      popularProducts
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


/* ==========================================================================
   VITE DEV ENVIRONMENT MIDDLEWARE OR STATIC SERVING
   ========================================================================== */

async function bootstrap() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('[DSI Server] Loaded Vite middleware for smooth development hot reloading.');
  } else {
    const distPath = join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(join(distPath, 'index.html'));
    });
    console.log('[DSI Server] Loaded Production assets from built static directory.');
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DSI Server] Premium Shopping active at http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  bootstrap().catch((err) => {
    console.error('Failed to bootstrap express server:', err);
  });
}
