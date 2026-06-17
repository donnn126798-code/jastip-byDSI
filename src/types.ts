/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TrackingStatus {
  WAITING_FOR_PAYMENT = 'Waiting for Payment',
  PAID = 'Paid',
  ORDERED = 'Ordered',
  IN_TRANSIT = 'In Transit',
  ARRIVED_IN_INDONESIA = 'Arrived in Indonesia',
  SHIPPED = 'Shipped',
  COMPLETED = 'Completed',
}

export const statusLabels: Record<TrackingStatus, string> = {
  [TrackingStatus.WAITING_FOR_PAYMENT]: 'Menunggu Pembayaran',
  [TrackingStatus.PAID]: 'Pembayaran Diterima / Terverifikasi',
  [TrackingStatus.ORDERED]: 'Dipesan oleh Personal Shopper',
  [TrackingStatus.IN_TRANSIT]: 'Dalam Transit Pengiriman ke Indonesia',
  [TrackingStatus.ARRIVED_IN_INDONESIA]: 'Tiba di Indonesia / Bea Cukai',
  [TrackingStatus.SHIPPED]: 'Sedang Dikirim ke Alamat Anda',
  [TrackingStatus.COMPLETED]: 'Pesanan Selesai / Diterima',
};

export type CategoryType = 'Stanley' | 'Gift Set' | 'Limited Edition' | 'Tumbler Accessories';

export const categoryLabels: Record<CategoryType, string> = {
  'Stanley': 'Stanley',
  'Gift Set': 'Paket Hadiah (Gift Set)',
  'Limited Edition': 'Edisi Terbatas (Limited)',
  'Tumbler Accessories': 'Aksesoris Tumbler',
};

export interface Product {
  id: string;
  name: string;
  category: CategoryType;
  description: string;
  price: number;
  stock: number;
  image: string;
}

export interface Order {
  id: string;
  order_code: string;
  customer_name: string;
  whatsapp: string;
  product_id?: string; // helper to map to actual product if needed
  product: string; // product name
  quantity: number;
  notes: string;
  total_price: number;
  status: TrackingStatus;
  created_at: string;
  payment_receipt?: string;
  resi_number?: string;
  admin_notes?: string;
  is_deleted?: boolean;
}

export interface TrackingHistory {
  id: string;
  order_id: string;
  status: TrackingStatus;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  customer_name: string;
  review: string;
  rating: number;
  image: string;
}

export interface Admin {
  id: string;
  username: string;
  password_hash: string;
}

export interface SalesStat {
  totalOrders: number;
  totalRevenue: number;
  monthlyOrders: { month: string; ordersCount: number; revenue: number }[];
  categoryDistribution: { category: string; count: number }[];
  popularProducts: { name: string; salesCount: number; revenue: number }[];
}
