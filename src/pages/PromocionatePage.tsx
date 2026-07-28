import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, ShoppingBag, ShoppingCart, CheckCircle, Clock, TrendingUp, Shield, Users, Eye, Send, X, Trash2, CreditCard, ArrowRight, Loader2, QrCode } from 'lucide-react';
import type { PromoService, PromoSeller } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuthStore, useUIStore, useCartStore } from '../store/appStore';
import { StarRating, Badge } from '../components/ui';
import BookingModal from '../components/BookingModal';
import BusinessQRModal from '../components/BusinessQRModal';
import SplitPaymentModal from '../components/SplitPaymentModal';
import BusinessToolsHub from '../components/BusinessToolsHub';
import PaymentGateway from '../components/payment/PaymentGateway';
import { AD_PLANS } from '../data/adPlans';

const CATEGORY_TABS = [
  { id: 'all', label: 'Todo', icon: '🔥' },
  { id: 'redes-sociales', label: 'Redes Sociales', icon: '📱' },
  { id: 'spotify-playlists', label: 'Spotify & Playlists', icon: '🎧' },
  { id: 'video-promo', label: 'Video Promo', icon: '🎬' },
  { id: 'influencers', label: 'Influencers', icon: '⭐' },
  { id: 'prensa-blogs', label: 'Prensa & Blogs', icon: '📰' },
];

// Sub-categorías por plataforma (filtro fino)
const PLATFORM_TABS = [
  { id: 'all',       label: 'Todas',    icon: '🌐', color: 'bg-pink-500' },
  { id: 'TikTok',    label: 'TikTok',   icon: '🎵', color: 'bg-pink-500' },
  { id: 'Instagram', label: 'Instagram',icon: '📸', color: 'from-purple-500 via-pink-500 to-orange-400' },
  { id: 'Facebook',  label: 'Facebook', icon: '📘', color: 'bg-blue-600' },
  { id: 'YouTube',   label: 'YouTube',  icon: '▶️', color: 'bg-red-500' },
  { id: 'Spotify',   label: 'Spotify',  icon: '🎧', color: 'bg-green-500' },
  { id: 'Twitch',    label: 'Twitch',   icon: '🎮', color: 'bg-purple-600' },
  { id: 'X',         label: 'X/Twitter',icon: '🐦', color: 'bg-gray-700' },
];

const formatFollowers = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
};

/* ── Seller Profile Card ── */
const SellerCard: React.FC<{ seller: PromoSeller; onClick: () => void }> = ({ seller, onClick }) => (
  <button onClick={onClick} className="card-white rounded-2xl p-4 text-left hover:shadow-lg transition-all w-full">
    <div className="flex items-center gap-3 mb-3">
      <div className="relative">
        <img src={seller.avatar} alt={seller.name} className="w-12 h-12 rounded-full object-cover" />
        {seller.isVerified && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-sm text-gray-900 truncate">{seller.name}</p>
          {seller.isPro && <span className="text-[8px] bg-brand-orange text-white px-1.5 py-0.5 rounded font-black">PRO</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <StarRating rating={seller.rating} count={seller.reviews} />
          <span className="text-[10px] text-gray-400">{seller.orders} ventas</span>
        </div>
      </div>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {seller.socialProof.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
          {s.icon} {formatFollowers(s.followers)}
        </span>
      ))}
    </div>
  </button>
);

