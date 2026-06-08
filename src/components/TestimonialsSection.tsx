/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Star, Quote, Plus, MessageSquare, ShieldCheck } from 'lucide-react';
import { Testimonial } from '../types';

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form fields
  const [name, setName] = useState('');
  const [review, setReview] = useState('');
  const [rating, setRating] = useState(5);
  
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchTestimonials = async () => {
    try {
      const r = await fetch('/api/testimonials');
      if (r.ok) {
        const data = await r.json();
        setTestimonials(data);
      }
    } catch (err) {
      console.error('Error fetching testimonials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !review.trim()) return;

    setSubmitting(true);
    setSuccess(false);

    try {
      // Pick a beautiful pastel avatar color/image based on time
      const seed = Math.floor(Math.random() * 100);
      const randomAvatar = `https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&sig=${seed}`;

      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: name.trim(),
          review: review.trim(),
          rating,
          image: randomAvatar,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setName('');
        setReview('');
        setRating(5);
        setFormOpen(false);
        fetchTestimonials();
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="text-center mb-10">
        <span className="text-[10px] tracking-[0.3em] font-bold text-pink-400 uppercase block mb-1">Catatan Pengalaman Pelanggan</span>
        <h2 className="text-3xl font-extralight tracking-widest text-slate-800 uppercase mb-2">Ulasan & Testimoni</h2>
        <div className="w-16 h-0.5 bg-pink-300 mx-auto mb-4"></div>
        <p className="text-xs font-light text-slate-500 max-w-md mx-auto">
          Baca apa yang dikatakan oleh anggota lingkaran belanja premium kami mengenai ketelitian dan perhatian kami dalam pengadaan, pengemasan pita kado mewah, hingga pengiriman yang aman sampai rumah.
        </p>
      </div>

      {/* Write review toggle and message */}
      <div className="flex justify-center mb-10">
        {!formOpen ? (
          <button
            id="write-review-toggle-btn"
            onClick={() => {
              setFormOpen(true);
              setSuccess(false);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-white text-pink-500 border border-pink-100 hover:border-pink-300 hover:bg-pink-50/20 text-xs font-semibold uppercase tracking-wider rounded-full shadow-xs cursor-pointer transition-all duration-300"
          >
            <Plus className="w-4 h-4" /> Tambah Ulasan Pengalaman Anda
          </button>
        ) : (
          <div className="w-full max-w-lg bg-pink-50/20 border border-pink-100 p-6 md:p-8 rounded-3xl animate-fade-in text-slate-700">
            <h4 className="text-sm font-semibold text-slate-800 tracking-wide mb-4">Bagaimana pengalaman belanja Anda bersama Jastip byDSI?</h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-404 block mb-1">Nama Lengkap Anda</label>
                <input
                  id="write-review-name"
                  type="text"
                  required
                  placeholder="Contoh: Anindya Sofia"
                  className="w-full bg-white border border-slate-100 font-medium text-xs focus:outline-none focus:border-pink-300 rounded-xl p-3 text-slate-700"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-404 block mb-1">Rating Bintang</label>
                <div className="flex gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      id={`star-${star}`}
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="cursor-pointer text-amber-400 hover:scale-110 transition-all p-1"
                    >
                      <Star className="w-5 h-5 fill-current" strokeWidth={rating >= star ? 0 : 1.5} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-404 block mb-1">Ulasan Jujur Anda</label>
                <textarea
                  id="write-review-text"
                  required
                  rows={3}
                  placeholder="Tulis ulasan mengenai unboxing tumbler Stanley premium, kerapihan kemasan pita, respon personal shopper, dsb..."
                  className="w-full bg-white border border-slate-100 font-medium text-xs focus:outline-none focus:border-pink-300 rounded-xl p-3 text-slate-700"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  id="review-cancel-btn"
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 cursor-pointer text-xs font-semibold tracking-wider uppercase text-slate-400 hover:text-slate-600 border border-transparent"
                >
                  Batal
                </button>
                <button
                  id="review-submit-btn"
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 cursor-pointer bg-gradient-to-r from-pink-400 to-pink-500 rounded-xl text-white text-xs font-semibold tracking-wider uppercase shadow"
                >
                  {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs py-4 px-6 rounded-2xl max-w-sm mx-auto mb-10 text-center animate-fade-in flex items-center gap-2 justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <p className="font-semibold">Terima kasih! Ulasan testimoni Anda langsung dipublikasikan.</p>
        </div>
      )}

      {/* Testimonials Grid Display */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-pink-300 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-pink-50 p-8 rounded-3xl h-full flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 relative"
            >
              <Quote className="absolute right-6 top-6 w-12 h-12 text-pink-100/55 pointer-events-none" />
              
              <div>
                {/* Score Stars */}
                <div className="flex gap-1 mb-4 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < t.rating ? 'fill-current' : 'text-slate-200'}`}
                      strokeWidth={0}
                    />
                  ))}
                </div>

                <p className="text-xs font-light text-slate-500 italic leading-relaxed mb-6">
                  "{t.review}"
                </p>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3.5 border-t border-slate-100 pt-4 mt-2">
                <img
                  src={t.image}
                  alt={t.customer_name}
                  className="w-10 h-10 rounded-full object-cover border border-pink-100/30 shadow-xs"
                />
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 tracking-wide">{t.customer_name}</h4>
                  <span className="text-[10px] text-pink-400 uppercase tracking-widest font-bold">Pembeli Terverifikasi</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
