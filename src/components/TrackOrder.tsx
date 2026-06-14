/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, MapPin, Calendar, Clock, DollarSign, Package, CheckCircle, 
  CreditCard, ShoppingBag, Truck, CheckCheck, Copy, Share2, UploadCloud, FileText, Check, ExternalLink,
  Receipt, Printer, MessageSquare
} from 'lucide-react';
import { TrackingStatus, statusLabels, categoryLabels } from '../types';

interface OrderTimelineProps {
  orderCode: string;
}

export default function TrackOrder({ orderCode }: OrderTimelineProps) {
  const [code, setCode] = useState(orderCode || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<{
    order: any;
    history: any[];
  } | null>(null);

  // States for enhanced payment receipt, logistics note & sharing
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadedSuccess, setUploadedSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copiedResi, setCopiedResi] = useState(false);
  const [copiedTrackCode, setCopiedTrackCode] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const formattedCode = code.trim().toUpperCase();
      const res = await fetch(`/api/orders/track/${formattedCode}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menemukan kode pelacakan.');
      }
      const data = await res.json();
      setOrderData(data);
      // Reset receipt form states when a new order is loaded
      setReceiptFile(null);
      setUploadedSuccess(false);
    } catch (err: any) {
      setOrderData(null);
      setError(err.message || 'Riwayat pelacakan tidak ditemukan untuk kode ini.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResi = (resi: string) => {
    navigator.clipboard.writeText(resi);
    setCopiedResi(true);
    setTimeout(() => setCopiedResi(false), 2500);
  };

  const handleCopyTrackCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTrackCode(true);
    setTimeout(() => setCopiedTrackCode(false), 2500);
  };

  const handleShareOrder = () => {
    if (!orderData) return;
    const isDev = window.location.hostname === 'localhost';
    const domain = isDev ? 'http://localhost:3000' : window.location.origin;
    const trackingUrl = `${domain}?track=${orderData.order.order_code}`;
    
    const text = `Halo! Saya baru saja melakukan pre-order produk premium di Jastip byDSI Sourcing Hub ✨\n\n` +
                 `📦 *Detail Pesanan:* \n` +
                 `• Kode Pesanan: ${orderData.order.order_code}\n` +
                 `• Produk: ${orderData.order.product}\n` +
                 `• Jumlah: ${orderData.order.quantity} pcs\n` +
                 `• Total: Rp ${orderData.order.total_price.toLocaleString('id-ID')}\n` +
                 `• Status: ${statusLabels[orderData.order.status as TrackingStatus] || orderData.order.status}\n\n` +
                 `Lacak perjalanan rilis eksklusif ini dari luar negeri melalui jastip-bydsi tracker di sini:\n${trackingUrl}`;
                 
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // File size safety check (max 5MB to avoid SQLite size blowing up)
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran berkas Anda terlalu besar. Maksimum ukuran berkas adalah 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      alert("Anda hanya diperbolehkan mengunggah file gambar (bukti transfer screenshot).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran berkas Anda terlalu besar. Maksimum ukuran berkas adalah 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleReceiptUpload = async () => {
    if (!receiptFile || !orderData) return;
    setUploadingReceipt(true);
    try {
      const res = await fetch(`/api/orders/${orderData.order.id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_receipt: receiptFile })
      });
      
      if (!res.ok) {
        const errRes = await res.json();
        throw new Error(errRes.error || 'Gagal mengirim bukti transfer');
      }
      
      setUploadedSuccess(true);
      setReceiptFile(null);
      // Re-trigger search to update state with receipt link
      await handleSearch();
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim file bukti transfer.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  React.useEffect(() => {
    if (orderCode) {
      setCode(orderCode);
      // Give a tiny timeout so mounting processes finish
      const delay = setTimeout(() => {
        handleSearch();
      }, 100);
      return () => clearTimeout(delay);
    }
  }, [orderCode]);

  // Map status to visual accents and icons in Indonesian
  const getStatusNode = (status: TrackingStatus) => {
    switch (status) {
      case TrackingStatus.WAITING_FOR_PAYMENT:
        return {
          color: 'text-amber-500 bg-amber-50 border-amber-200',
          dotColor: 'bg-amber-500',
          icon: <CreditCard className="w-5 h-5 text-amber-600" />,
          title: 'Menunggu Pembayaran',
          desc: 'Harap transfer pembayaran Anda ke rekening resmi Jastip byDSI untuk mengonfirmasi reservasi slot pre-order Anda.'
        };
      case TrackingStatus.PAID:
        return {
          color: 'text-teal-600 bg-teal-50 border-teal-200',
          dotColor: 'bg-teal-500',
          icon: <CheckCircle className="w-5 h-5 text-teal-600" />,
          title: 'Pembayaran Diterima',
          desc: 'Pembayaran Anda berhasil diverifikasi oleh tim administrasi kami. Slot pesanan Anda telah resmi terjamin.'
        };
      case TrackingStatus.ORDERED:
        return {
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          dotColor: 'bg-blue-500',
          icon: <ShoppingBag className="w-5 h-5 text-blue-600" />,
          title: 'Tumbler Berhasil Dipesan',
          desc: 'Personal shopper kami di USA / Eropa telah membeli produk tumbler eksklusif pilihan Anda di butik resmi.'
        };
      case TrackingStatus.IN_TRANSIT:
        return {
          color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
          dotColor: 'bg-indigo-500',
          icon: <Truck className="w-5 h-5 text-indigo-600" />,
          title: 'Dalam Transit Pengiriman',
          desc: 'Paket premium Anda telah berangkat dari gudang transit internasional kami dan sedang dalam penerbangan kargo ke Indonesia.'
        };
      case TrackingStatus.ARRIVED_IN_INDONESIA:
        return {
          color: 'text-purple-600 bg-purple-50 border-purple-200',
          dotColor: 'bg-purple-500',
          icon: <MapPin className="w-5 h-5 text-purple-600" />,
          title: 'Tiba di Indonesia',
          desc: 'Pesanan Anda telah lolos pemeriksaan bea cukai dengan sukses. Saat ini sedang berada di pusat sortir Jakarta untuk pengiriman lokal.'
        };
      case TrackingStatus.SHIPPED:
        return {
          color: 'text-rose-600 bg-rose-50 border-rose-200',
          dotColor: 'bg-rose-500',
          icon: <Package className="w-5 h-5 text-rose-600" />,
          title: 'Dikirim ke Alamat Anda',
          desc: 'Paket Anda telah diserahkan ke kurir ekspedisi domestik terpercaya. Bersiaplah menyambut paket tumbler idaman Anda!'
        };
      case TrackingStatus.COMPLETED:
        return {
          color: 'text-pink-600 bg-pink-50 border-pink-200',
          dotColor: 'bg-pink-600',
          icon: <CheckCheck className="w-5 h-5 text-pink-600" />,
          title: 'Pesanan Sukses & Selesai',
          desc: 'Pesanan telah sukses diterima di tangan Anda dengan aman! Terima kasih telah menggunakan jasa butik Jastip byDSI.'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          dotColor: 'bg-gray-500',
          icon: <Package className="w-5 h-5 text-gray-600" />,
          title: statusLabels[status] || status,
          desc: 'Pembaruan status pelacakan baru.'
        };
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Title Header */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extralight tracking-widest text-slate-800 uppercase mb-2">Lacak Pesanan Anda</h2>
        <div className="w-16 h-0.5 bg-pink-300 mx-auto mb-4"></div>
        <p className="text-sm font-light text-slate-500 max-w-md mx-auto">
          Masukkan kode konfirmasi pemesanan pre-order butik Anda untuk memantau perjalanan produk impian Anda dari luar negeri.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSearch} className="mb-10 max-w-md mx-auto">
        <div className="relative flex rounded-full shadow-sm bg-white overflow-hidden border border-pink-100 p-1 focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-150 transition-all duration-300">
          <input
            id="order-search-input"
            type="text"
            placeholder="BYDSI-0001"
            className="w-full pl-5 pr-4 py-3 bg-transparent text-sm focus:outline-none tracking-widest text-slate-700 placeholder-slate-300 font-medium"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            id="order-search-button"
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white rounded-full px-5 py-2 text-xs uppercase font-semibold tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow"
          >
            {loading ? 'Mencari...' : <><Search className="w-3.5 h-3.5" /> Lacak</>}
          </button>
        </div>
      </form>

      {/* Error View */}
      {error && (
        <div className="bg-red-50 text-red-600 border border-red-100 text-sm text-center py-5 px-6 rounded-2xl max-w-md mx-auto mb-10 shadow-sm animate-fade-in">
          <p className="font-medium mb-1">Pencarian Tidak Ditemukan</p>
          <p className="font-light text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* Tracking Data results */}
      {orderData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
          
          {/* Order Details Column */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white border border-pink-50 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-pink-400 font-mono">Referensi Pesanan</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <h3 className="text-xl font-bold text-slate-800 tracking-wider font-mono">{orderData.order.order_code}</h3>
                      <button
                        id="copy-track-code-btn"
                        type="button"
                        onClick={() => handleCopyTrackCode(orderData.order.order_code)}
                        className={`p-1 text-slate-450 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-all cursor-pointer`}
                        title="Salin Kode Lacak"
                      >
                        {copiedTrackCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <span className="text-xs bg-pink-50 text-pink-600 border border-pink-100 px-3 py-1 rounded-full font-semibold">
                    {statusLabels[orderData.order.status as TrackingStatus] || orderData.order.status}
                  </span>
                </div>

                <div className="space-y-4 border-t border-slate-50 pt-4 text-slate-700">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1 font-mono">Nama Klien</span>
                    <p className="text-sm font-medium">{orderData.order.customer_name}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-405 block mb-1 font-mono">Nomor WhatsApp</span>
                    <p className="text-sm font-light text-xs text-slate-500">+{orderData.order.whatsapp}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-404 block mb-1 font-mono">Koleksi Pilihan</span>
                    <p className="text-sm font-medium text-slate-800">{orderData.order.product}</p>
                    <p className="text-xs font-light text-slate-400 mt-0.5">Jumlah: {orderData.order.quantity} buah</p>
                  </div>

                  {orderData.order.notes && (
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-404 block mb-1 font-mono">Catatan Khas Kurasi</span>
                      <p className="text-xs font-light italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-500">
                        "{orderData.order.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-50 pt-5 mt-6 flex flex-col gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1 font-mono">Total Transaksi</span>
                  <p className="text-2xl font-semibold text-rose-500 tracking-wide font-mono">
                    Rp {orderData.order.total_price.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] font-light text-slate-400 mt-1">
                    Dipesan tanggal: {new Date(orderData.order.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <button
                  id="view-struk-belanja-btn"
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-3xs active:scale-98"
                >
                  <Receipt className="w-3.5 h-3.5 text-pink-500" /> Lihat Struk / Invoice
                </button>
              </div>
            </div>

            {/* WA Sharing Action Item */}
            <div className="bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-2xl p-6 shadow-sm">
              <h5 className="font-semibold text-sm mb-1 flex items-center gap-1.5 leading-snug">
                <Share2 className="w-4 h-4 text-white" /> Bagikan info preorder
              </h5>
              <p className="text-[11px] text-pink-100 font-light mb-4 leading-relaxed">
                Bagikan kode pelacakan dan status perolehan Anda ke teman atau keluarga Anda secara instan di WhatsApp.
              </p>
              <button 
                id="share-order-wa-btn"
                onClick={handleShareOrder}
                className="w-full flex items-center justify-center gap-2 bg-white text-rose-500 hover:bg-neutral-50 active:scale-98 transition-all py-3 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Bagikan Pesanan
              </button>
            </div>
          </div>

          {/* Timeline & Custom Note Tracking Column */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-pink-50 rounded-2xl p-6 md:p-8 shadow-sm">
              <h4 className="text-sm font-bold tracking-widest uppercase text-slate-800 mb-6 flex items-center gap-2">
                <Clock className="w-4 h-4 text-pink-400" /> Garis Waktu Pengiriman
              </h4>

              <div className="relative pl-6 border-l-2 border-pink-100 space-y-8 pb-4">
                {orderData.history.map((step: any, index: number) => {
                  const nodeInfo = getStatusNode(step.status as TrackingStatus);
                  const isLatest = index === orderData.history.length - 1;
                  
                  return (
                    <div key={step.id || index} className="relative group animate-fade-in">
                      {/* Ring dot marker on the line */}
                      <div className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-2 border-white ${nodeInfo.dotColor} shadow-md`}></div>
                      
                      <div className={`p-4 rounded-xl border transition-all duration-300 ${isLatest ? 'bg-gradient-to-r from-pink-50/40 to-transparent border-pink-100 shadow-sm' : 'bg-transparent border-slate-50 hover:bg-slate-50/50'}`}>
                        <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg border ${nodeInfo.color}`}>
                              {nodeInfo.icon}
                            </div>
                            <span className="font-semibold text-slate-800 text-sm tracking-wide">
                              {nodeInfo.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded font-mono">
                            {new Date(step.updated_at).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-xs font-light text-slate-500 leading-relaxed md:pl-10">
                          {nodeInfo.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Logistics tracking details (Resi & live note) inside "Sistem Notifikasi Alur Logistik Detail" */}
              {(orderData.order.resi_number || orderData.order.admin_notes) && (
                <div className="mt-6 border-t border-slate-100 pt-6 space-y-4">
                  {orderData.order.resi_number && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-0.5 font-mono">Nomor Resi Domestik</span>
                        <p className="text-xs font-light text-slate-500">Nomor pelacakan resmi untuk pengiriman kurir lokal Anda:</p>
                        <p className="font-mono text-sm font-semibold text-slate-850 tracking-wider mt-1">{orderData.order.resi_number}</p>
                      </div>
                      <button
                        id="copy-resi-btn"
                        type="button"
                        onClick={() => handleCopyResi(orderData.order.resi_number)}
                        className={`flex items-center justify-center gap-1.5 px-4 py-2 cursor-pointer border rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-3xs ${copiedResi ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {copiedResi ? (
                          <><Check className="w-3.5 h-3.5" /> Berhasil Disalin</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" /> Salin Resi</>
                        )}
                      </button>
                    </div>
                  )}

                  {orderData.order.admin_notes && (
                    <div className="bg-pink-50/20 border border-pink-100/55 rounded-xl p-4">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-pink-500 block mb-1 font-mono">Pesan Khusus Tim Sourcing</span>
                      <p className="text-xs text-slate-600 font-light italic leading-relaxed">
                        "{orderData.order.admin_notes}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Unggah Bukti Transfer & Payment Guidelines (Dukungan Pembayaran & Unggah Bukti) */}
            <div className="bg-white border border-pink-50 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
              <div>
                <h4 className="text-sm font-bold tracking-widest uppercase text-slate-800 mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-pink-400" /> Kemitraan Pembayaran & Konfirmasi
                </h4>
                <p className="text-xs font-light text-slate-500 leading-relaxed">
                  Guna menjamin ketersediaan slot pre-order butik eksklusif Anda, harap lakukan transfer pembayaran penuh ke rekening resmi di bawah ini:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Bank Coordinates */}
                <div className="font-mono bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-700 text-xs space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider font-sans">DETAIL REKENING BCA</p>
                  <p><strong>Nama Bank:</strong> Bank Central Asia (BCA)</p>
                  <p><strong>Nomor Rekening:</strong> 3221064061</p>
                  <p><strong>Atas Nama:</strong> Dony Dwi Ristanto</p>
                  <p><strong>Jumlah:</strong> <span className="font-semibold text-rose-500 bg-rose-50/50 px-1 rounded">Rp {orderData.order.total_price.toLocaleString('id-ID')}</span></p>
                </div>

                {/* Upload Section */}
                <div className="flex flex-col justify-center">
                  {orderData.order.payment_receipt ? (
                    <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-4 text-center space-y-2.5">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-semibold text-xs mb-1">
                        <CheckCircle className="w-4 h-4" /> BUKTI TRANSFER TERUNGGAH
                      </div>
                      <p className="text-[10px] text-slate-500 font-light">
                         Snapshot bukti transfer Anda terarsip aman. Tim byDSI Sourcing Hub sedang memverifikasi transaksi.
                      </p>
                      
                      {/* Thumbnail display */}
                      <div className="relative inline-block group max-w-[120px] mx-auto overflow-hidden rounded-lg border border-slate-100 h-16 w-32 bg-white">
                        <img 
                          src={orderData.order.payment_receipt} 
                          alt="Bukti Transfer Terkirim" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <a href={orderData.order.payment_receipt} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white font-semibold underline">Detail</a>
                        </div>
                      </div>

                      <div className="pt-2">
                        <a
                          href={`https://wa.me/6285649059650?text=${encodeURIComponent(
                            `Halo Admin Jastip byDSI! 🌸\n\nSaya telah mengunggah bukti transfer pembayaran di website untuk pesanan saya:\n\n📋 *DETAIL PESANAN PREMIUM*\n──────────────────────\n• *Kode Pesanan :* ${orderData.order.order_code}\n• *Nama Lengkap :* ${orderData.order.customer_name}\n• *Produk        :* ${orderData.order.product}\n• *Jumlah        :* ${orderData.order.quantity} pcs\n• *Total Tagihan :* Rp ${orderData.order.total_price.toLocaleString('id-ID')}\n──────────────────────\n\nBukti transfer sudah sukses terupload di sistem tracking website. Mohon bantuan Kakak untuk melakukan verifikasi status pesanan saya. Terima kasih banyak! 💕`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-3xs hover:shadow-2xs active:scale-95"
                        >
                          <MessageSquare className="w-3.5 h-3.5 animate-pulse" /> Kirim Bukti ke WhatsApp
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold text-slate-700">Lampirkan Bukti Transfer Anda:</p>
                      
                      <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${dragOver ? 'border-pink-400 bg-pink-50/20' : receiptFile ? 'border-pink-300 bg-pink-50/5' : 'border-slate-200 hover:border-pink-200'}`}
                      >
                        <input
                          id="payment-receipt-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleReceiptChange}
                        />
                        <label htmlFor="payment-receipt-upload" className="w-full h-full block cursor-pointer">
                          {receiptFile ? (
                            <div className="space-y-2">
                              <FileText className="w-5 h-5 text-pink-400 mx-auto animate-bounce" />
                              <p className="text-[10px] font-medium text-slate-700 truncate max-w-[160px] mx-auto">File Terpilih Siap Dikirim</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                              <p className="text-[10px] font-medium text-slate-600">Seret file atau klik untuk unggah</p>
                              <p className="text-[9px] text-slate-450 font-light">PNG, JPG, JPEG (Max 5MB)</p>
                            </div>
                          )}
                        </label>
                      </div>

                      {receiptFile ? (
                        <div className="flex gap-2">
                          <button
                            id="cancel-receipt-btn"
                            type="button"
                            onClick={() => setReceiptFile(null)}
                            className="w-1/3 border border-slate-200 text-slate-500 hover:text-slate-700 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            id="submit-receipt-btn"
                            type="button"
                            onClick={handleReceiptUpload}
                            disabled={uploadingReceipt}
                            className="w-2/3 bg-pink-400 hover:bg-pink-500 text-white font-semibold py-2 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 hover:shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            {uploadingReceipt ? 'Sedang Mengirim...' : <><Check className="w-3.5 h-3.5" /> Kirim Bukti</>}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="relative flex py-0.5 items-center">
                            <div className="flex-grow border-t border-slate-100"></div>
                            <span className="flex-shrink mx-2.5 text-slate-400 font-mono text-[9px] uppercase tracking-wider">Atau</span>
                            <div className="flex-grow border-t border-slate-100"></div>
                          </div>

                          <a
                            href={`https://wa.me/6285649059650?text=${encodeURIComponent(
                              `Halo Admin Jastip byDSI! 🌸\n\nSaya ingin mengonfirmasi pembayaran untuk pesanan pre-order saya:\n\n📋 *DETAIL PESANAN PREMIUM*\n──────────────────────\n• *Kode Pesanan :* ${orderData.order.order_code}\n• *Nama Lengkap :* ${orderData.order.customer_name}\n• *Produk        :* ${orderData.order.product}\n• *Jumlah        :* ${orderData.order.quantity} pcs\n• *Total Tagihan :* Rp ${orderData.order.total_price.toLocaleString('id-ID')}\n──────────────────────\n\nSaya akan segera melampirkan screenshot bukti transfer transaksi ini ke Bank BCA a/n Dony Dwi Ristanto langsung melalui WhatsApp ini. Terima kasih! 💕`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-3xs hover:shadow-2xs active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Konfirmasi via WhatsApp
                          </a>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* MODAL: ELEGAN E-STRUK BELANJA & INVOICE */}
      {showInvoiceModal && orderData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in print:bg-white print:p-0 print:absolute print:inset-0">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md border border-slate-100 shadow-2xl relative space-y-6 animate-scale-up print:border-none print:shadow-none print:p-0">
            {/* Header Actions */}
            <div className="flex justify-between items-center pb-3 border-b border-rose-50 print:hidden">
              <div className="text-left">
                <span className="text-[9px] tracking-widest font-extrabold text-pink-500 uppercase font-mono">Boutique Receipt Engine</span>
                <h3 className="text-sm font-bold text-slate-800">Struk Pembelian Resmi</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="print-struk-btn"
                  type="button"
                  onClick={() => {
                    // Quick print triggering
                    window.print();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-100/50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak
                </button>
                <button
                  id="close-struk-btn"
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
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
                  <p className="text-[9px] text-slate-405 italic">WhatsApp: +62 856-4905-9650 (byDSI Support)</p>
                </div>

                <div className="w-full border-t border-dashed border-slate-300 my-2"></div>

                {/* Meta details */}
                <div className="space-y-1 text-[10px] text-slate-600">
                  <div className="flex justify-between">
                    <span>NO. TRACK / INVOICE :</span>
                    <span className="font-semibold">{orderData.order.order_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TANGGAL TRANSAKSI :</span>
                    <span>
                      {new Date(orderData.order.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })} {new Date(orderData.order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>NAMA KLIEN :</span>
                    <span className="uppercase">{orderData.order.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WHATSAPP :</span>
                    <span>+{orderData.order.whatsapp}</span>
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
                      <span className="font-medium text-slate-800">{orderData.order.product}</span>
                      <span className="font-semibold text-slate-800 shrink-0">
                        Rp {orderData.order.total_price.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400">
                      Spesifikasi: 100% Produk Autentik • Qty: {orderData.order.quantity} x Rp {(orderData.order.total_price / orderData.order.quantity).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                <div className="w-full border-t border-dashed border-slate-300 my-2"></div>

                {/* Subtotals & Taxes */}
                <div className="space-y-1 text-[10px] text-slate-600">
                  <div className="flex justify-between">
                    <span>SUBTOTAL BELANJA :</span>
                    <span>Rp {orderData.order.total_price.toLocaleString('id-ID')}</span>
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
                    <span className="text-rose-600">Rp {orderData.order.total_price.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="w-full border-t border-dashed border-slate-300 my-2"></div>

                {/* PAYMENT STATUS MARK */}
                <div className="text-center py-2 border border-slate-300/50 rounded-xl bg-white/60 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">STATUS STATUS TRANSAKSI</p>
                  {orderData.order.status === TrackingStatus.WAITING_FOR_PAYMENT ? (
                    <span className="text-xs font-extrabold text-amber-500 uppercase font-mono tracking-widest animate-pulse">
                      ● MENUNGGU TRANSFER
                    </span>
                  ) : (
                    <span className="text-xs font-extrabold text-emerald-600 uppercase font-mono tracking-widest">
                      ✔ LUNAS & BERHASIL DIVERIFIKASI
                    </span>
                  )}
                  <p className="text-[8px] text-slate-400 font-light">Metode: Bank BCA Virtual / Manual (byDSI Trust)</p>
                </div>

                {/* Mock Barcode Pattern */}
                <div className="text-center space-y-1.5 pt-2">
                  <p className="font-mono text-slate-400 tracking-[-0.05em] text-xs leading-none select-none opacity-80">
                    ||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
                  </p>
                  <p className="text-[8px] text-slate-400 tracking-widest font-mono">
                    **{orderData.order.order_code}**
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
