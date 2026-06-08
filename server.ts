/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { db, hashPassword } from './server/db.js';
import crypto from 'crypto';

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

app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)').get(username) as any;
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
});

/* ==========================================================================
   PRODUCT CATALOG ENDPOINTS
   ========================================================================== */

app.get('/api/products', (req: Request, res: Response) => {
  const category = req.query.category as string;
  const search = req.query.search as string;

  let query = 'SELECT * FROM products';
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
    query += ' WHERE ' + conditions.join(' AND ');
  }

  try {
    const products = db.prepare(query).all(...params);
    return res.json(products);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(product);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authenticateAdmin, (req: Request, res: Response) => {
  const { name, category, description, price, stock, image } = req.body;
  if (!name || !category || !price || stock === undefined || !image) {
    return res.status(400).json({ error: 'Missing required product information' });
  }

  const id = 'prod-' + Date.now();
  try {
    db.prepare(`
      INSERT INTO products (id, name, category, description, price, stock, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, category, description || '', Number(price), Number(stock), image);
    
    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return res.status(201).json(newProduct);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', authenticateAdmin, (req: Request, res: Response) => {
  const { name, category, description, price, stock, image } = req.body;
  if (!name || !category || !price || stock === undefined || !image) {
    return res.status(400).json({ error: 'Missing required product fields' });
  }

  try {
    const expr = db.prepare(`
      UPDATE products 
      SET name = ?, category = ?, description = ?, price = ?, stock = ?, image = ?
      WHERE id = ?
    `).run(name, category, description || '', Number(price), Number(stock), image, req.params.id);

    if (expr.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', authenticateAdmin, (req: Request, res: Response) => {
  try {
    const expr = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    if (expr.changes === 0) {
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

app.post('/api/orders', (req: Request, res: Response) => {
  const { customer_name, whatsapp, product_id, quantity, notes } = req.body;

  if (!customer_name || !whatsapp || !product_id || !quantity) {
    return res.status(400).json({ error: 'Required order details are missing.' });
  }

  try {
    // Check product exists and has stock
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as any;
    if (!product) {
      return res.status(404).json({ error: 'Product requested does not exist.' });
    }

    if (product.stock < Number(quantity)) {
      return res.status(400).json({ error: `Insufficient stock. Only ${product.stock} items left.` });
    }

    // Begin transaction-like synchronous state changes
    const total_price = product.price * Number(quantity);
    const order_id = 'order-' + Date.now();
    
    // Gen Order Code (e.g. BYDSI-0002)
    const lastOrder = db.prepare("SELECT order_code FROM orders ORDER BY created_at DESC, id DESC LIMIT 1").get() as { order_code: string } | undefined;
    let nextNum = 1;
    if (lastOrder) {
      const match = lastOrder.order_code.match(/BYDSI-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const order_code = `BYDSI-${String(nextNum).padStart(4, '0')}`;
    const timestamp = new Date().toISOString();
    const initialStatus = 'Waiting for Payment';

    // Insert Order
    db.prepare(`
      INSERT INTO orders (id, order_code, customer_name, whatsapp, product, quantity, notes, total_price, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(order_id, order_code, customer_name, whatsapp, product.name, Number(quantity), notes || '', total_price, initialStatus, timestamp);

    // Decrement stock
    db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(Number(quantity), product_id);

    // Create Initial Tracking History
    const history_id = 'track-' + Date.now();
    db.prepare(`
      INSERT INTO tracking_history (id, order_id, status, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(history_id, order_id, initialStatus, timestamp);

    const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    return res.status(201).json(createdOrder);

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin view all orders
app.get('/api/orders', authenticateAdmin, (req: Request, res: Response) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    return res.json(orders);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Track order by order_code
app.get('/api/orders/track/:code', (req: Request, res: Response) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const order = db.prepare('SELECT * FROM orders WHERE UPPER(order_code) = ?').get(code) as any;
    
    if (!order) {
      return res.status(404).json({ error: `Order with tracking code "${code}" not found.` });
    }

    const history = db.prepare('SELECT * FROM tracking_history WHERE order_id = ? ORDER BY updated_at ASC').all(order.id);
    return res.json({ order, history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update order status (Admin)
app.put('/api/orders/:id/status', authenticateAdmin, (req: Request, res: Response) => {
  const { status, resi_number, admin_notes } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const timestamp = new Date().toISOString();
    
    // Fetch existing order details for potential tracking updates
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const nextResi = resi_number !== undefined ? resi_number : (existing.resi_number || '');
    const nextAdminNotes = admin_notes !== undefined ? admin_notes : (existing.admin_notes || '');

    const updateResult = db.prepare(`
      UPDATE orders 
      SET status = ?, resi_number = ?, admin_notes = ? 
      WHERE id = ?
    `).run(status, nextResi, nextAdminNotes, req.params.id);
    
    // Add to tracking history only if status actually changed or history is empty
    const historyExists = db.prepare('SELECT COUNT(*) as count FROM tracking_history WHERE order_id = ? AND status = ?').get(req.params.id, status) as any;
    if (existing.status !== status || (historyExists && historyExists.count === 0)) {
      const history_id = 'track-' + Date.now() + '-' + Math.floor(Math.random() * 100);
      db.prepare(`
        INSERT INTO tracking_history (id, order_id, status, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(history_id, req.params.id, status, timestamp);
    }

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    return res.json(updatedOrder);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Upload/Submit Payment Receipt (Public for clients to upload their transfer screenshot)
app.post('/api/orders/:id/receipt', (req: Request, res: Response) => {
  const { payment_receipt } = req.body;
  if (!payment_receipt) {
    return res.status(400).json({ error: 'Bukti transfer wajib dilampirkan atau format file kosong.' });
  }

  try {
    const updateResult = db.prepare('UPDATE orders SET payment_receipt = ? WHERE id = ?').run(payment_receipt, req.params.id);
    
    if (updateResult.changes === 0) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    return res.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   TESTIMONIALS ENDPOINTS
   ========================================================================== */

app.get('/api/testimonials', (req: Request, res: Response) => {
  try {
    const testimonials = db.prepare('SELECT * FROM testimonials').all();
    return res.json(testimonials);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/testimonials', (req: Request, res: Response) => {
  const { customer_name, review, rating, image } = req.body;
  if (!customer_name || !review || !rating) {
    return res.status(400).json({ error: 'Missing customer name, review or rating.' });
  }

  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
  const id = 'testi-' + Date.now();
  try {
    db.prepare(`
      INSERT INTO testimonials (id, customer_name, review, rating, image)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, customer_name, review, Number(rating), image || defaultAvatar);

    const created = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(id);
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/testimonials/:id', authenticateAdmin, (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
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

app.get('/api/stats', authenticateAdmin, (req: Request, res: Response) => {
  try {
    const orders = db.prepare('SELECT * FROM orders').all() as any[];
    const products = db.prepare('SELECT * FROM products').all() as any[];

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
      // Standardize total revenue from active orders (Paid, Ordered, Transit, Arrived, Shipped, Completed)
      // Including Completed, Shipped, Arrived, In Transit, Ordered, Paid, and even Waiting for tracking setup.
      totalRevenue += order.total_price;

      // Group monthly (created_at ISO like 2026-06-05T03:14:59Z)
      const date = new Date(order.created_at);
      // fallback to actual date if parse fails
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
  const isDev = process.env.NODE_ENV !== 'production' && !existsSync(join(process.cwd(), 'dist'));

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
