/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, ShoppingBag, Users, DollarSign, Package, Trash2, 
  Edit3, Plus, RefreshCw, BarChart2, ShieldAlert, LogOut, Check, Search, Filter,
  Download, Eye, MessageSquare, CheckSquare, FileText, CheckCircle, ExternalLink, Calendar, Info,
  Receipt, Printer, Copy
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Product, Order, Testimonial, TrackingStatus, SalesStat, CategoryType, categoryLabels, statusLabels } from '../types';

interface AdminPanelProps {
  token: string;
  onLogout: () => void;
}

const CATEGORIES: CategoryType[] = ['Stanley', 'Gift Set', 'Limited Edition', 'Tumbler Accessories'];

const ADMIN_TAB_LABELS = {
  dashboard: 'Dashboard',
  products: 'Koleksi Produk',
  orders: 'Reservasi Pesanan',
  testimonials: 'Ulasan Pelanggan'
};

const PRESET_IMAGES = [
  {
    name: 'Blush Pink Matte',
    url: 'https://images.unsplash.com/photo-1594540453716-1681283e9fe7?auto=format&fit=crop&q=80&w=600',
  },
  {
    name: 'Floral Watercolor',
    url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=600',
  },
  {
    name: 'Sakura Gift Box',
    url: 'https://images.unsplash.com/photo-1513201066733-1fda72652a1c?auto=format&fit=crop&q=80&w=600',
  },
  {
    name: 'Leather Crossbody Strap',
    url: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&q=80&w=600',
  },
  {
    name: 'Accessory Charm Set',
    url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600',
  }
];