/* ── Service Card ── */
const PromoServiceCard: React.FC<{
  service: PromoService;
  onBuy: () => void;
  onReserve: () => void;
  onChat: () => void;
  isInCart: boolean;
}> = ({ service, onBuy, onReserve, onChat, isInCart }) => {
  const totalFollowers = service.platforms.reduce((sum, p) => sum + p.totalFollowers, 0);
  const totalAccounts = service.platforms.reduce((sum, p) => sum + p.accounts, 0);

  return (
    <div className="card-white rounded-2xl overflow-hidden hover:shadow-lg transition-all">
      <div className="relative">
        <img src={service.cover} alt={service.title} className="w-full h-44 object-cover" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full font-bold">
            {service.categoryLabel}
          </span>
          {service.price <= 10 && (
            <span className="text-[10px] bg-green-500 text-white px-2 py-1 rounded-full font-bold animate-pulse">
              🔥 DESDE {service.price}€
            </span>
          )}
        </div>
        {isInCart && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" /> En carrito
          </div>
        )}
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl">
          <span className="font-black text-lg">€{service.price}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <img src={service.sellerAvatar} alt={service.sellerName} className="w-8 h-8 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">{service.sellerName}</p>
            <StarRating rating={service.rating} count={service.reviews} />
          </div>
          <span className="text-[10px] text-gray-400">{service.orders} ventas</span>
        </div>

        <h3 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2 leading-snug">{service.title}</h3>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {service.platforms.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-pink-50 text-pink-600 px-2 py-1 rounded-lg font-semibold border border-pink-100">
              {p.icon} {p.accounts > 1 ? `${p.accounts} cuentas` : p.name} · {formatFollowers(p.totalFollowers)}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {formatFollowers(totalFollowers)}</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {totalAccounts} cuentas</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {service.deliveryDays}d</span>
        </div>

        <div className="space-y-1 mb-3">
          {service.includes.slice(0, 3).map((inc, i) => (
            <p key={i} className="text-[11px] text-gray-500 flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {inc}
            </p>
          ))}
          {service.includes.length > 3 && (
            <p className="text-[10px] text-pink-500 font-semibold">+{service.includes.length - 3} más incluidos</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {service.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{tag}</span>
          ))}
        </div>

        <div className="bg-gray-50 rounded-lg p-2 mb-3 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">Comisión plataforma ({service.platformFee}%)</span>
          <span className="text-[10px] font-bold text-gray-500">€{(service.price * service.platformFee / 100).toFixed(2)}</span>
        </div>

        {service.extras.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Extras opcionales</p>
            {service.extras.map((extra, i) => (
              <div key={i} className="flex items-center justify-between py-0.5 text-[11px]">
                <span className="text-gray-600">+ {extra.label}</span>
                <span className="text-pink-500 font-bold">+€{extra.price}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons — 3 buttons */}
        <div className="flex gap-2">
          <button onClick={onChat} className="flex items-center justify-center gap-1 border-2 border-pink-500 text-pink-500 font-bold rounded-xl py-2.5 px-3 text-xs hover:bg-pink-500 hover:text-white transition-all">
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onReserve}
            disabled={isInCart}
            className={`flex-1 flex items-center justify-center gap-1.5 font-bold rounded-xl py-2.5 text-xs transition-all border-2 ${
              isInCart
                ? 'border-green-400 text-green-600 bg-green-50 cursor-default'
                : 'border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> {isInCart ? 'Reservado' : 'Reservar'}
          </button>
          <button onClick={onBuy} className="flex-1 flex items-center justify-center gap-1.5 bg-brand-orange text-white font-bold rounded-xl py-2.5 text-xs hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25">
            <ShoppingBag className="w-3.5 h-3.5" /> Contratar
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Cart Drawer (Premium) ── */
const CartDrawer: React.FC<{ open: boolean; onClose: () => void; onCheckout: () => void }> = ({ open, onClose, onCheckout }) => {
  const { items, removeItem, toggleExtra, getSubtotal, getCommission, getTotal, getSellerBreakdown } = useCartStore();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const breakdown = getSellerBreakdown();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] flex flex-col shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)' }}
      >
        {/* ── Header ── */}
        <div className="relative flex-shrink-0 px-5 pt-5 pb-4">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center shadow-lg shadow-purple-500/30">
                <ShoppingCart className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <h2 className="font-black text-lg text-white leading-none">Mi Reserva</h2>
                <p className="text-[11px] text-purple-300 mt-0.5">
                  {items.length === 0 ? 'Sin servicios aún' : `${items.length} servicio${items.length > 1 ? 's' : ''} seleccionado${items.length > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <span className="bg-brand-orange text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg shadow-purple-500/30">
                  {items.length}
                </span>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Divider with glow */}
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        </div>

        {/* ── Items List ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4a4a6a transparent' }}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
                <ShoppingCart className="w-9 h-9 text-white/20" />
              </div>
              <p className="text-white/60 font-bold text-base">Tu carrito está vacío</p>
              <p className="text-white/30 text-sm mt-2 max-w-[200px] leading-relaxed">Reserva servicios y págalos todos juntos con un solo pago</p>
              <button onClick={onClose} className="mt-6 bg-brand-orange text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:from-purple-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-purple-500/25">
                Explorar servicios
              </button>
            </div>
          ) : (
            <>
              {items.map((item, idx) => {
                const extrasTotal = item.extras.filter(e => e.selected).reduce((s, e) => s + e.price, 0);
                const itemTotal = item.price + extrasTotal;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    {/* Item header */}
                    <div className="flex items-start gap-3 p-3.5">
                      <div className="relative flex-shrink-0">
                        <img src={item.sellerAvatar} alt={item.sellerName} className="w-11 h-11 rounded-xl object-cover ring-2 ring-purple-500/30" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-orange rounded-full flex items-center justify-center text-[8px] font-black text-white">
                          {idx + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-white line-clamp-2 leading-snug">{item.title}</p>
                        <p className="text-[11px] text-white/40 mt-0.5">{item.sellerName}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full">Base: €{item.price.toFixed(2)}</span>
                          {extrasTotal > 0 && (
                            <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded-full">+extras: €{extrasTotal.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="font-black text-base text-transparent bg-clip-text bg-brand-orange">
                          €{itemTotal.toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400/60 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Extras toggles */}
                    {item.extras.length > 0 && (
                      <div className="mx-3.5 mb-3.5 rounded-xl border border-white/5 overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <div className="px-3 py-2 border-b border-white/5">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Extras opcionales</p>
                        </div>
                        <div className="px-3 py-2 space-y-2">
                          {item.extras.map((extra, eidx) => (
                            <label key={eidx} className="flex items-center gap-2.5 cursor-pointer group">
                              <div
                                onClick={() => toggleExtra(item.id, eidx)}
                                className={`w-4 h-4 rounded flex items-center justify-center transition-all flex-shrink-0 cursor-pointer border ${
                                  extra.selected
                                    ? 'bg-brand-orange border-transparent shadow-lg shadow-pink-500/30'
                                    : 'border-white/20 bg-white/5 hover:border-purple-400/50'
                                }`}
                              >
                                {extra.selected && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                              <span className={`text-[12px] flex-1 transition-colors ${extra.selected ? 'text-white font-semibold' : 'text-white/40 group-hover:text-white/60'}`}>
                                {extra.label}
                              </span>
                              <span className={`text-[12px] font-black transition-colors ${extra.selected ? 'text-pink-400' : 'text-white/20'}`}>
                                +€{extra.price}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Seller Breakdown toggle */}
              {breakdown.length > 1 && (
                <button
                  onClick={() => setShowBreakdown(v => !v)}
                  className="w-full text-[11px] text-purple-300/70 hover:text-purple-300 font-semibold flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <Users className="w-3 h-3" />
                  {showBreakdown ? 'Ocultar distribución por vendedor' : 'Ver distribución por vendedor'}
                  <svg className={`w-3 h-3 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 12 12">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}

              {showBreakdown && (
                <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="px-4 py-2.5 border-b border-white/5">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Distribución de pagos (85% vendedor / 15% plataforma)</p>
                  </div>
                  <div className="p-3 space-y-2">
                    {breakdown.map(s => (
                      <div key={s.sellerId} className="flex items-center gap-3">
                        <img src={s.sellerAvatar} alt={s.sellerName} className="w-7 h-7 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white/70 truncate">{s.sellerName}</p>
                          <div className="h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[12px] font-black text-green-400">€{s.net.toFixed(2)}</p>
                          <p className="text-[9px] text-white/20">-€{s.commission.toFixed(2)} plataforma</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Summary & Checkout Footer ── */}
        {items.length > 0 && (
          <div className="flex-shrink-0 px-4 pb-5 pt-3">
            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent mb-4" />

            {/* Totals */}
            <div className="rounded-2xl border border-white/10 p-4 mb-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-white/50">Subtotal ({items.length} servicio{items.length > 1 ? 's' : ''})</span>
                <span className="text-[13px] font-bold text-white">€{getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-white/50">Comisión BailaNow</span>
                  <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">15%</span>
                </div>
                <span className="text-[12px] text-white/30 line-through">€{getCommission().toFixed(2)}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-base font-black text-white">Total a pagar</span>
                <span className="text-2xl font-black text-transparent bg-clip-text bg-brand-orange">
                  €{getTotal().toFixed(2)}
                </span>
              </div>
            </div>

            {/* CTA button */}
            <button
              onClick={onCheckout}
              className="w-full relative overflow-hidden rounded-2xl py-4 flex items-center justify-center gap-2.5 font-black text-sm text-white transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-pink-500/30"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)' }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] hover:translate-x-[200%] transition-transform duration-700" />
              <CreditCard className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              <span>Pagar todo junto · €{getTotal().toFixed(2)}</span>
            </button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 mt-3">
              {[
                { icon: '🔒', label: 'Pago seguro SSL' },
                { icon: '🛡️', label: 'Escrow garantizado' },
                { icon: '↩️', label: 'Reembolso 7 días' },
              ].map(badge => (
                <div key={badge.label} className="flex items-center gap-1">
                  <span className="text-[10px]">{badge.icon}</span>
                  <span className="text-[9px] text-white/25 font-medium">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

/* ── Checkout Modal — replaced by PaymentGateway, kept for reference ── */
const CheckoutModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { items, getSubtotal, getCommission, getTotal, getSellerBreakdown, clearCart } = useCartStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (!open) return null;

  const breakdown = getSellerBreakdown();

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setCompleted(true);
    }, 2000);
  };

  const handleFinish = () => {
    clearCart();
    addToast({ message: '¡Pago completado! Los vendedores han sido notificados.', type: 'success' });
    onClose();
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {completed ? (
          /* Success Screen */
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="font-black text-2xl text-gray-900 mb-2">¡Pago completado!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Se ha distribuido el pago a {breakdown.length} vendedor{breakdown.length > 1 ? 'es' : ''}.
              Cada uno ha recibido su parte menos el 15% de comisión de la plataforma.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Distribución de pagos</p>
              {breakdown.map(s => (
                <div key={s.sellerId} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100">
                  <img src={s.sellerAvatar} alt={s.sellerName} className="w-9 h-9 rounded-full" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-900">{s.sellerName}</p>
                    <p className="text-[10px] text-gray-400">Bruto: €{s.gross.toFixed(2)} - Comisión: €{s.commission.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-green-600">€{s.net.toFixed(2)}</p>
                    <p className="text-[9px] text-gray-400">recibe</p>
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">Comisión total BailaNow (15%)</span>
                <span className="text-sm font-bold text-pink-500">€{getCommission().toFixed(2)}</span>
              </div>
            </div>

            <button onClick={handleFinish} className="btn-orange w-full">
              Ver mis pedidos
            </button>
          </div>
        ) : (
          /* Checkout Form */
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-xl text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-pink-500" /> Checkout
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="space-y-2 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Resumen del pedido</p>
              {items.map(item => {
                const extrasTotal = item.extras.filter(e => e.selected).reduce((s, e) => s + e.price, 0);
                return (
                  <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <img src={item.sellerAvatar} alt={item.sellerName} className="w-8 h-8 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
                      <p className="text-[10px] text-gray-400">{item.sellerName}</p>
                      {extrasTotal > 0 && <p className="text-[10px] text-purple-500">+ extras: €{extrasTotal}</p>}
                    </div>
                    <span className="font-bold text-sm text-gray-900">€{(item.price + extrasTotal).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Seller Breakdown */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Distribución a vendedores</p>
              {breakdown.map(s => (
                <div key={s.sellerId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <img src={s.sellerAvatar} alt={s.sellerName} className="w-6 h-6 rounded-full" />
                    <span className="text-xs text-gray-700">{s.sellerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-green-600">€{s.net.toFixed(2)}</span>
                    <span className="text-[9px] text-gray-400 ml-1">(- €{s.commission.toFixed(2)} comisión)</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-bold text-gray-900">€{getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Comisión plataforma (15%)</span>
                <span className="text-gray-400 text-xs">incluida</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-black text-lg text-gray-900">Total a pagar</span>
                <span className="font-black text-xl text-pink-500">€{getTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method (mock) */}
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Método de pago</p>
              <div className="space-y-2">
                {[
                  { label: 'Tarjeta de crédito/débito', icon: '💳', selected: true },
                  { label: 'PayPal', icon: '🅿️', selected: false },
                  { label: 'Wallet BailaNow', icon: '👛', selected: false },
                ].map(pm => (
                  <label key={pm.label} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    pm.selected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" name="payment" defaultChecked={pm.selected} className="w-4 h-4 text-pink-500 focus:ring-pink-500" />
                    <span className="text-lg">{pm.icon}</span>
                    <span className="text-sm font-medium text-gray-900">{pm.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={processing}
              className="w-full bg-brand-orange text-white font-black rounded-xl py-4 text-sm hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Procesando pago...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" /> Pagar €{getTotal().toFixed(2)}
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-gray-400 mt-3 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" /> Pago seguro con escrow · Los vendedores recibirán el pago al completar el servicio
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Seller Detail Modal ── */
const SellerModal: React.FC<{ seller: PromoSeller; onClose: () => void }> = ({ seller, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
    <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <img src={seller.avatar} alt={seller.name} className="w-16 h-16 rounded-2xl object-cover" />
            {seller.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-lg text-gray-900">{seller.name}</h2>
              {seller.isPro && <span className="text-[9px] bg-brand-orange text-white px-2 py-0.5 rounded font-black">PRO</span>}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <StarRating rating={seller.rating} count={seller.reviews} size="md" />
              <span className="text-xs text-gray-400">Desde {seller.memberSince}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{seller.bio}</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="font-black text-lg text-gray-900">{seller.orders}</p>
            <p className="text-[10px] text-gray-400">Ventas</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="font-black text-lg text-gray-900">{seller.rating}</p>
            <p className="text-[10px] text-gray-400">Rating</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="font-black text-lg text-pink-500">{seller.responseTime}</p>
            <p className="text-[10px] text-gray-400">Respuesta</p>
          </div>
        </div>

        <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-pink-500" /> Redes Sociales & Métricas
        </h3>
        <div className="space-y-2 mb-4">
          {seller.socialProof.map((s, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.icon}</span>
                <div>
                  <p className="text-xs font-bold text-gray-900">{s.platform}</p>
                  <p className="text-[10px] text-gray-400">{s.handle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-pink-500">{formatFollowers(s.followers)}</p>
                <p className="text-[10px] text-gray-400">{formatFollowers(s.monthlyReach)}/mes alcance</p>
              </div>
            </div>
          ))}
        </div>

        {seller.metricsScreenshots.length > 0 && (
          <>
            <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-pink-500" /> Capturas de Métricas
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {seller.metricsScreenshots.map((ss, i) => (
                <img key={i} src={ss} alt={`Métricas ${i + 1}`} className="w-48 h-32 object-cover rounded-xl flex-shrink-0 border border-gray-100" />
              ))}
            </div>
          </>
        )}

        <button onClick={onClose} className="w-full mt-4 btn-outline text-sm">Cerrar</button>
      </div>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════ */
function normalizeSeller(r: any): PromoSeller {
  return {
    id: r.id, name: r.name || '', avatar: r.avatar || '',
    isVerified: !!r.is_verified, isPro: !!r.is_pro,
    rating: Number(r.rating) || 0, reviews: Number(r.reviews) || 0, orders: Number(r.orders) || 0,
    responseTime: r.response_time || '', memberSince: r.member_since || '',
    bio: r.bio || '',
    socialProof: Array.isArray(r.social_proof) ? r.social_proof : [],
    metricsScreenshots: Array.isArray(r.metrics_screenshots) ? r.metrics_screenshots : [],
  };
}

function normalizeService(r: any): PromoService {
  return {
    id: r.id, sellerId: r.seller_id || '', sellerName: r.seller_name || '',
    sellerAvatar: r.seller_avatar || '',
    title: r.title || '', description: r.description || '',
    category: r.category || 'redes-sociales', categoryLabel: r.category_label || '',
    platforms: Array.isArray(r.platforms) ? r.platforms : [],
    price: Number(r.price) || 0, currency: r.currency || 'EUR',
    deliveryDays: Number(r.delivery_days) || 1,
    rating: Number(r.rating) || 0, reviews: Number(r.reviews) || 0, orders: Number(r.orders) || 0,
    cover: r.cover || '',
    tags: Array.isArray(r.tags) ? r.tags : [],
    includes: Array.isArray(r.includes) ? r.includes : [],
    extras: Array.isArray(r.extras) ? r.extras : [],
    platformFee: Number(r.platform_fee) || 0,
  };
}

const AdPlansBanner: React.FC<{ navigate: ReturnType<typeof useNavigate>; onOpenQR: () => void }> = ({ navigate, onOpenQR }) => (
  <section className="mb-8">
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-black p-5 sm:p-7">
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-pink-600/20 rounded-full blur-3xl" />
      <div className="relative">
        <div className="text-center mb-6">
          <span className="inline-block bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            Publicítate en BailaNow
          </span>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
            Haz que te vean <span className="bg-brand-orange bg-clip-text text-transparent">miles de bailarines</span>
          </h2>
          <p className="text-white/60 text-sm mt-2 max-w-2xl mx-auto">
            Destácate y activa tu negocio: reservas, ventas, código QR y presencia en el mapa. Activación inmediata, cancela cuando quieras.
          </p>
        </div>

        {/* ── Alta de cuenta de negocio (gratis) ── */}
        <div className="mb-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 flex-1 w-full">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-2xl flex-shrink-0">
              🏪
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-black text-base sm:text-lg text-white">Activa tu cuenta de negocio</h3>
                <span className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full">Gratis</span>
              </div>
              <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
                Da de alta tu escuela, local o marca gratis y aparece en BailaNow. Después elige un plan para desbloquear reservas, ventas, código QR y más.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0">
            <button
              onClick={onOpenQR}
              className="font-bold text-sm rounded-xl py-2.5 px-4 bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-4 h-4" /> Genera tu QR
            </button>
            <button
              onClick={() => navigate(`/chat?asunto=${encodeURIComponent('Quiero activar mi cuenta de negocio (gratis)')}`)}
              className="font-bold text-sm rounded-xl py-2.5 px-5 bg-white text-gray-900 hover:bg-gray-100 transition-all flex items-center justify-center gap-1.5"
            >
              Empezar gratis <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {AD_PLANS.map(plan => (
            <div key={plan.id}
              className={`relative rounded-2xl p-5 flex flex-col ${
                plan.popular
                  ? 'bg-white shadow-2xl shadow-fuchsia-500/20 ring-2 ring-fuchsia-400 sm:scale-105'
                  : 'bg-white/5 border border-white/10 backdrop-blur-sm'
              }`}>
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap">
                  ⚡ Más popular
                </span>
              )}
              <div className="text-center mb-3">
                <div className={`w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-2xl mb-2`}>
                  {plan.icon}
                </div>
                <h3 className={`font-display font-black text-lg ${plan.popular ? 'text-gray-900' : 'text-white'}`}>{plan.name}</h3>
                <p className={`text-[11px] font-bold ${plan.popular ? 'text-fuchsia-600' : 'text-pink-300'}`}>{plan.tagline}</p>
                <div className="mt-2 flex items-end justify-center gap-0.5">
                  <span className={`font-display font-black text-3xl ${plan.popular ? 'text-gray-900' : 'text-white'}`}>€{plan.price}</span>
                  <span className={`text-xs mb-1 ${plan.popular ? 'text-gray-400' : 'text-white/50'}`}>{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-1.5 flex-1 mb-4">
                {plan.features.map((f, i) => (
                  <li key={i} className={`flex items-start gap-1.5 text-xs ${plan.popular ? 'text-gray-600' : 'text-white/70'}`}>
                    <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${plan.popular ? 'text-fuchsia-500' : 'text-pink-400'}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(`/chat?asunto=${encodeURIComponent(`Quiero el plan de publicidad ${plan.name} (€${plan.price}${plan.period})`)}`)}
                className={`w-full font-bold text-sm rounded-xl py-2.5 transition-all flex items-center justify-center gap-1.5 ${
                  plan.popular
                    ? 'bg-brand-orange text-white hover:opacity-90'
                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                }`}>
                Contratar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-white/40 text-[11px] mt-4">
          💬 Activamos tu campaña en menos de 24h tras confirmar el pago por chat. Facturación mensual, sin permanencia.
        </p>
        <div className="text-center mt-3">
          <button onClick={() => navigate('/precios')} className="text-white/70 hover:text-white text-xs font-bold inline-flex items-center gap-1">
            Ver la página de precios para negocios <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </section>
);

const PromocionatePage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();
  const { addToast } = useUIStore();
  const cart = useCartStore();
  const [qrOpen, setQrOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [search, setSearch] = useState(params.get('q') || '');
  const [activeTab, setActiveTab] = useState(params.get('cat') || 'all');
  const [activePlatform, setActivePlatform] = useState(params.get('platform') || 'all');
  const [sellerFilter, setSellerFilter] = useState<string | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<PromoSeller | null>(null);
  const [bookingService, setBookingService] = useState<PromoService | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [services, setServices] = useState<PromoService[]>([]);
  const [sellers, setSellers] = useState<PromoSeller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from('promo_services').select('*').eq('admin_status', 'approved').order('orders', { ascending: false }),
      supabase.from('promo_sellers').select('*').order('rating', { ascending: false }),
    ]).then(([{ data: svc }, { data: sel }]) => {
      if (cancelled) return;
      setServices((svc || []).map(normalizeService));
      setSellers((sel || []).map(normalizeSeller));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return services.filter(s => {
      const matchCat = activeTab === 'all' || s.category === activeTab;
      const matchPlatform = activePlatform === 'all' ||
        s.platforms.some(p => p.name.toLowerCase() === activePlatform.toLowerCase());
      const matchSeller = !sellerFilter || s.sellerId === sellerFilter;
      const matchSearch = !q || s.title.toLowerCase().includes(q) || s.sellerName.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q)) || s.categoryLabel.toLowerCase().includes(q) ||
        s.platforms.some(p => p.name.toLowerCase().includes(q));
      return matchCat && matchPlatform && matchSeller && matchSearch;
    });
  }, [search, activeTab, activePlatform, sellerFilter]);

  // Conteo de servicios por plataforma (sin filtro de plataforma)
  const platformCounts = useMemo(() => {
    const map: Record<string, number> = { all: 0 };
    const baseSet = services.filter(s =>
      (activeTab === 'all' || s.category === activeTab) &&
      (!sellerFilter || s.sellerId === sellerFilter)
    );
    map.all = baseSet.length;
    baseSet.forEach(s => s.platforms.forEach(p => { map[p.name] = (map[p.name] || 0) + 1; }));
    return map;
  }, [activeTab, sellerFilter, services]);

  const handleBuy = (service: PromoService) => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    setBookingService(service);
  };

  const handleReserve = (service: PromoService) => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    cart.addItem({
      serviceId: service.id,
      sellerId: service.sellerId,
      sellerName: service.sellerName,
      sellerAvatar: service.sellerAvatar,
      title: service.title,
      price: service.price,
      currency: service.currency,
      extras: service.extras.map(e => ({ ...e, selected: false })),
    });
    addToast({ message: `"${service.title}" añadido al carrito`, type: 'success' });
  };

  const handleChat = (service: PromoService) => {
    if (!isAuthenticated) { navigate('/auth'); return; }
    addToast({ message: `Chat iniciado con ${service.sellerName}`, type: 'success' });
    navigate('/chat');
  };

  const cartItemIds = cart.items.map(i => i.serviceId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20 transition-colors">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-pink-600 via-fuchsia-600 to-purple-700 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-yellow-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">📢</span>
            <Badge variant="live" className="text-[10px]">NUEVO</Badge>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white mb-2">Promociónate</h1>
          <p className="text-white/80 text-sm sm:text-base max-w-xl mb-4">
            Promociona tu música, evento, escuela o marca en las redes sociales más grandes de la escena latina.
            Vendedores verificados, métricas reales y pagos seguros.
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { icon: '📱', label: '32+ cuentas', desc: 'Redes sociales' },
              { icon: '👥', label: '5M+', desc: 'Seguidores combinados' },
              { icon: '🛒', label: 'Reserva', desc: 'Paga todo junto' },
              { icon: '💬', label: 'Chat directo', desc: 'Con vendedores' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
                <span className="text-lg">{stat.icon}</span>
                <p className="text-white font-bold text-xs">{stat.label}</p>
                <p className="text-white/60 text-[10px]">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">

        {/* ── PLAN DE PUBLICIDAD EN BAILANOW (banner principal) ── */}
        <AdPlansBanner navigate={navigate} onOpenQR={() => setQrOpen(true)} />

        {/* ── Herramientas de negocio (accesos directos a lo que incluyen los planes) ── */}
        <BusinessToolsHub
          onNavigate={(path) => navigate(path)}
          onOpenQR={() => setQrOpen(true)}
          onOpenSplit={() => setSplitOpen(true)}
        />
        {/* How it works */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 relative z-10 mb-6">
          {[
            { icon: '🔍', title: 'Elige', desc: 'Servicios ideales' },
            { icon: '🛒', title: 'Reserva', desc: 'Añade al carrito' },
            { icon: '💳', title: 'Paga junto', desc: 'Un solo pago' },
            { icon: '📊', title: 'Resultados', desc: 'Métricas reales' },
          ].map(s => (
            <div key={s.icon} className="card-white rounded-xl p-2.5 sm:p-4 text-center shadow-lg">
              <span className="text-xl sm:text-2xl">{s.icon}</span>
              <p className="text-gray-900 font-bold text-[10px] sm:text-xs mt-1">{s.title}</p>
              <p className="text-gray-400 text-[8px] sm:text-[10px]">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mt-4" style={{ scrollbarWidth: 'none' }}>
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-orange text-white shadow-lg shadow-pink-500/25'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300'
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Sub-filtro por PLATAFORMA */}
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-1">📌 Filtra por plataforma</p>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {PLATFORM_TABS.map(p => {
              const count = platformCounts[p.id] || 0;
              const isActive = activePlatform === p.id;
              if (p.id !== 'all' && count === 0) return null;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePlatform(p.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    isActive
                      ? `bg-gradient-to-r ${p.color} text-white shadow-lg border-transparent scale-105`
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                    isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtro activo de vendedor */}
        {sellerFilter && (
          <div className="mt-3 flex items-center gap-2 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-700 rounded-xl px-3 py-2">
            <span className="text-xs text-pink-700 dark:text-pink-300 font-bold">
              👤 Mostrando solo servicios de: <strong>{sellers.find(s => s.id === sellerFilter)?.name}</strong>
            </span>
            <button onClick={() => setSellerFilter(null)} className="ml-auto text-pink-500 hover:text-pink-700 text-xs font-bold">
              ✕ Quitar filtro
            </button>
          </div>
        )}

        {/* ── BOTÓN CARRITO — inline debajo de los filtros ── */}
        {cart.items.length > 0 && (
          <button
            onClick={() => setCartOpen(true)}
            className="mt-4 w-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 text-white rounded-2xl shadow-2xl shadow-purple-500/30 px-5 py-3.5 flex items-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {/* Icono + badge */}
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-[11px] font-black flex items-center justify-center text-white shadow-lg border-2 border-white/30">
                {cart.items.length}
              </span>
            </div>

            {/* Texto */}
            <div className="flex-1 text-left">
              <p className="text-white/70 text-[10px] uppercase font-bold tracking-wide">Mi reserva</p>
              <p className="text-white font-black text-base leading-none">
                {cart.items.length} producto{cart.items.length > 1 ? 's' : ''} · listo{cart.items.length > 1 ? 's' : ''} para pagar
              </p>
            </div>

            {/* Total + flecha */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-white/60 text-[10px] uppercase font-bold">Total</p>
                <p className="text-white font-black text-xl leading-none">€{cart.getTotal().toFixed(2)}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
          </button>
        )}

        {/* Top Sellers */}
        <div className="mt-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-pink-500" /> Vendedores Verificados
            </h2>
          </div>
          <p className="text-xs text-gray-400 mb-2">💡 Toca un vendedor para ver SOLO sus servicios. Cada vendedor puede tener varios.</p>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {sellers.map(seller => {
              const isFiltering = sellerFilter === seller.id;
              const sellerServices = services.filter(s => s.sellerId === seller.id);
              return (
                <div key={seller.id} className={`flex-shrink-0 w-72 ${isFiltering ? 'ring-2 ring-pink-500 rounded-2xl' : ''}`}>
                  <div className="relative">
                    <SellerCard
                      seller={seller}
                      onClick={() => setSellerFilter(isFiltering ? null : seller.id)}
                    />
                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10 pointer-events-none">
                      <span className="bg-brand-orange text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                        {sellerServices.length} servicio{sellerServices.length !== 1 ? 's' : ''}
                      </span>
                      {isFiltering && (
                        <span className="bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                          ✓ Filtrando
                        </span>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedSeller(seller); }}
                      className="absolute bottom-2 right-2 bg-white/95 dark:bg-gray-900/95 text-pink-600 text-[10px] font-bold px-2 py-1 rounded-full shadow border border-pink-200 hover:bg-pink-50"
                    >
                      Ver perfil →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">{filtered.length}</span> servicios disponibles
          </p>
        </div>

        {/* Service Grid */}
        {loading ? (
          <div className="py-20 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-pink-500" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(service => (
              <PromoServiceCard
                key={service.id}
                service={service}
                onBuy={() => handleBuy(service)}
                onReserve={() => handleReserve(service)}
                onChat={() => handleChat(service)}
                isInCart={cartItemIds.includes(service.id)}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">{services.length === 0 ? '📢' : '🔍'}</p>
            <p className="text-gray-900 font-bold text-lg">{services.length === 0 ? 'Aún no hay servicios de promoción publicados' : 'No encontramos servicios'}</p>
            <p className="text-gray-400 text-sm mt-1">{services.length === 0 ? 'Vuelve pronto: estamos incorporando vendedores verificados.' : 'Prueba con otra búsqueda o categoría'}</p>
            {services.length > 0 && <button onClick={() => { setSearch(''); setActiveTab('all'); setActivePlatform('all'); setSellerFilter(null); }} className="btn-outline text-sm mt-4">Ver todos</button>}
          </div>
        )}

        {/* CTA bottom */}
        <div className="mt-10 bg-gray-800 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-fuchsia-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <span className="text-4xl">🚀</span>
            <h3 className="font-display font-black text-xl sm:text-2xl text-white mt-2 mb-2">¿Quieres vender tus servicios de promoción?</h3>
            <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
              Si tienes cuentas con audiencia latina, únete como vendedor y empieza a ganar dinero promocionando artistas y eventos.
            </p>
            <button onClick={() => navigate('/auth')} className="btn-orange">
              <Send className="w-4 h-4 inline mr-1" /> Conviértete en Vendedor
            </button>
          </div>
        </div>
      </div>

      {/* Sticky cart bar — solo cuando el drawer está CERRADO para no tapar el botón de pagar */}
      {cart.items.length > 0 && !cartOpen && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-[55] px-4 pb-3 lg:hidden pointer-events-none">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full pointer-events-auto bg-gradient-to-r from-purple-700 via-fuchsia-700 to-purple-700 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3"
            style={{ background: 'linear-gradient(90deg,#4f1e8c,#7c2fc0,#4f1e8c)' }}
          >
            <div className="relative flex-shrink-0">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-[10px] font-black flex items-center justify-center">
                {cart.items.length}
              </span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[10px] opacity-70">Mi reserva · {cart.items.length} servicio{cart.items.length > 1 ? 's' : ''}</p>
              <p className="text-sm font-black">€{cart.getTotal().toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-1 bg-white/20 rounded-xl px-3 py-1.5 flex-shrink-0">
              <span className="text-xs font-black">Ver carrito</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
      />

      {/* Checkout — Real Stripe + PayPal gateway */}
      <PaymentGateway open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />

      {/* Business QR generator */}
      <BusinessQRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        businessName={user?.name}
        profileSlug={user?.id}
      />

      {/* Split payment */}
      <SplitPaymentModal open={splitOpen} onClose={() => setSplitOpen(false)} />

      {/* Seller Modal */}
      {selectedSeller && <SellerModal seller={selectedSeller} onClose={() => setSelectedSeller(null)} />}

      {/* Booking Modal (direct purchase) */}
      {bookingService && (
        <BookingModal
          open={!!bookingService}
          onClose={() => setBookingService(null)}
          providerId={bookingService.sellerId}
          providerName={bookingService.sellerName}
          source="offer"
          defaultConcept={bookingService.title}
          defaultPrice={bookingService.price}
          helperText={`Comisión plataforma: ${bookingService.platformFee}%`}
        />
      )}
    </div>
  );
};

export default PromocionatePage;
