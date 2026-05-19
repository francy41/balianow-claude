import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, ShoppingBag, ShoppingCart, CheckCircle, Clock, TrendingUp, Shield, Users, Eye, Send, X, Trash2, CreditCard, Plus, Minus } from 'lucide-react';
import { PROMO_SERVICES, PROMO_SELLERS } from '../data/mockData';
import type { PromoService, PromoSeller } from '../data/mockData';
import { useAuthStore, useUIStore, useCartStore, PLATFORM_COMMISSION_RATE } from '../store/appStore';
import { StarRating, Badge, SearchBar } from '../components/ui';
import BookingModal from '../components/BookingModal';

const CATEGORY_TABS = [
  { id: 'all', label: 'Todo', icon: '🔥' },
  { id: 'redes-sociales', label: 'Redes Sociales', icon: '📱' },
  { id: 'spotify-playlists', label: 'Spotify & Playlists', icon: '🎧' },
  { id: 'video-promo', label: 'Video Promo', icon: '🎬' },
  { id: 'influencers', label: 'Influencers', icon: '⭐' },
  { id: 'prensa-blogs', label: 'Prensa & Blogs', icon: '📰' },
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
          {seller.isPro && <span className="text-[8px] bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-1.5 py-0.5 rounded font-black">PRO</span>}
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
          <button onClick={onBuy} className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-bold rounded-xl py-2.5 text-xs hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25">
            <ShoppingBag className="w-3.5 h-3.5" /> Contratar
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Cart Drawer ── */
const CartDrawer: React.FC<{ open: boolean; onClose: () => void; onCheckout: () => void }> = ({ open, onClose, onCheckout }) => {
  const { items, removeItem, toggleExtra, getSubtotal, getCommission, getTotal } = useCartStore();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-[slideInRight_0.3s_ease]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-white">
            <ShoppingCart className="w-5 h-5" />
            <h2 className="font-black text-lg">Mi Reserva</h2>
            <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold">{items.length}</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin' }}>
          {items.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-900 font-bold">Tu carrito está vacío</p>
              <p className="text-gray-400 text-sm mt-1">Reserva servicios y págalos todos juntos</p>
            </div>
          ) : (
            items.map(item => {
              const extrasTotal = item.extras.filter(e => e.selected).reduce((s, e) => s + e.price, 0);
              const itemTotal = item.price + extrasTotal;
              return (
                <div key={item.id} className="card-white rounded-xl p-3 border border-gray-100">
                  <div className="flex items-start gap-3">
                    <img src={item.sellerAvatar} alt={item.sellerName} className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 line-clamp-2">{item.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.sellerName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-black text-sm text-pink-500">€{itemTotal}</span>
                      <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Extras toggles */}
                  {item.extras.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Extras</p>
                      {item.extras.map((extra, idx) => (
                        <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={extra.selected}
                            onChange={() => toggleExtra(item.id, idx)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                          />
                          <span className={`text-[11px] flex-1 ${extra.selected ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                            {extra.label}
                          </span>
                          <span className={`text-[11px] font-bold ${extra.selected ? 'text-pink-500' : 'text-gray-300'}`}>
                            +€{extra.price}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Summary & Checkout */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-4 space-y-3 flex-shrink-0 bg-gray-50 dark:bg-gray-800">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal ({items.length} servicio{items.length > 1 ? 's' : ''})</span>
                <span className="text-gray-900 font-bold">€{getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Comisión plataforma (15%)</span>
                <span className="text-gray-400 text-xs">incluida en precio</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="text-gray-900 font-black text-lg">Total</span>
                <span className="text-pink-500 font-black text-xl">€{getTotal().toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={onCheckout}
              className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-black rounded-xl py-3.5 text-sm hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" /> Pagar todo junto
            </button>
          </div>
        )}
      </div>
    </>
  );
};

/* ── Checkout Modal ── */
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
              className="w-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white font-black rounded-xl py-4 text-sm hover:from-pink-600 hover:to-fuchsia-700 transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
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
              {seller.isPro && <span className="text-[9px] bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white px-2 py-0.5 rounded font-black">PRO</span>}
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
const PromocionatePage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const cart = useCartStore();
  const [search, setSearch] = useState(params.get('q') || '');
  const [activeTab, setActiveTab] = useState(params.get('cat') || 'all');
  const [selectedSeller, setSelectedSeller] = useState<PromoSeller | null>(null);
  const [bookingService, setBookingService] = useState<PromoService | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return PROMO_SERVICES.filter(s => {
      const matchCat = activeTab === 'all' || s.category === activeTab;
      const matchSearch = !q || s.title.toLowerCase().includes(q) || s.sellerName.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q)) || s.categoryLabel.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeTab]);

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
        {/* How it works */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 -mt-5 relative z-10 mb-6">
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

        {/* Search */}
        <SearchBar
          placeholder="Busca servicios de promoción, vendedores, plataformas..."
          value={search}
          onChange={setSearch}
        />

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mt-4" style={{ scrollbarWidth: 'none' }}>
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/25'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300'
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Top Sellers */}
        <div className="mt-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-pink-500" /> Vendedores Verificados
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {PROMO_SELLERS.map(seller => (
              <div key={seller.id} className="flex-shrink-0 w-72">
                <SellerCard seller={seller} onClick={() => setSelectedSeller(seller)} />
              </div>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">{filtered.length}</span> servicios disponibles
          </p>
        </div>

        {/* Service Grid */}
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

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🔍</p>
            <p className="text-gray-900 font-bold text-lg">No encontramos servicios</p>
            <p className="text-gray-400 text-sm mt-1">Prueba con otra búsqueda o categoría</p>
            <button onClick={() => { setSearch(''); setActiveTab('all'); }} className="btn-outline text-sm mt-4">Ver todos</button>
          </div>
        )}

        {/* CTA bottom */}
        <div className="mt-10 bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
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

      {/* Floating Cart Button */}
      {cart.items.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-24 lg:bottom-4 left-4 z-[55] bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3 hover:scale-105 transition-all animate-bounce"
          style={{ animationDuration: '2s', animationIterationCount: '3' }}
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-[10px] font-black flex items-center justify-center">
              {cart.items.length}
            </span>
          </div>
          <div className="text-left">
            <p className="text-[10px] opacity-70">Mi reserva</p>
            <p className="text-sm font-black">€{cart.getTotal().toFixed(2)}</p>
          </div>
        </button>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
      />

      {/* Checkout Modal */}
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />

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
