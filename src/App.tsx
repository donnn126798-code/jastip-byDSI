/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Instagram, MessageCircle, ShoppingBag, Sparkles, Phone, ArrowUpRight, 
  MapPin, Clock, CreditCard, Lock, Menu, X, ShieldAlert, Eye, EyeOff, Database
} from 'lucide-react';
import ProductCatalog from './components/ProductCatalog';
import OrderForm from './components/OrderForm';
import TrackOrder from './components/TrackOrder';
import TestimonialsSection from './components/TestimonialsSection';
import AdminPanel from './components/AdminPanel';
import { Product } from './types';
import LoadingScreen from './components/LoadingScreen';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [appLoading, setAppLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'products' | 'track' | 'testimonials' | 'contact' | 'admin' | 'checkout'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Sourced states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [trackCode, setTrackCode] = useState('');
  
  // Admin Auth States
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('dsi_admin_token'));
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{ isSupabaseEnabled: boolean; fallbackToSqlite: boolean } | null>(null);

  // Check Database status on mount
  useEffect(() => {
    fetch('/api/db-status')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => setDbStatus(data))
      .catch((e) => console.warn('Failed to fetch API database status:', e));
  }, []);

  // Auto Scroll to Top on Tab switch & protect sensitive states from crawlers
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileMenuOpen(false);

    // Dynamic SEO crawl control target
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    
    // Protect admin panel, track state, and checkout tabs from search engines
    if (activeTab === 'admin' || activeTab === 'checkout' || activeTab === 'track') {
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    } else {
      robotsMeta.setAttribute('content', 'index, follow');
    }
  }, [activeTab]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) return;

    setAdminLoading(true);
    setAdminError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername.trim(), password: adminPassword })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Nama admin atau kata sandi salah');
      }

      const data = await res.json();
      setAdminToken(data.token);
      localStorage.setItem('dsi_admin_token', data.token);
      setAdminUsername('');
      setAdminPassword('');
    } catch (err: any) {
      setAdminError(err.message || 'Data login tidak sesuai');
    } finally {
      setAdminLoading(false);
    }
  };

  const navLinks = [
    { key: 'home', label: 'Beranda' },
    { key: 'products', label: 'Katalog Pre-Order' },
    { key: 'track', label: 'Lacak Pesanan' },
    { key: 'testimonials', label: 'Ulasan Pelanggan' },
    { key: 'contact', label: 'Kontak WhatsApp' }
  ] as const;

  return (
    <>
      <AnimatePresence mode="wait">
        {appLoading && (
          <LoadingScreen onComplete={() => setAppLoading(false)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: appLoading ? 0 : 1, scale: appLoading ? 0.985 : 1 }}
        transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }} // Elegant delayed fade-scale entry as curtain lifts
        className="min-h-screen bg-slate-50/20 text-slate-800 flex flex-col font-sans selection:bg-pink-100 selection:text-pink-600"
      >
      
      {/* Decorative Top Accent line */}
      <div className="h-1 bg-gradient-to-r from-pink-300 via-pink-400 to-pink-300 w-full"></div>

      {/* Boutique Floating WhatsApp Button */}
      <a
        href="https://wa.me/6285649059650"
        target="_blank"
        rel="noopener noreferrer"
        title="Hubungi Personal Shopper via WhatsApp"
        className="fixed bottom-6 right-6 z-50 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-4 hover:scale-105 transition-all shadow-lg flex items-center justify-center cursor-pointer group"
      >
        <MessageCircle className="w-6 h-6 animate-pulse" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 text-xs uppercase font-extrabold tracking-wider whitespace-nowrap">
          Personal Shopper
        </span>
      </a>

      {/* MAIN HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-pink-50 shadow-xs">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          
          {/* Brand Logo Text */}
          <button 
            id="brand-logo-btn"
            onClick={() => setActiveTab('home')} 
            className="flex items-center gap-2 cursor-pointer outline-none select-none text-left"
          >
            <div className="w-9 h-9 bg-pink-100 rounded-full flex items-center justify-center border border-pink-200/50">
              <Sparkles className="w-4 h-4 text-pink-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-none tracking-tight">Jastip byDSI</h1>
              <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-pink-404">Kurasi Premium</span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                id={`nav-${link.key}`}
                key={link.key}
                onClick={() => setActiveTab(link.key)}
                className={`text-xs uppercase tracking-widest font-semibold pb-1 border-b-2 transition-all cursor-pointer ${activeTab === link.key ? 'border-pink-400 text-pink-500 font-bold' : 'border-transparent text-slate-500 hover:text-slate-850'}`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Checkout CTA */}
          <div className="hidden md:flex items-center gap-4">
            <button
              id="header-cta-btn"
              onClick={() => {
                setSelectedProduct(null);
                setActiveTab('checkout');
              }}
              className="bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white rounded-full px-6 py-2.5 text-xs uppercase font-semibold tracking-wider cursor-pointer shadow-sm transition-all"
            >
              Order Jastip
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            id="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-500 hover:text-pink-500 transition-all cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-pink-50 animate-fade-in divide-y divide-slate-50">
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <button
                  id={`mobile-nav-${link.key}`}
                  key={link.key}
                  onClick={() => setActiveTab(link.key)}
                  className={`block w-full text-left py-2.5 text-xs uppercase tracking-widest font-semibold ${activeTab === link.key ? 'text-pink-500 font-bold' : 'text-slate-500'}`}
                >
                  {link.label}
                </button>
              ))}
              <button
                id="mobile-nav-checkout"
                onClick={() => {
                  setSelectedProduct(null);
                  setActiveTab('checkout');
                }}
                className="w-full bg-pink-400 text-white font-semibold text-center py-3 text-xs uppercase tracking-widest rounded-xl shadow cursor-pointer block"
              >
                Order Jastip
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTAINER CONTENT */}
      <main className="flex-1">

        {/* ACTIVE TAB: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-16 pb-16 animate-fade-in">
            {/* 1. HERO BANNER */}
            <section className="relative overflow-hidden bg-gradient-to-b from-pink-50/50 via-white to-transparent py-20 md:py-28">
              <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                
                <div className="space-y-6">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-pink-100/40 text-pink-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-pink-200/40">
                    <Sparkles className="w-3.5 h-3.5" /> Layanan Personal Shopper Butik
                  </span>
                  <div className="space-y-1">
                    <span className="text-[12px] uppercase font-bold tracking-[0.4em] text-pink-400 block mb-1">Jastip byDSI</span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-extralight tracking-tight text-slate-800 leading-tight">
                      Layanan Jastip Premium & Personal Shopper Tumbler
                    </h2>
                  </div>
                  <p className="text-sm font-light text-slate-500 leading-relaxed max-w-lg">
                    Menghadirkan layanan kurasi terbaik untuk para kolektor tumbler dan pencinta hadiah premium di Indonesia. Kami menyediakan Stanley Quencher autentik, koleksi edisi terbatas, set hadiah musiman, dan aksesori premium yang diimpor langsung dari pemasok resmi di Amerika Serikat dan mancanegara.
                  </p>
                  
                  <div className="flex flex-wrap gap-3.5 pt-4">
                    <button
                      id="hero-shop-now-btn"
                      onClick={() => setActiveTab('products')}
                      className="bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white rounded-xl px-7 py-4 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
                    >
                      <ShoppingBag className="w-4 h-4" /> Lihat Katalog Koleksi
                    </button>
                    <button
                      id="hero-track-btn"
                      onClick={() => setActiveTab('track')}
                      className="bg-white border border-pink-100 hover:border-pink-300 text-pink-500 rounded-xl px-7 py-4 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                    >
                      Lacak Pengiriman Saya
                    </button>
                  </div>
                </div>

                <div className="relative flex justify-center">
                  <div className="w-80 h-80 sm:w-96 sm:h-96 rounded-3xl overflow-hidden shadow-2xl border-4 border-white rotate-1 md:rotate-2 hover:rotate-0 transition-all duration-500">
                    <img 
                      src="/hero_pink_tumbler.png" 
                      alt="Premium Stanley Pink Quencher" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {/* Floating visual tags */}
                  <div className="absolute -top-4 -left-4 bg-white/95 backdrop-blur-xs p-4 rounded-2xl shadow-lg border border-pink-50 text-slate-705 max-w-xs">
                    <p className="text-[10px] uppercase font-bold text-pink-400 tracking-widest">Sourcing Pre-Order</p>
                    <p className="text-sm font-semibold mt-0.5">Stanley Quencher Pastel</p>
                    <span className="text-[10px] text-emerald-600 font-bold">● Periode PO Sedang Aktif</span>
                  </div>
                </div>

              </div>
            </section>

            {/* 2. BRAND INTRODUCTION */}
            <section className="w-full max-w-7xl mx-auto px-4 sm:px-6">
              <div className="bg-white border border-pink-50 p-8 md:p-12 rounded-3xl shadow-sm text-center max-w-4xl mx-auto">
                <span className="text-[11px] uppercase tracking-[0.3em] font-extrabold text-pink-400">Kurasi Jastip Eksklusif</span>
                <h3 className="text-2xl font-light tracking-widest uppercase text-slate-800 mt-2 mb-4">Bukan Sekadar Marketplace, Sentuhan Personal yang Utama</h3>
                <div className="w-12 h-0.5 bg-pink-300 mx-auto mb-6"></div>
                <p className="text-xs font-light text-slate-500 leading-relaxed max-w-2xl mx-auto mb-8">
                  Berbeda dengan toko reseller massal atau toko online biasa, <strong>Jastip byDSI</strong> menawarkan layanan kurator personal yang intim dan premium. Kami tidak menimbun barang secara massal; sebaliknya, kami secara pribadi memeriksa, mengemas, dan mengirimkan setiap produk dengan pita satin mewah, kartu ucapan tulisan tangan, serta jaminan keaslian 100% sebelum dikirim ke Indonesia.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-slate-650 text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800">🇺🇸 Impor Resmi AS & Global</p>
                    <p className="font-light text-[11px] text-slate-400">Keaslian terjamin langsung dari store resmi.</p>
                  </div>
                  <div className="space-y-1 border-t sm:border-t-0 sm:border-x border-pink-100/50 pt-4 sm:pt-0">
                    <p className="font-semibold text-slate-800">📦 Kemasan Pita Mewah</p>
                    <p className="font-light text-[11px] text-slate-400">Dilengkapi pita satin cantik dan kartu ucapan kustom.</p>
                  </div>
                  <div className="space-y-1 border-t sm:border-t-0 pt-4 sm:pt-0">
                    <p className="font-semibold text-slate-800">💬 Layanan Personal Shopper</p>
                    <p className="font-light text-[11px] text-slate-400">Hubungan langsung via WhatsApp untuk setiap progres order.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. FEATURABLE PRESETS SPOTLIGHTS */}
            <section className="w-full max-w-7xl mx-auto px-4 sm:px-6">
              <div className="text-center mb-8">
                <span className="text-[10px] tracking-widest font-extrabold text-pink-400 uppercase">Tampilan Pre-Order Interaktif</span>
                <h3 className="text-2xl font-extralight tracking-widest text-slate-800 uppercase">Kurasi Produk Pilihan</h3>
              </div>
              <ProductCatalog onSelectItem={(p) => { setSelectedProduct(p); setActiveTab('checkout'); }} />
            </section>

            {/* 4. OPEN PO STATUS */}
            <section className="bg-gradient-to-r from-pink-50/40 via-white to-pink-50/20 border-y border-pink-100/40 py-12 text-center">
              <div className="w-full max-w-lg mx-auto px-4 space-y-4">
                <span className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Group PO Batch #28: Aktif
                </span>
                <h3 className="text-xl font-light uppercase tracking-widest text-slate-800">Amankan Kuota Anda Sebelum Ditutup</h3>
                <p className="text-xs font-light text-slate-400">
                  Pendaftaran Batch ditutup hari Minggu ini. Estimasi kedatangan di Jakarta berkisar antara 14-21 hari setelah pengiriman dikunci dari pusat luar negeri. Pelacakan penuh.
                </p>
                <button
                  id="checkout-active-po-btn"
                  onClick={() => setActiveTab('products')}
                  className="px-6 py-3 bg-pink-400 hover:bg-pink-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Amankan Slot Saya Sekarang
                </button>
              </div>
            </section>

          </div>
        )}

        {/* ACTIVE TAB: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="animate-fade-in py-6">
            <ProductCatalog onSelectItem={(p) => { setSelectedProduct(p); setActiveTab('checkout'); }} />
          </div>
        )}

        {/* ACTIVE TAB: CHECKOUT FORM */}
        {activeTab === 'checkout' && (
          <div className="animate-fade-in">
            <OrderForm 
              selectedProduct={selectedProduct} 
              onBackToCatalog={() => { setSelectedProduct(null); setActiveTab('products'); }} 
              onSetTrackCode={(code) => { setTrackCode(code); setActiveTab('track'); }} 
            />
          </div>
        )}

        {/* ACTIVE TAB: TRACKING SEARCH */}
        {activeTab === 'track' && (
          <div className="animate-fade-in">
            <TrackOrder orderCode={trackCode} />
          </div>
        )}

        {/* ACTIVE TAB: TESTIMONIALS */}
        {activeTab === 'testimonials' && (
          <div className="animate-fade-in py-6">
            <TestimonialsSection />
          </div>
        )}

        {/* ACTIVE TAB: CONTACT */}
        {activeTab === 'contact' && (
          <div className="w-full max-w-4xl mx-auto px-4 py-12 animate-fade-in">
            
            <div className="text-center mb-12">
              <span className="text-[10px] tracking-widest font-extrabold text-pink-400 uppercase">Direktori Butik</span>
              <h2 className="text-3xl font-extralight tracking-widest text-slate-800 uppercase mb-2">Hubungi Sourcing Concierge</h2>
              <div className="w-16 h-0.5 bg-pink-300 mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-12">
              {/* Media Card Left */}
              <div className="bg-white border border-pink-50 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-semibold tracking-wide text-slate-800 uppercase mb-4">Saluran Resmi</h4>
                  <p className="text-xs font-light text-slate-500 leading-relaxed mb-6">
                    Hubungi personal shopper kami secara langsung pada saluran sosial populer untuk melihat video unboxing katalog, perjalanan live di butik Amerika Serikat, kabar rilis terbaru, dan ulasan asli klien kami.
                  </p>
                </div>

                <div className="space-y-4 text-xs font-semibold text-slate-700">
                  <a
                    href="https://wa.me/6285649059650"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-100/50 rounded-2xl transition-all cursor-pointer group"
                  >
                    <span className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-emerald-600" /> WhatsApp Customer Service
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-all">
                      +62 856-4905-9650 <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </a>

                  <a
                    href="https://instagram.com/jastip.bydsi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-pink-50/20 hover:bg-pink-50/40 border border-pink-150/40 rounded-2xl transition-all cursor-pointer group"
                  >
                    <span className="flex items-center gap-3">
                      <Instagram className="w-5 h-5 text-pink-500" /> Instagram Catalog
                    </span>
                    <span className="text-[10px] font-mono font-bold text-pink-500 flex items-center gap-1 group-hover:translate-x-0.5 transition-all">
                      @jastip.bydsi <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </a>

                  <a
                    href="https://tiktok.com/@jastip.bydsi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 rounded-2xl transition-all cursor-pointer group"
                  >
                    <span className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-slate-800" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.63 4.15 1.12 1.15 2.67 1.83 4.25 1.95v3.9c-1.84-.04-3.61-.63-5.07-1.75-.1-.08-.18-.18-.31-.31v6.79c0 1.56-.37 3.12-1.12 4.46-1.55 2.72-4.66 4.31-7.79 3.95-3.56-.41-6.43-3.48-6.66-7.05-.28-4.22 2.87-7.9 7.07-8.23.49-.04 1-.03 1.49.03v3.94c-1.14-.3-2.39-.1-3.38.52-1.25.79-1.92 2.27-1.77 3.73.19 1.82 1.66 3.29 3.48 3.48 1.48.16 2.97-.53 3.75-1.77.46-.74.69-1.58.68-2.44V.02z"/></svg>
                      Eksplor TikTok Feed
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-all">
                      @jastip.bydsi <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </a>
                </div>
              </div>

              {/* Store Details right card */}
              <div className="bg-white border border-pink-50 p-6 md:p-8 rounded-3xl shadow-sm text-xs font-light text-slate-500 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-semibold tracking-wide text-slate-800 uppercase mb-4">Lokasi Pusat Distribusi Resmi</h4>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <MapPin className="w-5 h-5 text-pink-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800">Jakarta Distribution Hub</p>
                        <p className="text-slate-400 mt-0.5">Sudirman Central Business District (SCBD), Tower Premium Suite 12-A, Jakarta Selatan, Indonesia.</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Clock className="w-5 h-5 text-pink-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800">Jam Operasional Layanan</p>
                        <p className="text-slate-400 mt-0.5">Senin – Minggu: 09:00 WIB – 21:00 WIB (Jakarta UTC+7)</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <CreditCard className="w-5 h-5 text-pink-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800">Jaminan Transaksi Aman</p>
                        <p className="text-slate-400 mt-0.5">Mendukung verifikasi transfer bank langsung demi memastikan kepatuhan pajak & bea masuk resmi PMK Indonesia secara aman.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-pink-50/50 pt-5 mt-6">
                  <p className="text-[10px] uppercase font-bold text-pink-400 tracking-widest mb-1">Pertanyaan & Kerjasama</p>
                  <p className="font-bold text-slate-700">hello.dsisourcing@gmail.com</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ACTIVE TAB: SYSTEM LOGIC ADMIN PORTAL CHECK */}
        {activeTab === 'admin' && (
          <div className="w-full py-8">
            {adminToken ? (
              <AdminPanel 
                token={adminToken} 
                onLogout={() => {
                  setAdminToken(null);
                  localStorage.removeItem('dsi_admin_token');
                }} 
              />
            ) : (
              <div className="max-w-md mx-auto px-4 py-8 animate-fade-in">
                <div className="bg-white border border-pink-50 rounded-3xl p-6 md:p-10 shadow-sm text-slate-705">
                   <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-pink-50 border border-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Lock className="w-5 h-5 text-pink-500" />
                    </div>
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-pink-400">Area Terbatas Admin</span>
                    <h2 className="text-xl font-light text-slate-800 tracking-widest mt-1 uppercase">Portal Admin</h2>
                    <div className="w-10 h-0.5 bg-pink-300 mx-auto mt-2"></div>
                  </div>

                  {adminError && (
                    <div className="bg-red-50 text-red-650 border border-red-100 rounded-xl p-4 text-xs mb-6 flex gap-2 items-center">
                      <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                      <p>{adminError}</p>
                    </div>
                  )}

                  {/* Database Diagnostic Status */}
                  {dbStatus && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 text-[9px]">
                          <Database className="w-3 w-3 text-pink-400 shrink-0" /> Status Database
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-bold ${
                          dbStatus.isSupabaseEnabled && !dbStatus.fallbackToSqlite
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {dbStatus.isSupabaseEnabled && !dbStatus.fallbackToSqlite ? 'Supabase Aktif' : 'Simulator Aktif'}
                        </span>
                      </div>
                      
                      {dbStatus.isSupabaseEnabled && dbStatus.fallbackToSqlite ? (
                        <div className="space-y-1 text-amber-800 leading-relaxed font-light">
                          <p>
                            ⚠️ Koneksi ke Supabase terdeteksi, namun tabel-tabel data belum dibuat di editor database Supabase Anda.
                          </p>
                          <p className="text-[10px] bg-amber-50 p-2 rounded-lg border border-amber-100 mt-1.5 text-amber-700">
                            <strong>Solusi:</strong> Silakan masuk ke dashboard Supabase Anda, buka menu <strong>SQL Editor</strong>, salin seluruh isi file <code className="bg-amber-100/55 px-1 py-0.5 rounded text-amber-900 font-mono text-[9px]">supabase_schema.sql</code>, tempel (paste) di sana, lalu klik tombol <strong>Run</strong>.
                          </p>
                          <p className="mt-2 text-[10px] text-slate-400">
                            *Sistem saat ini dialihkan secara otomatis ke simulator in-memory agar Anda tetap bisa masuk portal admin dengan akun <strong>Dony</strong> sandi <strong>JastipDesiRistanti123</strong>.
                          </p>
                        </div>
                      ) : !dbStatus.isSupabaseEnabled ? (
                        <div className="space-y-1 text-slate-400 leading-relaxed font-light">
                          <p>
                            Sistem sedang berjalan dalam <strong>Mode Simulator In-Memory</strong> yang aman.
                          </p>
                          <p className="text-[10px] mt-1.5">
                            Data akan di-reset setiap kali server dimulai ulang. Untuk mengaktifkan mode cloud permanen, hubungkan kredensial Supabase Anda di platform hosting / Cloud Run Anda.
                          </p>
                        </div>
                      ) : (
                        <p className="font-light leading-relaxed text-slate-400">
                          Sistem jastip Anda terhubung secara real-time dengan database cloud Supabase dengan aman.
                        </p>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Nama Pengguna (Username)</label>
                      <input
                        id="admin-form-username"
                        type="text"
                        required
                        placeholder="Contoh: Dony / Desi / Rori"
                        className="w-full bg-slate-50 border border-slate-100 text-xs rounded-xl p-3 text-slate-705 focus:outline-none focus:border-pink-300 focus:bg-white"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Kata Sandi (Password)</label>
                      <div className="relative">
                        <input
                          id="admin-form-password"
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          className="w-full bg-slate-50 border border-slate-100 text-xs rounded-xl p-3 pr-10 text-slate-705 focus:outline-none focus:border-pink-300 focus:bg-white"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                        />
                        <button
                          id="toggle-password-visibility-btn"
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-pink-500 transition-all cursor-pointer p-1 rounded-md hover:bg-slate-100/50"
                          title={showPassword ? "Sembunyikan Kata Sandi" : "Tampilkan Kata Sandi"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      id="admin-gateway-submit"
                      type="submit"
                      disabled={adminLoading}
                      className="w-full bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white rounded-xl py-3.5 text-xs font-semibold uppercase tracking-wider transition-all shadow cursor-pointer text-center mt-2"
                    >
                      {adminLoading ? 'Memverifikasi kredensial...' : 'Masuk Panel Admin'}
                    </button>
                    
                    <p className="text-[10px] text-slate-400 font-light text-center pt-2">
                      Sistem terenkripsi aman secara otomatis oleh Jastip byDSI Sourcing Hub.
                    </p>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* BOUTIQUE STANDARD FOOTER */}
      <footer className="bg-white border-t border-pink-50 py-12 text-center text-xs font-light text-slate-400 mt-auto">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          
          <div className="flex justify-center items-center gap-2">
            <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-pink-400" />
            </div>
            <span className="font-extrabold tracking-widest text-slate-800 font-mono text-[11px]">JASTIP BYDSI</span>
          </div>

          <div className="flex flex-wrap justify-center gap-y-2 gap-x-6">
            <button id="footer-btn-home" onClick={() => setActiveTab('home')} className="hover:text-pink-400 transition-all cursor-pointer">Beranda</button>
            <button id="footer-btn-shop" onClick={() => setActiveTab('products')} className="hover:text-pink-400 transition-all cursor-pointer">Katalog</button>
            <button id="footer-btn-track" onClick={() => setActiveTab('track')} className="hover:text-pink-400 transition-all cursor-pointer">Lacak Pesanan</button>
            <button id="footer-btn-reviews" onClick={() => setActiveTab('testimonials')} className="hover:text-pink-400 transition-all cursor-pointer">Ulasan Pelanggan</button>
            <button id="footer-btn-admin" onClick={() => setActiveTab('admin')} className="hover:text-pink-400 transition-all text-pink-300 font-bold tracking-wider cursor-pointer">Meja Admin Kantor</button>
          </div>

          <div className="w-12 h-px bg-pink-100 mx-auto"></div>

          <p className="text-[10px] tracking-wide">
            © 2026 Jastip byDSI Sourcing Concierge. Hak Cipta Dilindungi Undang-Undang. Semua barang yang diimpor memenuhi kepatuhan pajak & bea masuk resmi di bawah Hukum Kepabeanan Indonesia (PMK). Tidak berafiliasi dengan merek Stanley mana pun.
          </p>

        </div>
      </footer>

      </motion.div>
    </>
  );
}
