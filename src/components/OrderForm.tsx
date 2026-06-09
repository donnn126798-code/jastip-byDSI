/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShoppingBag, ChevronLeft, CreditCard, Send, CheckCircle, ArrowRight, MessageSquare, Copy } from 'lucide-react';
import { Product, categoryLabels, statusLabels } from '../types';

interface OrderFormProps {
  selectedProduct: Product | null;
  onBackToCatalog: () => void;
  onSetTrackCode: (code: string) => void;
}

export default function OrderForm({ selectedProduct, onBackToCatalog, onSetTrackCode }: OrderFormProps) {
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [chosenProduct, setChosenProduct] = useState<Product | null>(selectedProduct);
  
  // Form fields
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    // If no product is passed, load all available products as a dropdown selector
    if (!selectedProduct) {
      fetch('/api/products')
        .then((r) => r.json())
        .then((data) => {
          setProductsList(data);
          const active = data.find((p: Product) => p.stock > 0);
          if (active) setChosenProduct(active);
        });
    } else {
      setChosenProduct(selectedProduct);
    }
  }, [selectedProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !whatsapp.trim() || !chosenProduct) {
      setError('Harap lengkapi Nama Anda dan nomor WhatsApp Anda.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: name.trim(),
          whatsapp: whatsapp.trim(),
          product_id: chosenProduct.id,
          quantity: Number(quantity),
          notes: notes.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengirimkan pemesanan pre-order.');
      }

      const data = await res.json();
      setCreatedOrder(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses data reservasi order Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (createdOrder) {
      navigator.clipboard.writeText(createdOrder.order_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // If order is successfully made, display beautiful confirmation page
  if (createdOrder) {
    const formattedPrice = createdOrder.total_price.toLocaleString('id-ID');
    const waText = encodeURIComponent(
      `Halo Admin Jastip byDSI! 🌸\n\nBerikut adalah data konfirmasi pesanan Pre-Order saya:\n\n📋 *DETAIL PESANAN PREMIUM*\n──────────────────────\n• *Kode Pesanan :* ${createdOrder.order_code}\n• *Nama Lengkap :* ${createdOrder.customer_name}\n• *No. WhatsApp :* ${createdOrder.whatsapp}\n• *Produk        :* ${createdOrder.product}\n• *Jumlah        :* ${createdOrder.quantity} pcs\n• *Total Tagihan :* Rp ${formattedPrice}\n──────────────────────\n\n✨ *Catatan Khusus:* \n${createdOrder.notes ? createdOrder.notes : '- Tidak ada.'}\n\nSaya akan segera melampirkan screenshot bukti transfer transaksi ini ke Bank BCA atas nama Jastip byDSI. Mohon bantuan Kakak untuk melakukan verifikasi. Terima kasih banyak! 💕`
    );
    const whatsappLink = `https://wa.me/6285649059650?text=${waText}`;

    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8 animate-fade-in">
        <div className="bg-white border border-pink-50 rounded-3xl p-6 md:p-10 shadow-sm text-center">
          
          {/* Animated Success Seal */}
          <div className="w-16 h-16 bg-pink-50 border border-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-pink-500 animate-pulse" />
          </div>

          <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-pink-400">Reservasi Terkonfirmasi</span>
          <h2 className="text-2xl font-light text-slate-800 tracking-wider mt-1 mb-2">Terima kasih, {createdOrder.customer_name}!</h2>
          <p className="text-xs font-light text-slate-400 max-w-md mx-auto mb-8">
            Pre-order premium Anda berhasil terdaftar. Kami telah mengamankan slot produk Anda dari kuota eksklusif kami.
          </p>

          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 max-w-md mx-auto mb-8 text-left space-y-4">
            
            {/* Tracking Code Box */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 block">Kode Pelacakan Pesanan</span>
                <span className="text-lg font-bold tracking-widest text-pink-600 block">{createdOrder.order_code}</span>
              </div>
              <button
                id="copy-code-btn"
                onClick={handleCopyCode}
                className="py-2 px-3 border border-pink-100 hover:border-pink-300 bg-pink-50/20 hover:bg-pink-50/60 rounded-xl text-pink-500 hover:text-pink-600 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider shadow-3xs active:scale-95"
              >
                {copiedCode ? 'Tersalin!' : <><Copy className="w-3.5 h-3.5" /> Salin Kode Lacak</>}
              </button>
            </div>

            {/* Info details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-light">Produk Pemesanan:</span>
                <span className="font-semibold text-slate-700 right-0">{createdOrder.product}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-light">Jumlah Slot:</span>
                <span className="font-semibold text-slate-700">{createdOrder.quantity} buah</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-light">Status:</span>
                <span className="font-mono text-amber-650 bg-amber-50 text-amber-600 border border-amber-100 px-2.5 py-0.5 rounded font-bold text-[10px] uppercase">
                  {statusLabels[createdOrder.status as keyof typeof statusLabels] || createdOrder.status}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 mt-1 text-sm">
                <span className="text-slate-800 font-semibold">Total Pembayaran:</span>
                <span className="font-bold text-rose-500 text-base">Rp {formattedPrice}</span>
              </div>
            </div>
          </div>

          {/* Payment Instructions Header */}
          <div className="max-w-md mx-auto text-left mb-8 border border-pink-50 p-6 rounded-2xl bg-gradient-to-r from-pink-50/20 to-transparent">
            <h4 className="text-xs uppercase font-extrabold tracking-widest text-slate-800 mb-3 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-pink-400" /> Informasi Rekening Bank
            </h4>
            <p className="text-xs font-light text-slate-500 leading-relaxed mb-4">
              Silakan transfer jumlah tagihan yang tepat untuk mengonfirmasi pesanan pre-order butik Anda:
            </p>
            <div className="font-mono text-xs bg-white border border-slate-100 rounded-xl p-4 text-slate-600 space-y-1.5 mb-4 shadow-sm">
              <p><strong>Nama Bank:</strong> Bank Central Asia (BCA)</p>
              <p><strong>Nomor Rekening:</strong> <span className="font-bold text-slate-700">8820129481</span></p>
              <p><strong>Atas Nama:</strong> Jastip byDSI (Devina Sofia)</p>
            </div>
            <p className="text-[11px] font-light text-slate-400 leading-normal">
              Setelah Anda selesai melakukan transfer bank, ambil tangkapan layar (screenshot) bukti transfer Anda lalu klik tombol di bawah ini untuk mengirimkan konfirmasi langsung melalui WhatsApp kami.
            </p>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-500 hover:bg-emerald-600 border border-emerald-600 text-white font-semibold text-xs tracking-wider uppercase py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-4 h-4" /> Konfirmasi via WhatsApp
            </a>
            
            <button
              id="confirm-track-btn"
              onClick={() => onSetTrackCode(createdOrder.order_code)}
              className="bg-white border border-pink-200 hover:border-pink-400 text-pink-500 font-semibold text-xs tracking-wider uppercase py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              Lacak Status Pesanan <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            id="back-catalog-final-btn"
            onClick={onBackToCatalog}
            className="text-xs text-slate-400 hover:text-slate-600 font-light underline mt-8 transition-all block mx-auto cursor-pointer"
          >
            Kembali ke katalog utama
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Back to Catalog Header */}
      <button
        id="back-catalog-form-btn"
        onClick={onBackToCatalog}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-pink-500 font-medium transition-all mb-6 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" /> Kembali ke Katalog Kurasi
      </button>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        
        {/* Step details Left Column */}
        {chosenProduct && (
          <div className="md:col-span-2 bg-white border border-pink-50 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] tracking-widest font-extrabold uppercase text-pink-400 mb-2 block">Alokasi Premium</span>
              <h3 className="text-lg font-bold text-slate-800 tracking-wide mb-4">Produk Pilihan</h3>
              
              <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-4 border border-pink-50">
                <img
                  src={chosenProduct.image}
                  alt={chosenProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <h4 className="font-semibold text-slate-800 text-sm mb-1">{chosenProduct.name}</h4>
              <p className="text-xs font-light text-slate-400 leading-normal mb-4">
                {chosenProduct.description}
              </p>

              <div className="text-xs font-light text-slate-400 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p><strong>Kategori:</strong> {categoryLabels[chosenProduct.category] || chosenProduct.category}</p>
                <p><strong>Estimasi Pengiriman:</strong> Grup Aktif (Tiba dalam 2-3 minggu)</p>
                <p><strong>Sisa Slot Tersedia:</strong> {chosenProduct.stock} buah tersisa</p>
              </div>
            </div>

            <div className="border-t border-slate-50 pt-4 mt-6">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-semibold text-slate-700">Harga Per Unit:</span>
                <span className="text-lg font-bold text-slate-800">
                  Rp {chosenProduct.price.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-baseline text-sm mt-3 border-t border-dashed border-slate-100 pt-3">
                <span className="text-slate-500 font-light">Estimasi Subtotal:</span>
                <span className="text-xl font-bold text-rose-500 tracking-wide">
                  Rp {(chosenProduct.price * quantity).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Curation Checkout Right Column */}
        <div className="md:col-span-3 bg-white border border-pink-50 rounded-2xl p-6 md:p-8 shadow-sm">
          <h3 className="text-lg font-extralight tracking-widest text-slate-800 uppercase mb-2">Formulir Pemesanan Pre-Order</h3>
          <div className="w-12 h-0.5 bg-pink-300 mb-6"></div>

          {error && (
            <div className="bg-red-50 text-red-600 border border-red-100 text-xs p-4 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* If no product was pre-selected, let user select from dropdown */}
            {!selectedProduct && productsList.length > 0 && (
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1.5">
                  Pilih Tumbler Pilihan
                </label>
                <select
                  id="checkout-product-dropdown"
                  className="w-full bg-slate-50 border border-slate-100 font-medium text-xs focus:outline-none focus:border-pink-300 focus:bg-white rounded-xl p-3 text-slate-700"
                  onChange={(e) => {
                    const match = productsList.find((p) => p.id === e.target.value);
                    if (match) setChosenProduct(match);
                  }}
                  value={chosenProduct?.id || ''}
                >
                  {productsList.filter(p => p.stock > 0).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - Rp {p.price.toLocaleString('id-ID')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1.5">
                Nama Lengkap Sesuai KTP
              </label>
              <input
                id="checkout-name-input"
                type="text"
                required
                placeholder="Clarissa Putri"
                className="w-full bg-slate-50 border border-slate-100 font-medium text-xs focus:outline-none focus:border-pink-300 focus:bg-white rounded-xl p-3 text-slate-700"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1.5">
                  Nomor WhatsApp (Aktif, Contoh: 628123456789)
                </label>
                <input
                  id="checkout-whatsapp-input"
                  type="tel"
                  required
                  placeholder="628123456789"
                  className="w-full bg-slate-50 border border-slate-100 font-medium text-xs focus:outline-none focus:border-pink-300 focus:bg-white rounded-xl p-3 text-slate-700"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1.5">
                  Jumlah
                </label>
                <select
                  id="checkout-quantity-dropdown"
                  className="w-full bg-slate-50 border border-slate-100 font-medium text-xs focus:outline-none focus:border-pink-300 focus:bg-white rounded-xl p-3 text-slate-700 text-center"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                >
                  {[...Array(Math.min(chosenProduct?.stock || 5, 5))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1.5">
                Catatan Khusus / Teks Kartu Ucapan Gratis (Opsional)
              </label>
              <textarea
                id="checkout-notes-textarea"
                rows={3}
                placeholder="Contoh: Tolong sertakan kartu ucapan ulang tahun tulisan tangan. Bungkus dengan pita sutra merah muda!"
                className="w-full bg-slate-50 border border-slate-100 font-medium text-xs focus:outline-none focus:border-pink-305 focus:bg-white rounded-xl p-3 text-slate-700"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              id="submit-order-form-btn"
              type="submit"
              disabled={loading || !chosenProduct}
              className="w-full py-4 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white rounded-xl font-semibold tracking-wider text-xs uppercase cursor-pointer transition-all gap-1.5 flex items-center justify-center shadow mt-2"
            >
              {loading ? 'Mengamankan slot pesanan...' : <><Send className="w-3.5 h-3.5" /> Kirim Formulir Pemesanan Pre-Order</>}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
