/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Sparkles, Filter, ChevronRight, Database, AlertCircle, CheckCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { Product, CategoryType, categoryLabels } from '../types';

interface ProductCatalogProps {
  onSelectItem: (item: Product) => void;
}

const CATEGORIES: (CategoryType | 'All')[] = ['All', 'Stanley', 'Gift Set', 'Limited Edition', 'Tumbler Accessories'];

const CATEGORY_TABS_MAP: Record<CategoryType | 'All', string> = {
  'All': 'Semua',
  'Stanley': 'Stanley',
  'Gift Set': 'Paket Hadiah',
  'Limited Edition': 'Edisi Terbatas',
  'Tumbler Accessories': 'Aksesoris'
};

export default function ProductCatalog({ onSelectItem }: ProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [diagInfo, setDiagInfo] = useState<any>(null);
  const [checkingDiag, setCheckingDiag] = useState(false);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [seedingText, setSeedingText] = useState('');

  const checkDiagnostics = async () => {
    setCheckingDiag(true);
    try {
      const res = await fetch('/api/db-diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagInfo(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setDiagInfo({
          isSupabaseEnabled: false,
          supabaseConnectionStatus: 'error',
          supabaseError: errData.error || `HTTP ${res.status} error`,
          fallbackToSqlite: true,
          sqliteType: 'none',
          catalogCount: 0,
          apiFailed: true
        });
      }
    } catch (err: any) {
      console.error('Error fetching db diagnostics:', err);
      setDiagInfo({
        isSupabaseEnabled: false,
        supabaseConnectionStatus: 'error',
        supabaseError: err?.message || String(err),
        fallbackToSqlite: true,
        sqliteType: 'none',
        catalogCount: 0,
        apiFailed: true
      });
    } finally {
      setCheckingDiag(false);
    }
  };

  const handleManualSeed = async () => {
    setSeedingLoading(true);
    setSeedingText('Sedang menanam data (seeding)...');
    try {
      const res = await fetch('/api/db-seed', { method: 'POST' });
      if (res.ok) {
        setSeedingText('✨ Berhasil! Data jastip, testimoni & admin telah terisi.');
        setTimeout(() => {
          fetchProducts();
          setDiagInfo(null);
          setSeedingText('');
        }, 1800);
      } else {
        setSeedingText('Gagal menanam data. Pastikan semua tabel sudah dibuat di Supabase.');
      }
    } catch (err) {
      setSeedingText('Error saat menanam data.');
    } finally {
      setSeedingLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedCategory !== 'All') {
        queryParams.append('category', selectedCategory);
      }
      if (search.trim() !== '') {
        queryParams.append('search', search);
      }
      const res = await fetch(`/api/products?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Error fetching boutique products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProducts();
    }, 400); // Debounce typing searches
    return () => clearTimeout(delayDebounce);
  }, [selectedCategory, search]);

  useEffect(() => {
    checkDiagnostics();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="text-center mb-10">
        <span className="text-[10px] tracking-[0.3em] font-bold text-pink-400 uppercase block mb-1">Koleksi Pilihan Istimewa</span>
        <h2 className="text-3xl font-extralight tracking-widest text-slate-800 uppercase mb-2">Katalog Kurasi Kami</h2>
        <div className="w-16 h-0.5 bg-pink-300 mx-auto mb-4"></div>
        <p className="text-xs font-light text-slate-500 max-w-md mx-auto">
          Jelajahi koleksi tumbler Stanley original pilihan, paket hadiah cantik, dan aksesoris personal berkualitas tinggi.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white border border-pink-50 p-4 rounded-2xl shadow-sm">
        {/* Category Tabs */}
        <div className="flex gap-2 p-1 bg-pink-50/50 rounded-xl overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              id={`cat-btn-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${selectedCategory === cat ? 'bg-white text-pink-500 shadow-sm border border-pink-100/30' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {CATEGORY_TABS_MAP[cat]}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative md:w-80">
          <input
            id="catalog-search-input"
            type="text"
            placeholder="Cari produk di butik kami..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-pink-300 focus:bg-white transition-all text-slate-700 placeholder-slate-300 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-slate-300" />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-pink-300 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-light text-slate-400 tracking-wider">Membuka katalog butik...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="w-full max-w-lg mx-auto space-y-6">
          <div className="text-center py-12 bg-white border border-dashed border-pink-100 rounded-3xl p-8 shadow-xs">
            <Sparkles className="w-8 h-8 text-pink-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Kurasi Tidak Ditemukan</p>
            <p className="text-xs font-light text-slate-400 mt-2">
              Coba sesuaikan kata kunci pencarian Anda atau lihat kategori butik yang lain.
            </p>
          </div>

          {/* Database Setup Diagnostics Helper Block – ALWAYS VISIBLE ON EMPTY STATE */}
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-650 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/55">
              <span className="font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2 text-[10px]">
                <Database className="w-4 h-4 text-pink-400" /> Diagnosis Status Database Jastip
              </span>
              {checkingDiag ? (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Memeriksa...
                </span>
              ) : (
                <span className={`px-2 py-0.5 rounded-full text-[8.5px] uppercase tracking-wider font-bold ${
                  diagInfo && (diagInfo.isFirebaseEnabled || (diagInfo.isSupabaseEnabled && !diagInfo.fallbackToSqlite))
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}>
                  {diagInfo ? ((diagInfo.isFirebaseEnabled || (diagInfo.isSupabaseEnabled && !diagInfo.fallbackToSqlite)) ? 'Cloud Live Aktif' : 'Simulator Aktif') : 'Status tidak diketahui'}
                </span>
              )}
            </div>

            {checkingDiag && !diagInfo && (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400 text-[11px] font-light">
                <RefreshCw className="w-4 h-4 animate-spin text-pink-400" />
                <p>Menghubungi server diagnostics...</p>
              </div>
            )}

            {diagInfo && (
              <div className="space-y-4">
                {/* CASE 1: Cloud Database configured and healthy but empty database */}
                {(diagInfo.isFirebaseEnabled || diagInfo.isSupabaseEnabled) && diagInfo.supabaseConnectionStatus === 'connected_and_healthy' && diagInfo.catalogCount === 0 && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-slate-600 leading-relaxed font-light">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-900 text-[11px] uppercase tracking-wider">Katalog di Cloud Masih Kosong</p>
                        <p className="mt-1">Koneksi ke database cloud {diagInfo.isFirebaseEnabled ? 'Firebase Firestore' : 'Supabase'} sukses <strong>terhubung & sehat!</strong> Namun saat ini belum ada data produk sama sekali di tabel Anda.</p>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-slate-100/50 space-y-3">
                      <p className="text-[10px] text-slate-400 font-light">
                        Gunakan tombol di bawah ini untuk mengisi (seed) produk-produk Stanley, paket kado, dan testimoni bawaan ke database cloud Anda dalam 1 detik:
                      </p>
                      
                      <button
                        id="btn-seed-supabase-direct"
                        disabled={seedingLoading}
                        onClick={handleManualSeed}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 disabled:opacity-50 text-white font-bold tracking-wider uppercase text-[10px] rounded-lg cursor-pointer transition-all shadow-sm"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${seedingLoading ? 'animate-spin' : ''}`} />
                        Isi Data Awal Otomatis (Seed Database)
                      </button>
                      
                      {seedingText && (
                        <p className="text-[10px] text-center text-pink-500 font-semibold animate-pulse">{seedingText}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* CASE 2: Cloud Database configured, but connection throws error */}
                {(diagInfo.isFirebaseEnabled || diagInfo.isSupabaseEnabled) && (diagInfo.supabaseConnectionStatus === 'error' || diagInfo.supabaseConnectionStatus === 'error_exception') && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-slate-600 leading-relaxed font-light">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-900 text-[11px] uppercase tracking-wider">Skema Database Cloud Belum Siap</p>
                        <p className="mt-1 text-[11px]">Kredensial terdeteksi, namun query gagal karena <strong>tabel/dokumen belum siap</strong> di dashboard database cloud Anda.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Detail error: {diagInfo.supabaseError}</p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3 text-[10.5px]">
                      <p className="font-semibold text-slate-800">Cara mengatasinya:</p>
                      <p className="text-slate-500 font-light leading-relaxed">
                        Jika menggunakan Supabase, Anda dapat mengimpor file <code className="bg-slate-150 px-1 py-0.5 rounded text-pink-500 font-mono text-[9.5px]">supabase_schema.sql</code> di SQL Editor Supabase Anda. Jika menggunakan Firebase, pastikan keamanan rules dideploy.
                      </p>
                      
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          id="btn-seed-retry"
                          disabled={seedingLoading}
                          onClick={handleManualSeed}
                          className="flex items-center justify-center gap-1 text-[9.5px] uppercase tracking-wider text-pink-500 font-bold border border-pink-200/50 hover:bg-pink-50 p-2 rounded-lg cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${seedingLoading ? 'animate-spin' : ''}`} /> Selesai Mengonfigurasi, Coba Sinkronkan Sekarang
                        </button>
                      </div>
                      {seedingText && (
                        <p className="text-[9.5px] text-pink-500 font-semibold">{seedingText}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* CASE 3: Cloud Database is NOT enabled yet, using local Simulator */}
                {!diagInfo.isFirebaseEnabled && !diagInfo.isSupabaseEnabled && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-slate-500 leading-relaxed font-light">
                      <HelpCircle className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">{diagInfo.apiFailed ? "Gagal Terhubung ke API Layanan" : "Mode Demo / Simulator Aktif"}</p>
                        <p className="mt-1 text-[11px]">
                          {diagInfo.apiFailed 
                            ? "Server backend tidak merespons diagnostics (mungkin sedang dimulai ulang). Sistem saat ini dijalankan menggunakan fail-safe in-memory simulator." 
                            : "Sistem mendeteksi bahwa database cloud belum dihubungkan, sehingga sistem berjalan menggunakan Simulator In-Memory."}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-2">
                      <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                        Klik tombol di bawah untuk mengisi (seed) data demo produk agar visual katalog jastip Anda bisa muncul dan dapat diuji seketika:
                      </p>
                      <button
                        id="btn-seed-simulator"
                        disabled={seedingLoading}
                        onClick={handleManualSeed}
                        className="w-full py-2 bg-pink-400 hover:bg-pink-500 text-white font-bold uppercase tracking-wider text-[9px] rounded-lg cursor-pointer transition-all shadow-sm"
                      >
                        {seedingLoading ? "Mengisi data..." : "Isi Data Demo Sekarang ✨"}
                      </button>
                      
                      <button
                        onClick={checkDiagnostics}
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 uppercase tracking-wider text-[8px] rounded-md transition-all mt-1"
                      >
                        Muat Ulang Status Diagnosis 🔄
                      </button>
                      
                      {seedingText && (
                        <p className="text-[9.5px] text-center text-pink-500 font-semibold mt-1">{seedingText}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* CASE 4: Cloud Database configured, healthy, and HAS products */}
                {(diagInfo.isFirebaseEnabled || diagInfo.isSupabaseEnabled) && diagInfo.supabaseConnectionStatus === 'connected_and_healthy' && diagInfo.catalogCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-slate-600 leading-relaxed font-light">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-950 text-[11px] uppercase tracking-wider">Koneksi & Data Cloud Sehat! ✨</p>
                        <p className="mt-1 text-[11px]">
                          Penyimpanan cloud {diagInfo.isFirebaseEnabled ? 'Firebase Firestore' : 'Supabase'} aktif dan berhasil memuat <strong>{diagInfo.catalogCount} produk</strong> dengan lancar.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!diagInfo && !checkingDiag && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-slate-500 leading-relaxed font-light">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider">Kesulitan Memperoleh Diagnosis Otomatis</p>
                    <p className="mt-1 text-[11.5px]">Backend server tidak dapat menjawab kueri diagnosis (Kemungkinan file server tidak aktif atau database cloud Anda mengalami downtime).</p>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-bold text-slate-700">Tindakan Mandiri Pemulihan:</p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[10px] font-light leading-relaxed">
                    <li>Gunakan tombol di bawah ini untuk mengirimkan kueri penanaman data demo awal secara langsung.</li>
                    <li>Pastikan Anda sudah mengonfigurasi variabel lingkungan di project hosting Anda (<code className="bg-slate-100 text-pink-500 px-1 rounded text-[9px]">SUPABASE_URL</code> dan <code className="bg-slate-100 text-pink-500 px-1 rounded text-[9px]">SUPABASE_ANON_KEY</code>).</li>
                    <li>Import skrip di file <code className="bg-slate-150 text-slate-600 px-1 rounded text-[9px]">supabase_schema.sql</code> di editor Supabase SQL Anda agar semua tabel fungsional terbentuk.</li>
                  </ul>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      id="btn-direct-diagnostics-retry"
                      onClick={checkDiagnostics}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[9px] rounded-lg cursor-pointer transition-all"
                    >
                      Coba Lagi Diagnosis 🔄
                    </button>
                    <button
                      id="btn-direct-diagnostics-seed"
                      disabled={seedingLoading}
                      onClick={handleManualSeed}
                      className="flex-1 py-2 bg-pink-400 hover:bg-pink-500 text-white font-bold uppercase tracking-wider text-[9px] rounded-lg cursor-pointer transition-all"
                    >
                      Kirim Kueri Seeding Paksa ✨
                    </button>
                  </div>
                  {seedingText && (
                    <p className="text-[9.5px] text-center text-pink-500 font-semibold mt-1">{seedingText}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((p) => (
            <div
              key={p.id}
              className="group bg-white rounded-2xl overflow-hidden border border-pink-50 hover:border-pink-100/70 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              {/* Image Container with Hover Zoom */}
              <div className="relative overflow-hidden aspect-square bg-slate-50">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 flex gap-1.5 flex-col">
                  {/* Category Pill */}
                  <span className="text-[9px] uppercase font-bold tracking-widest bg-white/90 backdrop-blur-xs text-slate-700 px-2.5 py-1 rounded-full border border-slate-100/50 shadow-sm">
                    {categoryLabels[p.category] || p.category}
                  </span>
                  
                  {/* Stock Check Label */}
                  {p.stock === 0 ? (
                    <span className="text-[9px] uppercase font-bold tracking-widest bg-red-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                      Habis Terjual
                    </span>
                  ) : p.stock <= 3 ? (
                    <span className="text-[9px] uppercase font-bold tracking-widest bg-amber-500 text-white px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                      Sisa {p.stock} Slot!
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase font-bold tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full shadow-sm">
                      Open PO / Pre-Order
                    </span>
                  )}
                </div>
              </div>

              {/* Product Info Card */}
              <div className="p-6 flex flex-col flex-1 justify-between">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-slate-800 tracking-wide line-clamp-1 mb-1">{p.name}</h3>
                  <p className="text-[11px] font-light text-slate-400 tracking-normal line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div>
                  <div className="flex items-baseline justify-between border-t border-slate-50 pt-4 mt-2">
                    <span className="text-xs font-light text-slate-400">Harga Eksklusif</span>
                    <span className="text-lg font-bold text-slate-800 tracking-wide">
                      Rp {p.price.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <button
                    id={`order-btn-${p.id}`}
                    disabled={p.stock === 0}
                    onClick={() => onSelectItem(p)}
                    className={`w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-xs uppercase font-semibold tracking-wider transition-all duration-300 cursor-pointer ${p.stock === 0 ? 'bg-slate-100 text-slate-400 border border-slate-100 cursor-not-allowed' : 'bg-pink-100/10 text-pink-600 border border-pink-200/50 hover:bg-gradient-to-r hover:from-pink-400 hover:to-pink-500 hover:text-white hover:border-transparent hover:shadow-sm'}`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    {p.stock === 0 ? 'Fully Reserved' : 'Secure Pre-Order'}
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Database Setup Diagnostics Helper Block – ALWAYS VISIBLE WHEN DATABASE IN FALLBACK MODE */}
      {products.length > 0 && diagInfo?.fallbackToSqlite && (
        <div className="mt-12 p-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs text-slate-650 shadow-xs max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/55">
            <span className="font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2 text-[10px]">
              <Database className="w-4 h-4 text-pink-400" /> Status Koneksi Database Jastip
            </span>
            <span className="px-2 py-0.5 rounded-full text-[8.5px] uppercase tracking-wider font-bold bg-amber-50 text-amber-600 border border-amber-100">
              Mode Cadangan Aktif
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2 text-slate-600 leading-relaxed font-light">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-[11px] uppercase tracking-wider">Berjalan Menggunakan Database Cadangan (SQLite)</p>
                <p className="mt-1 text-[11px]">Sistem mendeteksi kegagalan koneksi kueri ke cloud database Supabase Anda, sehingga penyimpanan dialihkan otomatis ke SQLite/Simulator lokal agar website tetap fungsional.</p>
                <p className="text-[10px] text-slate-400 mt-1">Detail error: {diagInfo.supabaseError || "Koneksi tidak terhubung"}</p>
              </div>
            </div>

            <details className="group bg-white p-4 rounded-xl border border-slate-100 space-y-2">
              <summary className="cursor-pointer text-[10px] text-pink-500 font-bold uppercase tracking-wider select-none list-none flex items-center justify-between hover:text-pink-600 transition-all">
                <span>Panduan Sinkronisasi & Deploy Database Cloud Supabase 🛠️</span>
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              
              <div className="space-y-3 text-[10.5px] mt-3 pt-3 border-t border-slate-50">
                <p className="font-semibold text-slate-800">Langkah Membuat Tabel di Supabase:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-500 font-light leading-relaxed">
                  <li>Buka <strong>dashboard Supabase Anda</strong>.</li>
                  <li>Masuk ke menu <strong>SQL Editor</strong> di panel bilah navigasi kiri.</li>
                  <li>Salin seluruh kode dari file <code className="bg-slate-100 px-1 py-0.5 rounded text-pink-500 font-mono text-[9px]">supabase_schema.sql</code> di folder root proyek ini.</li>
                  <li>Tempel (paste) ke <strong>SQL Editor Supabase</strong> Anda.</li>
                  <li>Klik tombol <strong>Run</strong> di kanan bawah untuk membuat tabel sekaligus menyiapkan data awal (admin seed).</li>
                </ol>
                
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 mb-2">Setelah Anda menjalankan SQL di Supabase, Anda bisa langsung menekan tombol berikut untuk melakukan pengisian data awal jastip:</p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={checkDiagnostics}
                      disabled={seedingLoading}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[9px] rounded-lg cursor-pointer transition-all"
                    >
                      BACA ULANG STATUS 🔄
                    </button>
                    <button
                      disabled={seedingLoading}
                      onClick={handleManualSeed}
                      className="flex-1 py-2 bg-pink-400 hover:bg-pink-500 text-white font-bold uppercase tracking-wider text-[9px] rounded-lg cursor-pointer transition-all disabled:opacity-50"
                    >
                      {seedingLoading ? "SEDANG MENGISI..." : "ISI DUA DETIK (SEED CLOUD DATABASE) ✨"}
                    </button>
                  </div>
                </div>
                {seedingText && (
                  <p className="text-[10px] text-center text-pink-500 font-semibold mt-1 animate-pulse">{seedingText}</p>
                )}
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
