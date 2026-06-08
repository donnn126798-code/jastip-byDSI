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
  getTestimonials,
  createTestimonial,
  deleteTestimonial,
  isSupabaseEnabled
} from './server/db.js';

const app = express();
app.use(express.json());

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
    const orders = await getAllOrders();
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

bootstrap().catch((err) => {
  console.error('Failed to bootstrap express server:', err);
});
