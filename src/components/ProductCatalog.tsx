/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Sparkles, Filter, ChevronRight } from 'lucide-react';
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
        <div className="text-center py-20 bg-white border border-dashed border-pink-100 rounded-3xl p-8 max-w-md mx-auto">
          <Sparkles className="w-8 h-8 text-pink-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Kurasi Tidak Ditemukan</p>
          <p className="text-xs font-light text-slate-400 mt-2">
            Coba sesuaikan kata kunci pencarian Anda atau lihat kategori butik yang lain.
          </p>
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
    </div>
  );
}
