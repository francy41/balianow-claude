/**
 * BailaNow — Payment utilities
 * Wrapper para comunicación con Supabase Edge Functions de pago
 */

import { loadStripe } from '@stripe/stripe-js';

// ─── Config ────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

export const PLATFORM_FEE = Number(import.meta.env.VITE_PLATFORM_COMMISSION ?? 0.15);

// Stripe singleton
let stripePromise: ReturnType<typeof loadStripe> | null = null;
export const getStripe = () => {
  if (!stripePromise && STRIPE_PK && !STRIPE_PK.includes('REEMPLAZA')) {
    stripePromise = loadStripe(STRIPE_PK);
  }
  return stripePromise;
};

// ─── Types ──────────────────────────────────────────────────
export interface PaymentItem {
  serviceId: string;
  sellerId: string;
  sellerName: string;
  title: string;
  price: number;
  extrasTotal: number;
}

export interface SellerPayout {
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  gross: number;
  commission: number;
  net: number;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  sellerBreakdown: SellerPayout[];
  platformFee: number;
}

export interface PayPalOrderResult {
  orderId: string;
  status: string;
  links: { href: string; rel: string; method: string }[];
  sellerBreakdown: SellerPayout[];
  platformFee: number;
}

// ─── Edge Function caller ───────────────────────────────────
import { supabase } from './supabase';

async function callEdgeFunction<T>(fnName: string, body: object): Promise<T> {
  // Use the user's session token if available, fall back to anon key
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Error en ${fnName}`);
  return data as T;
}

// ─── Stripe ─────────────────────────────────────────────────
export async function createStripePaymentIntent(params: {
  amount: number;
  currency?: string;
  items: PaymentItem[];
  userId: string;
}): Promise<PaymentIntentResult> {
  return callEdgeFunction<PaymentIntentResult>('create-payment-intent', params);
}

// ─── Stripe Subscriptions (checkout recurrente) ────────────
export interface SubscriptionCheckoutResult {
  url?: string;
  notConfigured?: boolean;
  error?: string;
}

export async function createSubscriptionCheckout(params: {
  planId: string;
  planName: string;
  price: number;
  period: 'monthly' | 'yearly';
  currency?: string;
  subscriptionRowId: string;
}): Promise<SubscriptionCheckoutResult> {
  return callEdgeFunction<SubscriptionCheckoutResult>('create-subscription-checkout', params);
}

// ─── PayPal ─────────────────────────────────────────────────
export async function createPayPalOrder(params: {
  amount: number;
  currency?: string;
  items: PaymentItem[];
  userId: string;
}): Promise<PayPalOrderResult> {
  return callEdgeFunction<PayPalOrderResult>('create-paypal-order', params);
}

export async function capturePayPalOrder(params: {
  orderId: string;
  userId: string;
  sellerBreakdown: SellerPayout[];
}): Promise<{ success: boolean; captureId: string }> {
  return callEdgeFunction('capture-paypal-order', params);
}

// ─── Helpers ────────────────────────────────────────────────
export function calcSellerBreakdown(items: PaymentItem[]): SellerPayout[] {
  const map = new Map<string, SellerPayout>();
  for (const item of items) {
    const gross = item.price + item.extrasTotal;
    const existing = map.get(item.sellerId);
    if (existing) {
      existing.gross += gross;
      existing.commission = Math.round(existing.gross * PLATFORM_FEE * 100) / 100;
      existing.net = Math.round(existing.gross * (1 - PLATFORM_FEE) * 100) / 100;
    } else {
      map.set(item.sellerId, {
        sellerId: item.sellerId,
        sellerName: item.sellerName,
        sellerAvatar: '',
        gross,
        commission: Math.round(gross * PLATFORM_FEE * 100) / 100,
        net: Math.round(gross * (1 - PLATFORM_FEE) * 100) / 100,
      });
    }
  }
  return Array.from(map.values());
}

export function fmtEur(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}