export default function AdminPanel({ token, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'testimonials'>('dashboard');
  
  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [stats, setStats] = useState<SalesStat | null>(null);

  // Search & Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<string>('All');
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Product Modals / Forms
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  // Form Values
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] = useState<CategoryType>('Stanley');
  const [pDescription, setPDescription] = useState('');
  const [pPrice, setPPrice] = useState(0);
  const [pStock, setPStock] = useState(0);
  const [pImage, setPImage] = useState('');

  // 4 Premium Power Features States
  const [receiptLightbox, setReceiptLightbox] = useState<string | null>(null);
  
  // Detailed Status Form States (for custom notes and tracking numbers)
  const [detailedStatusOrder, setDetailedStatusOrder] = useState<Order | null>(null);
  const [dstStatus, setDstStatus] = useState<TrackingStatus>(TrackingStatus.WAITING_FOR_PAYMENT);
  const [dstResi, setDstResi] = useState('');
  const [dstNotes, setDstNotes] = useState('');

  // WhatsApp quick notification templates helper
  const [waModalOrder, setWaModalOrder] = useState<Order | null>(null);
  const [showInvoiceModalOrder, setShowInvoiceModalOrder] = useState<Order | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const handleCopyOrderCode = (orderId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const loadAllData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Products
      const rProds = await fetch('/api/products');
      const dataProds = await rProds.json();
      setProducts(dataProds);

      // Orders
      const rOrders = await fetch('/api/orders', { headers });
      const dataOrders = await rOrders.json();
      if (!rOrders.ok) throw new Error(dataOrders.error || 'Failed to sync orders.');
      setOrders(dataOrders);

      // Testimonials
      const rTestis = await fetch('/api/testimonials');
      const dataTestis = await rTestis.json();
      setTestimonials(dataTestis);

      // Stats
      const rStats = await fetch('/api/stats', { headers });
      const dataStats = await rStats.json();
      if (!rStats.ok) throw new Error(dataStats.error || 'Failed to load sales database stats.');
      setStats(dataStats);

    } catch (err: any) {
      setErrorMsg(err.message || 'Connecting to SQLite failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [token]);

  // Product form controllers
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setPName('');
    setPCategory('Stanley');
    setPDescription('');
    setPPrice(1150000);
    setPStock(10);
    setPImage(PRESET_IMAGES[2].url);
    setProductFormOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setPName(prod.name);
    setPCategory(prod.category);
    setPDescription(prod.description);
    setPPrice(prod.price);
    setPStock(prod.stock);
    setPImage(prod.image);
    setProductFormOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pPrice || pStock === undefined || !pImage) {
      alert('Mohon lengkapi semua bidang informasi produk.');
      return;
    }

    setActionLoading(true);
    try {
      const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
      const method = editingProductId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          name: pName,
          category: pCategory,
          description: pDescription,
          price: Number(pPrice),
          stock: Number(pStock),
          image: pImage,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Gagal menyimpan perubahan produk.');
      }

      setProductFormOpen(false);
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem saat menyimpan produk.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus produk ini? Semua metrik akan dihitung ulang.')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus produk.');
      }
      loadAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: TrackingStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui status pelacakan pesanan.');
      }
      loadAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateOrderStatusDetailed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailedStatusOrder) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${detailedStatusOrder.id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          status: dstStatus,
          resi_number: dstResi,
          admin_notes: dstNotes
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui alur pelacakan detail.');
      }
      
      setDetailedStatusOrder(null);
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetailedStatusModal = (ord: Order) => {
    setDetailedStatusOrder(ord);
    setDstStatus(ord.status);
    setDstResi(ord.resi_number || '');
    setDstNotes(ord.admin_notes || '');
  };

  const exportOrdersToCSV = () => {
    const listToExport = filteredOrders;
    if (listToExport.length === 0) {
      alert("Tidak ada data pesanan untuk diekspor sesuai filter saat ini.");
      return;
    }
    
    const headers = [
      "ID Pesanan", "Kode Pesanan", "Nama Klien", "WhatsApp", 
      "Produk Tumbler", "Jumlah", "Catatan Klien", 
      "Total Pembayaran (Rp)", "Status Pelacakan", "No Resi Domestik", 
      "Pesan Sourcing Admin", "Bukti Transfer Terlampir", "Tanggal Pemesanan"
    ];
    
    const rows = listToExport.map(o => [
      o.id,
      o.order_code,
      `"${o.customer_name.replace(/"/g, '""')}"`,
      `"+${o.whatsapp}"`, // safe phone formatting in Excel
      `"${o.product.replace(/"/g, '""')}"`,
      o.quantity,
      o.notes ? `"${o.notes.replace(/"/g, '""')}"` : "",
      o.total_price,
      `"${(statusLabels[o.status] || o.status).replace(/"/g, '""')}"`,
      o.resi_number ? `"${o.resi_number.replace(/"/g, '""')}"` : "",
      o.admin_notes ? `"${o.admin_notes.replace(/"/g, '""')}"` : "",
      o.payment_receipt ? "Terlampir" : "Belum Ada",
      new Date(o.created_at).toLocaleString('id-ID')
    ]);
    
    // Add BOM for Indonesian and system-wide Excel flawless characters support
    const csvString = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Jastip_byDSI_SourcingHub_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!window.confirm('Hapus ulasan testimoni klien ini?')) return;
    try {
      const res = await fetch(`/api/testimonials/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus ulasan testimoni.');
      }
      loadAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) || 
                          o.order_code.toLowerCase().includes(orderSearch.toLowerCase());
    const matchesStatus = orderFilter === 'All' || o.status === orderFilter;
    return matchesSearch && matchesStatus;
  });

  const COLORS = ['#FF80DF', '#FFB3EC', '#E60099', '#FF99D8', '#CCCCCC'];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      
      {/* Top Admin Navigation Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-pink-100 pb-5 mb-8 gap-4">
        <div>
          <span className="text-[10px] tracking-widest font-extrabold text-pink-400 uppercase">Panel Manajemen Jastip byDSI</span>
          <h2 className="text-2xl font-semibold tracking-wide text-slate-800">Markas Pusat Kurasi</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="admin-sync-btn"
            onClick={loadAllData}
            title="Sinkronisasi Database"
            className="p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 text-slate-500 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            id="admin-logout-btn"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-3 bg-pink-100/30 text-pink-500 border border-pink-200/40 rounded-xl hover:bg-pink-500 hover:text-white transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-656 border border-red-100 rounded-2xl p-5 mb-8 text-sm flex gap-3 items-center">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <div>
            <p className="font-semibold">Kesalahan Server Butik</p>
            <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Admin Subtabs Menu */}
      <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl mb-8 border border-slate-100 max-w-md overflow-x-auto scrollbar-hide">
        {(['dashboard', 'products', 'orders', 'testimonials'] as const).map((tab) => (
          <button
            id={`admin-tab-${tab}`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs uppercase tracking-wider font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30' : 'text-slate-400 hover:text-slate-705'}`}
          >
            {ADMIN_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-pink-300 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-light text-slate-400 tracking-wider">Menyelaraskan data butik... mohon tunggu sebentar</p>
        </div>
      ) : (
        <>
          {/* TAB 1: DASHBOARD ANALYTICS */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-8 animate-fade-in">
              {/* Aggregate metrics grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-pink-50 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] tracking-widest font-extrabold uppercase text-slate-405 block mb-1">Total Penjualan Kotor</p>
                      <h4 className="text-2xl font-bold text-slate-800 tracking-wide">
                        Rp {stats.totalRevenue.toLocaleString('id-ID')}
                      </h4>
                    </div>
                    <div className="p-3 bg-pink-50 rounded-xl text-pink-500">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-pink-50 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] tracking-widest font-extrabold uppercase text-slate-405 block mb-1">Jumlah Reservasi</p>
                      <h4 className="text-2xl font-bold text-slate-800 tracking-wide">
                        {stats.totalOrders} Unit
                      </h4>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-500">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-pink-50 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] tracking-widest font-extrabold uppercase text-slate-405 block mb-1">Rata-rata Pembelian</p>
                      <h4 className="text-2xl font-bold text-slate-800 tracking-wide">
                        Rp {stats.totalOrders > 0 
                          ? Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString('id-ID')
                          : '0'}
                      </h4>
                    </div>
                    <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-pink-50 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] tracking-widest font-extrabold uppercase text-slate-405 block mb-1">Jumlah Ulasan Masuk</p>
                      <h4 className="text-2xl font-bold text-slate-800 tracking-wide">
                        {testimonials.length} Ulasan
                      </h4>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphic Visualiser graphs charts */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Revenue trends */}
                <div className="lg:col-span-3 bg-white border border-pink-50 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-sm font-bold tracking-widest uppercase text-slate-800 mb-6 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-pink-400" /> Tren Penjualan Bulanan (Omset)
                  </h4>
                  {stats.monthlyOrders.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-350 text-xs">
                      Belum ada tren penjualan untuk bulan ini.
                    </div>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.monthlyOrders} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                          <Tooltip 
                            formatter={(value: any) => [`Rp ${value.toLocaleString('id-ID')}`, 'Pendapatan']}
                            labelStyle={{ fontSize: 11, fontWeight: 'bold' }}
                            contentStyle={{ fontSize: 11, borderRadius: '8px', border: '1px solid #fbcfe8' }}
                          />
                          <Bar dataKey="revenue" fill="#FF80DF" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Category volume distribution */}
                <div className="lg:col-span-2 bg-white border border-pink-50 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold tracking-widest uppercase text-slate-800 mb-6 flex items-center gap-2">
                      <Package className="w-4 h-4 text-pink-400" /> Minat Kategori Produk
                    </h4>
                    {stats.categoryDistribution.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-slate-350 text-xs text-center">
                        Belum ada distribusi minat produk.
                      </div>
                    ) : (
                      <div className="h-56 w-full flex justify-center items-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.categoryDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="count"
                              nameKey="category"
                            >
                              {stats.categoryDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any, name: any) => [value, categoryLabels[name as CategoryType] || name]} />
                            <Legend formatter={(value: any) => categoryLabels[value as CategoryType] || value} wrapperStyle={{ fontSize: 10 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Popular Products Curation Board */}
              <div className="bg-white border border-pink-50 rounded-2xl p-6 shadow-sm">
                <h4 className="text-sm font-bold tracking-widest uppercase text-slate-800 mb-4">Produk Paling Banyak Dipesan</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-pink-100 text-[10px] uppercase tracking-widest text-slate-404">
                        <th className="py-3 font-semibold">Nama Produk</th>
                        <th className="py-3 font-semibold text-center">Unit Direservasi</th>
                        <th className="py-3 font-semibold text-right">Omset Kotor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {stats.popularProducts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/20">
                          <td className="py-4.5 font-medium text-slate-705">{p.name}</td>
                          <td className="py-4.5 text-center font-bold text-slate-800">{p.salesCount} unit</td>
                          <td className="py-4.5 text-right font-bold text-rose-500">
                            Rp {p.revenue.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCT CATALOG MANAGEMENT */}
          {activeTab === 'products' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center sm:gap-2">
                <h3 className="text-base font-semibold text-slate-800">Katalog Produk Aktif ({products.length})</h3>
                <button
                  id="admin-add-product-btn"
                  onClick={handleOpenAddProduct}
                  className="bg-pink-400 hover:bg-pink-500 text-white rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Produk Baru
                </button>
              </div>

              {/* Product Form Modal (overlay like) */}
              {productFormOpen && (
                <div className="bg-pink-50/30 border border-pink-100 p-6 rounded-2xl max-w-2xl animate-fade-in shadow-inner space-y-4">
                  <h4 className="text-sm font-bold tracking-widest uppercase text-slate-800 border-b border-pink-100 pb-2">
                    {editingProductId ? 'Ubah Informasi Produk' : 'Tambah Produk Baru'}
                  </h4>

                  <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Nama Produk</label>
                        <input
                          id="admin-p-name"
                          type="text"
                          required
                          placeholder="Stanley Peach Horizon 40oz"
                          className="w-full bg-white border border-slate-100 text-xs rounded-xl p-3 text-slate-705"
                          value={pName}
                          onChange={(e) => setPName(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-404 block mb-1">Kategori</label>
                          <select
                            id="admin-p-category"
                            className="w-full bg-white border border-slate-100 text-xs rounded-xl p-3 text-slate-705"
                            value={pCategory}
                            onChange={(e) => setPCategory(e.target.value as CategoryType)}
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{categoryLabels[c] || c}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-404 block mb-1">Harga (IDR)</label>
                          <input
                            id="admin-p-price"
                            type="number"
                            required
                            min={0}
                            className="w-full bg-white border border-slate-100 text-xs rounded-xl p-3 text-slate-705"
                            value={pPrice}
                            onChange={(e) => setPPrice(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-404 block mb-1">Kuota Slot Pre-Order</label>
                          <input
                            id="admin-p-stock"
                            type="number"
                            required
                            min={0}
                            className="w-full bg-white border border-slate-100 text-xs rounded-xl p-3 text-slate-705"
                            value={pStock}
                            onChange={(e) => setPStock(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-slate-404 block mb-1">Status Ketersediaan</label>
                          <div className="p-3 text-xs bg-slate-50 border border-slate-100 rounded-xl text-slate-500 text-center font-bold">
                            {pStock === 0 ? 'HABIS TERJUAL' : 'OPEN PRE-ORDER'}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-404 block mb-1">URL Sumber Gambar</label>
                        <input
                          id="admin-p-image"
                          type="text"
                          required
                          placeholder="https://images.unsplash.com/..."
                          className="w-full bg-white border border-slate-100 text-xs rounded-xl p-3 text-slate-705"
                          value={pImage}
                          onChange={(e) => setPImage(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-404 block mb-1">Pilihan Gambar Contoh (Klik untuk Autocomplete)</label>
                        <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-pink-50 p-2 rounded-xl bg-white">
                          {PRESET_IMAGES.map((img, idx) => (
                            <button
                              id={`img-preset-${idx}`}
                              key={idx}
                              type="button"
                              onClick={() => setPImage(img.url)}
                              className={`p-2 border rounded-lg text-[10px] font-semibold tracking-wide text-left hover:bg-pink-50 transition-all cursor-pointer truncate ${pImage === img.url ? 'border-pink-300 bg-pink-50/40 text-pink-600' : 'border-slate-100 text-slate-500'}`}
                            >
                              Gambar: {img.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-widest text-slate-404 block mb-1">Deskripsi & Cerita Produk</label>
                        <textarea
                          id="admin-p-description"
                          rows={4}
                          placeholder="Tulis deskripsi mewah dan cerita estetik mengenai produk tumbler ini..."
                          className="w-full bg-white border border-slate-100 text-xs rounded-xl p-3 text-slate-705"
                          value={pDescription}
                          onChange={(e) => setPDescription(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          id="admin-p-cancel"
                          type="button"
                          onClick={() => setProductFormOpen(false)}
                          className="px-4 py-2 hover:text-slate-700 text-xs uppercase font-extrabold text-slate-400 transition-all cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          id="admin-p-submit"
                          type="submit"
                          disabled={actionLoading}
                          className="px-6 py-2.5 bg-gradient-to-r from-pink-400 to-pink-500 text-white text-xs font-semibold tracking-wider uppercase rounded-xl shadow cursor-pointer"
                        >
                          {actionLoading ? 'Menyimpan...' : 'Simpan Produk'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Products Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-pink-50 rounded-2xl overflow-hidden shadow-xs hover:border-pink-100 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="flex gap-4 p-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[8px] uppercase tracking-widest bg-pink-50 text-pink-500 px-2 py-0.5 rounded-full font-extrabold border border-pink-100/30">
                          {categoryLabels[p.category] || p.category}
                        </span>
                        <h4 className="font-bold text-sm text-slate-800 tracking-wide mt-1 truncate">{p.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {p.id}</p>
                        <p className="font-bold text-xs text-rose-500 mt-2">
                          Rp {p.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex justify-between items-center border-t border-slate-50 pt-3">
                      <span className="text-xs text-slate-450 font-light">
                        Sisa Slot: <span className="font-bold text-slate-700">{p.stock} buah</span>
                      </span>
                      <div className="flex gap-1">
                        <button
                          id={`edit-prod-${p.id}`}
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-2 border border-slate-100 hover:border-pink-200 text-slate-550 hover:text-pink-500 rounded-lg bg-slate-50/50 hover:bg-white cursor-pointer transition-all"
                          title="Ubah detail produk"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`del-prod-${p.id}`}
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 border border-slate-100 hover:border-red-200 text-slate-550 hover:text-red-500 rounded-lg bg-slate-50/50 hover:bg-white cursor-pointer transition-all"
                          title="Hapus produk"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMER ORDER ENTRIES */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fade-in">
              {/* Order Filtering Search Utilities */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-pink-50 p-4 rounded-xl shadow-xs">
                
                <div className="relative flex-1 md:max-w-md">
                  <input
                    id="admin-order-search"
                    type="text"
                    placeholder="Cari berdasarkan nama klien, kode, nama tumbler..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:outline-none"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                  <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-slate-300" />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-light whitespace-nowrap">Status:</span>
                    <select
                      id="admin-order-filter-dropdown"
                      className="bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-xs font-semibold uppercase text-slate-600 focus:outline-none focus:bg-white cursor-pointer"
                      value={orderFilter}
                      onChange={(e) => setOrderFilter(e.target.value)}
                    >
                      <option value="All">Semua Transaksi</option>
                      {Object.values(TrackingStatus).map(st => (
                        <option key={st} value={st}>{statusLabels[st] || st}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    id="export-csv-btn"
                    type="button"
                    onClick={exportOrdersToCSV}
                    className="flex items-center gap-1.5 px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-100/50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-3xs"
                    title="Ekspor CSV Laporan Transaksi"
                  >
                    <Download className="w-3.5 h-3.5" /> Ekspor CSV
                  </button>
                </div>
              </div>

              {/* Orders row list */}
              {filteredOrders.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-pink-100 bg-white rounded-2xl">
                  <ShieldAlert className="w-8 h-8 text-pink-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Tidak Ada Transaksi Ditemukan</p>
                  <p className="text-xs font-light text-slate-400 mt-1">
                    Coba sesuaikan kata kunci pencarian atau kriteria filter Anda.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((o) => (
                    <div
                       key={o.id}
                       className="bg-white border border-pink-50 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-pink-100/50 transition-all duration-300"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5">
                            <span className="font-mono text-xs font-bold tracking-widest text-slate-800">
                              {o.order_code}
                            </span>
                            <button
                              id={`copy-admin-code-${o.id}`}
                              type="button"
                              onClick={() => handleCopyOrderCode(o.id, o.order_code)}
                              className="p-1 text-slate-400 hover:text-pink-500 rounded-md transition-all cursor-pointer"
                              title="Salin Kode Lacak"
                            >
                              {copiedOrderId === o.id ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span className="text-xs font-light text-slate-400">
                            {new Date(o.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className={`text-[10px] uppercase font-bold tracking-widest border rounded-full px-2.5 py-0.5 ${o.status === TrackingStatus.COMPLETED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : o.status === TrackingStatus.WAITING_FOR_PAYMENT ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-pink-50 text-pink-500 border-pink-100'}`}>
                            {statusLabels[o.status as TrackingStatus] || o.status}
                          </span>

                          {/* Lightbox Trigger if payment receipt is attached */}
                          {o.payment_receipt ? (
                            <button
                              id={`view-receipt-${o.id}`}
                              type="button"
                              onClick={() => setReceiptLightbox(o.payment_receipt)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-full transition-all font-semibold text-[10px] cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> Bukti Bayar Terlampir 📎
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-full text-[10px] italic">
                              Belum unggah bukti
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-xs">
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block">Pelanggan</span>
                            <span className="font-semibold text-slate-800 block md:mt-0.5">{o.customer_name}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block">WhatsApp</span>
                            <a 
                              href={`https://wa.me/${o.whatsapp}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-emerald-650 hover:underline flex items-center gap-1 md:mt-0.5"
                            >
                              +{o.whatsapp} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block">Total Pembayaran</span>
                            <span className="font-bold text-rose-500 block md:mt-0.5 font-mono">
                              Rp {o.total_price.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-404 block">Produk Pemesanan Jastip</span>
                          <span className="text-xs font-medium text-slate-700">{o.product} <span className="font-bold text-slate-400">x{o.quantity}</span></span>
                        </div>

                        {o.notes && (
                          <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-[11px] font-light text-slate-500">
                            <strong>Catatan Klien:</strong> "{o.notes}"
                          </div>
                        )}

                        {/* Resi & Catatan Sourcing details */}
                        {(o.resi_number || o.admin_notes) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5 pt-2 border-t border-dashed border-slate-100">
                            {o.resi_number && (
                              <div className="text-xs">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Resi Pengiriman Domestik</span>
                                <span className="font-mono font-medium text-slate-850 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-[11px]">{o.resi_number}</span>
                              </div>
                            )}
                            {o.admin_notes && (
                              <div className="text-xs">
                                <span className="text-[9px] uppercase font-bold text-slate-404 block">Catatan Sourcing Admin</span>
                                <p className="text-slate-500 italic text-[11px] truncate" title={o.admin_notes}>"{o.admin_notes}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Dropdown status modifier controller & quick actions */}
                      <div className="border-t border-slate-50 pt-4 md:border-transparent md:pt-0 shrink-0 flex flex-col gap-2 md:-mt-1 md:w-52">
                        <button
                          id={`update-detail-btn-${o.id}`}
                          type="button"
                          onClick={() => openDetailedStatusModal(o)}
                          className="w-full flex items-center justify-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all shadow-3xs cursor-pointer active:scale-98"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Ubah Status & Resi
                        </button>

                        <button
                          id={`quick-whatsapp-btn-${o.id}`}
                          type="button"
                          onClick={() => setWaModalOrder(o)}
                          className="w-full flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all shadow-3xs cursor-pointer active:scale-98"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Notifikasi WhatsApp
                        </button>

                        <button
                          id={`print-invoice-btn-${o.id}`}
                          type="button"
                          onClick={() => setShowInvoiceModalOrder(o)}
                          className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all shadow-3xs cursor-pointer active:scale-98"
                        >
                          <Receipt className="w-3.5 h-3.5 text-pink-500" /> Cetak Struk Belanja
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CLIENT REVIEWS TESTIMONIAL ENTRIES */}
          {activeTab === 'testimonials' && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-base font-semibold text-slate-800">Repositori Ulasan Klien ({testimonials.length})</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonials.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white border border-pink-50 p-6 rounded-2xl flex flex-col justify-between shadow-xs relative"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-0.5 text-amber-400">
                          {[...Array(5)].map((_, idx) => (
                            <span key={idx} className="text-lg">
                              {idx < t.rating ? '★' : '☆'}
                            </span>
                          ))}
                        </div>
                        
                        <button
                          id={`del-review-${t.id}`}
                          onClick={() => handleDeleteTestimonial(t.id)}
                          className="p-1.5 border border-slate-100 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all cursor-pointer"
                          title="Hapus Ulasan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs font-light text-slate-500 leading-normal italic mb-6">
                        "{t.review}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 border-t border-slate-50 pt-4">
                      <img src={t.image} alt={t.customer_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800 leading-tight">{t.customer_name}</h4>
                        <span className="text-[9px] uppercase tracking-widest text-pink-404 font-extrabold block">Penulis Ulasan</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* LIGHTBOX: Payment Proof Snapshot Viewer */}
      {receiptLightbox && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg border border-pink-50 shadow-2xl relative flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-rose-50 pb-3 mb-4 shrink-0">
              <div>
                <span className="text-[10px] tracking-widest font-extrabold text-pink-400 uppercase font-mono">Bukti Transfer Konfirmasi</span>
                <h4 className="text-sm font-bold text-slate-800">Snapshot Kertas Transfer Klien</h4>
              </div>
              <button 
                id="close-lightbox-btn"
                onClick={() => setReceiptLightbox(null)}
                className="text-slate-400 hover:text-rose-500 font-bold uppercase text-[10px] tracking-wider bg-slate-50 border border-slate-100 hover:bg-rose-50 px-3 py-1.5 rounded-full transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 overflow-auto rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-center p-2">
              <img 
                src={receiptLightbox} 
                alt="Bukti Pembayaran Realized" 
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-xs"
              />
            </div>
            
            <div className="mt-4 pt-3 border-t border-rose-50 text-center shrink-0">
              <p className="text-[11px] text-slate-500 font-light">
                Periksa kesesuaian nilai nominal transfer Bank sesuai tagihan pesanan sebelum memperbarui status ke "Pembayaran Berhasil / Diproses".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detailed Tracking Status Modifier (Status + Resi + Notes) */}
      {detailedStatusOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg border border-pink-50 shadow-2xl space-y-6 animate-scale-up">
            <div className="flex justify-between items-center border-b border-rose-50 pb-4">
              <div>
                <span className="text-[10px] tracking-widest font-extrabold text-pink-505 uppercase font-mono">Modul Manajer Sourcing</span>
                <h3 className="text-base font-bold text-slate-850">Ubah Status & Alur Pelacakan</h3>
              </div>
              <button 
                id="close-dst-btn"
                type="button"
                onClick={() => setDetailedStatusOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full border border-slate-100 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleUpdateOrderStatusDetailed} className="space-y-4 text-left">
              <div className="bg-pink-50/25 border border-pink-100/50 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
                <p><strong>Kode Order:</strong> <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-pink-50">{detailedStatusOrder.order_code}</span></p>
                <p><strong>Nama Klien:</strong> {detailedStatusOrder.customer_name}</p>
                <p><strong>Pemesanan:</strong> {detailedStatusOrder.product} ({detailedStatusOrder.quantity}x)</p>
                <p><strong>Total Transfer:</strong> <span className="font-semibold text-rose-500">Rp {detailedStatusOrder.total_price.toLocaleString('id-ID')}</span></p>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Status Pelacakan Aktif</label>
                <select
                  id="modal-dst-status"
                  className="w-full bg-slate-50 border border-slate-100 text-xs font-semibold uppercase rounded-xl p-3 text-slate-705 focus:outline-none focus:bg-white cursor-pointer"
                  value={dstStatus}
                  onChange={(e) => setDstStatus(e.target.value as TrackingStatus)}
                >
                  {Object.values(TrackingStatus).map((st) => (
                    <option key={st} value={st}>
                      {statusLabels[st] || st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Nomor Resi Domestik (Kurir Lokal)</label>
                <input
                  id="modal-dst-resi"
                  type="text"
                  placeholder="Contoh: JNE0194883103 atau JT882039148"
                  className="w-full bg-slate-50 border border-slate-100 text-xs rounded-xl p-3 text-slate-705"
                  value={dstResi}
                  onChange={(e) => setDstResi(e.target.value)}
                />
                <p className="text-[9px] text-slate-404 mt-1">Kosongkan jika paket belum diserahkan ke kurir lokal Indonesia.</p>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Catatan Khusus Tim Sourcing Specialist</label>
                <textarea
                  id="modal-dst-notes"
                  rows={2}
                  placeholder="Contoh: Paket sedang dalam transit menuju Hub Munich atau Barang sudah lulus inspeksi butik."
                  className="w-full bg-slate-50 border border-slate-100 text-xs rounded-xl p-3 text-slate-705"
                  value={dstNotes}
                  onChange={(e) => setDstNotes(e.target.value)}
                />
                <p className="text-[9px] text-slate-404 mt-1">Catatan ini akan tersaji langsung dalam timeline halaman pelacakan klien secara real-time.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  id="modal-dst-cancel"
                  type="button"
                  onClick={() => setDetailedStatusOrder(null)}
                  className="w-1/3 border border-slate-200 text-slate-500 hover:text-slate-700 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer bg-white"
                >
                  Batal
                </button>
                <button
                  id="modal-dst-submit"
                  type="submit"
                  disabled={actionLoading}
                  className="w-2/3 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1 hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Menyimpan...' : 'Perbarui Alur Pelacakan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: WhatsApp Customer Follow-Up Template Generator */}
      {waModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg border border-emerald-50 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-emerald-100 pb-4">
              <div className="text-left">
                <span className="text-[10px] tracking-widest font-extrabold text-emerald-600 uppercase font-mono">Customer Relationship Engine</span>
                <h3 className="text-base font-bold text-slate-800">Templat Hubungi Klien (WhatsApp)</h3>
              </div>
              <button 
                id="close-wa-btn"
                type="button"
                onClick={() => setWaModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full cursor-pointer transition-all"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-4 text-left">
              <p className="text-xs text-slate-505 font-light leading-relaxed">
                Pilih salah satu templat notifikasi siap pakai di bawah ini. Sistem kami akan menyusun pesan kustom secara dinamis sesuai detail pembelian klien dan meluncurkannya ke WhatsApp:
              </p>

              <div className="space-y-3.5">
                {/* Template 1 CARD */}
                <button
                  id="wa-tpl-1"
                  type="button"
                  onClick={() => {
                    let text = `Halo Kak ${waModalOrder.customer_name}! Terima kasih telah melakukan Pre-Order di Jastip byDSI Sourcing Hub 💖. Pesanan Tumbler "${waModalOrder.product}" (Jumlah: ${waModalOrder.quantity} pcs) dengan rincian total Rp ${waModalOrder.total_price.toLocaleString('id-ID')} saat ini berstatus: MENUNGGU PEMBAYARAN.\n\nSilakan lakukan transfer ke rekening resmi kami berikut:\n\n🏦 BANK BCA\n🔢 Rek: 8820129481\n👤 A/n: Jastip byDSI (Devina Sofia)\n\nSetelah melakukan pembayaran, kakak bisa langsung mengunggah bukti snapshot transfer di web kami secara instan untuk verifikasi prioritas!\nKode Referensi: ${waModalOrder.order_code}`;
                    window.open(`https://api.whatsapp.com/send?phone=${waModalOrder.whatsapp.replace(/\D/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="w-full border border-slate-100 bg-slate-50/50 hover:border-emerald-200 hover:bg-emerald-50/20 p-4 rounded-2xl transition-all cursor-pointer text-left space-y-1 block hover:-translate-y-0.5 duration-200"
                >
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" /> 1. Pemberitahuan Tagihan Pembayaran
                  </p>
                  <p className="text-[10px] text-slate-404 font-mono">Skenario: Klien baru melakukan reservasi pre-order tapi belum transfer / kirim bukti bayar.</p>
                </button>

                {/* Template 2 CARD */}
                <button
                  id="wa-tpl-2"
                  type="button"
                  onClick={() => {
                    let text = `Halo Kak ${waModalOrder.customer_name}! Kabar gembira dari Germany 🇩🇪, pesanan tumbler "${waModalOrder.product}" Anda telah berhasil dibeli dari butik resmi oleh Sourcing Specialist byDSI! Saat ini produk sedang disiapkan di Sourcing Hub Munich untuk dikirim via kargo udara ke Indonesia.\n\nPantau terus update status perolehan Anda dengan memasukkan kode lacak: ${waModalOrder.order_code} di web Jastip byDSI. Terima kasih atas kepercayaan kakak! 💖`;
                    window.open(`https://api.whatsapp.com/send?phone=${waModalOrder.whatsapp.replace(/\D/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="w-full border border-slate-100 bg-slate-50/50 hover:border-emerald-200 hover:bg-emerald-50/20 p-4 rounded-2xl transition-all cursor-pointer text-left space-y-1 block hover:-translate-y-0.5 duration-200"
                >
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" /> 2. Konfirmasi Sourcing Hub Munich (Ready)
                  </p>
                  <p className="text-[10px] text-slate-404 font-mono">Skenario: Sourcing specialist sukses mengamankan produk asli dari butik Jerman / luar negeri.</p>
                </button>

                {/* Template 3 CARD */}
                <button
                  id="wa-tpl-3"
                  type="button"
                  onClick={() => {
                    let text = `Halo Kak ${waModalOrder.customer_name}! Kabar gembira 🥳, pesanan tumbler "${waModalOrder.product}" Anda kini telah tiba di Indonesia dan diserahterimakan ke kurir logistik domestik.\n\n📦 Nomor Resi Pengiriman: ${waModalOrder.resi_number || 'Sedang Diproses'}\n\nKakak bisa melacak posisi kurir lokal dengan nomor resi tersebut. Terima kasih telah berbelanja di Jastip byDSI, ditunggu ulasan cantiknya ya kak! 💕`;
                    window.open(`https://api.whatsapp.com/send?phone=${waModalOrder.whatsapp.replace(/\D/g, '')}&text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="w-full border border-slate-100 bg-slate-50/50 hover:border-emerald-200 hover:bg-emerald-50/20 p-4 rounded-2xl transition-all cursor-pointer text-left space-y-1 block hover:-translate-y-0.5 duration-200"
                >
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5" /> 3. Kabar Pengiriman Domestik & Paket Resi
                  </p>
                  <p className="text-[10px] text-slate-404 font-mono">Skenario: Paket tumbler sudah lolos bea cukai RI dan diserahkan ke logistik nasional beserta No. Resi.</p>
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 font-light leading-relaxed text-left">
                  <strong>Pemberitahuan:</strong> Memilih tombol di atas akan membuka WhatsApp Web / Aplikasi WhatsApp secara otomatis dengan nomor penerima dan draf teks yang terisi rapi.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN ELEGAN E-STRUK BELANJA & INVOICE */}
      {showInvoiceModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in print:bg-white print:p-0 print:absolute print:inset-0">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md border border-slate-100 shadow-2xl relative space-y-6 animate-scale-up print:border-none print:shadow-none print:p-0">
            {/* Header Actions */}
            <div className="flex justify-between items-center pb-3 border-b border-rose-50 print:hidden">
              <div className="text-left">
                <span className="text-[9px] tracking-widest font-extrabold text-pink-500 uppercase font-mono font-bold">Boutique Receipt Engine</span>
                <h3 className="text-sm font-bold text-slate-800">Pratinjau Struk untuk Admin</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="print-admin-struk-btn"
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-100/50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak
                </button>
                <button
                  id="close-admin-struk-btn"
                  type="button"
                  onClick={() => setShowInvoiceModalOrder(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full border border-slate-100 transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Receipt Thermal/Paper Visual Representation */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 font-mono text-xs text-slate-700 shadow-3xs relative overflow-hidden print:bg-white print:border-none">
              {/* Decorative Jagged Receipt Top */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-radial from-slate-200 to-transparent bg-[length:10px_6px] bg-repeat-x print:hidden"></div>
              
              <div className="space-y-4 pt-1">
                {/* Brand Logo & Location */}
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-850 tracking-wider">★ JASTIP byDSI ★</h4>
                  <p className="text-[10px] text-slate-400 font-light leading-none">PREMIUM SOURCING CONCIERGE</p>
                  <p className="text-[9px] text-slate-400 uppercase">Munich Hub (DE) • Jakarta Sorting (ID)</p>
                  <p className="text-[9px] text-slate-405 italic">WhatsApp: +62 822-1111-2222 (byDSI Support)</p>
                </div>

                <div className="w-full border-t border-dashed border-slate-300 my-2"></div>

                {/* Meta details */}
                <div className="space-y-1 text-[10px] text-slate-600">
                  <div className="flex justify-between">
                    <span>NO. TRACK / INVOICE :</span>
                    <span className="font-semibold">{showInvoiceModalOrder.order_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TANGGAL TRANSAKSI :</span>
                    <span>
                      {new Date(showInvoiceModalOrder.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })} {new Date(showInvoiceModalOrder.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>NAMA KLIEN :</span>
                    <span className="uppercase">{showInvoiceModalOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WHATSAPP :</span>
                    <span>+{showInvoiceModalOrder.whatsapp}</span>
                  </div>
                </div>

                <div className="w-full border-t border-dashed border-slate-300 my-2"></div>

                {/* Item List */}
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-slate-800 text-[10px]">
                    <span className="w-2/3">DESKRIPSI BARANG IMPORED</span>
                    <span className="w-1/3 text-right">TOTAL</span>
                  </div>
                  <div className="w-full border-t border-slate-200"></div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-800">{showInvoiceModalOrder.product}</span>
                      <span className="font-semibold text-slate-800 shrink-0">
                        Rp {showInvoiceModalOrder.total_price.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-404">
                      Spesifikasi: 100% Produk Autentik • Qty: {showInvoiceModalOrder.quantity} x Rp {(showInvoiceModalOrder.total_price / showInvoiceModalOrder.quantity).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                <div className="w-full border-t border-dashed border-slate-300 my-2"></div>

                {/* Subtotals & Taxes */}
                <div className="space-y-1 text-[10px] text-slate-600">
                  <div className="flex justify-between">
                    <span>SUBTOTAL BELANJA :</span>
                    <span>Rp {showInvoiceModalOrder.total_price.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BEA MASUK & IMPORT TAX :</span>
                    <span>Rp 0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SOP & LOGISTICS COURIER :</span>
                    <span>DITANGGUNG BARANG</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PENGIRIMAN LOGISTIK :</span>
                    <span className="text-emerald-600 font-semibold uppercase">GRATIS PROTEKSI</span>
                  </div>

                  <div className="w-full border-t border-slate-200 my-2"></div>

                  <div className="flex justify-between text-xs font-bold text-slate-850">
                    <span>TOTAL BAYAR :</span>
                    <span className="text-rose-600">Rp {showInvoiceModalOrder.total_price.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="w-full border-t border-dashed border-slate-300 my-2"></div>

                {/* PAYMENT STATUS MARK */}
                <div className="text-center py-2 border border-slate-300/50 rounded-xl bg-white/60 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">STATUS STATUS TRANSAKSI</p>
                  {showInvoiceModalOrder.status === TrackingStatus.WAITING_FOR_PAYMENT ? (
                    <span className="text-xs font-extrabold text-amber-500 uppercase font-mono tracking-widest animate-pulse">
                      ● MENUNGGU TRANSFER
                    </span>
                  ) : (
                    <span className="text-xs font-extrabold text-emerald-600 uppercase font-mono tracking-widest">
                      ✔ LUNAS & BERHASIL DIVERIFIKASI
                    </span>
                  )}
                  <p className="text-[8px] text-slate-404 font-light">Metode: Bank BCA Virtual / Manual (byDSI Trust)</p>
                </div>

                {/* Mock Barcode Pattern */}
                <div className="text-center space-y-1.5 pt-2">
                  <p className="font-mono text-slate-400 tracking-[-0.05em] text-xs leading-none select-none opacity-80">
                    ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
                  </p>
                  <p className="text-[8px] text-slate-450 tracking-widest font-mono">
                    **{showInvoiceModalOrder.order_code}**
                  </p>
                </div>

                {/* Footer Signature Note */}
                <div className="text-center pt-2 space-y-1">
                  <p className="text-[8px] text-slate-404 leading-normal italic">
                    "Semua barang yang disediakan adalah asli (100% genuine) hasil kurasi butik resmi di Munich, Jerman / USA. Dilengkapi jaminan pabean PMK."
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 font-mono mt-1">
                    Petugas Shopper: Devina Sofia
                  </p>
                </div>
              </div>
            </div>

            {/* Print Note Info */}
            <p className="text-[10px] text-slate-400 font-light text-center print:hidden">
              Gunakan opsi <strong>Cetak / Simpan</strong> untuk mengunduh struk ini sebagai file PDF resmi atau mencetaknya ke printer kasir/kertas domestik.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
