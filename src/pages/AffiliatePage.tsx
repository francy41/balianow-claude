import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useUIStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import {
  Users, DollarSign, TrendingUp, Copy, Share2, Gift,
  Star, ChevronRight, Link as LinkIcon, QrCode, Wallet,
  BarChart3, ArrowRight, Check, Zap, Crown, Target, Loader2
} from 'lucide-react';

const TIERS = [
  { name: 'Bronze', id: 'bronze', min: 0, rate: 8, color: 'bg-orange-700', icon: '🥉' },
  { name: 'Silver', id: 'silver', min: 10, rate: 10, color: 'bg-gray-400', icon: '🥈' },
  { name: 'Gold', id: 'gold', min: 25, rate: 12, color: 'bg-yellow-500', icon: '🥇' },
  { name: 'Diamond', id: 'diamond', min: 50, rate: 15, color: 'bg-purple-500', icon: '💎' },
];

const PROMO_MATERIALS = [
  { id: 1, name: 'Banner Instagram Story', type: 'image', size: '1080x1920' },
  { id: 2, name: 'Banner Feed IG/FB', type: 'image', size: '1080x1080' },
  { id: 3, name: 'Flyer WhatsApp', type: 'image', size: '800x600' },
  { id: 4, name: 'Video Promo 15s', type: 'video', size: '1080x1920' },
];

const AffiliatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [tab, setTab] = useState<'dashboard' | 'referrals' | 'materials' | 'payouts'>('dashboard');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data: aff } = await supabase.from('affiliates').select('*').eq('user_id', session.user.id).maybeSingle();
    setAffiliate(aff || null);
    if (aff) {
      const { data: refs } = await supabase.from('affiliate_referrals').select('*').eq('affiliate_id', aff.id).order('created_at', { ascending: false }).limit(100);
      setReferrals(refs || []);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const joinProgram = async () => {
    setJoining(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/auth'); return; }
    const first = (user?.name || session.user.email || 'BAILA').split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
    const code = `BAILA-${first}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const { data, error } = await supabase.from('affiliates').insert({
      user_id: session.user.id, code, tier: 'bronze', status: 'pending', commission_rate: 0.08,
    }).select().single();
    setJoining(false);
    if (error) { addToast({ message: `No se pudo registrar: ${error.message}`, type: 'error' }); return; }
    setAffiliate(data);
    addToast({ message: '🎉 Solicitud enviada. Te activaremos pronto.', type: 'success' });
  };

  // Stats derivados del registro real (0 si aún no es afiliado)
  const tierInfo = TIERS.find(t => t.id === (affiliate?.tier || 'bronze')) || TIERS[0];
  const stats = {
    totalEarnings: Number(affiliate?.total_earnings) || 0,
    pendingPayout: Number(affiliate?.pending_payout) || 0,
    totalReferrals: Number(affiliate?.total_referrals) || referrals.length,
    activeReferrals: Number(affiliate?.active_referrals) || 0,
    conversionRate: affiliate?.total_clicks ? Math.round(((affiliate.total_referrals || 0) / affiliate.total_clicks) * 100) : 0,
    clicks: Number(affiliate?.total_clicks) || 0,
    tier: tierInfo.name,
    commissionRate: Math.round((Number(affiliate?.commission_rate) || 0.08) * 100),
  };

  const referralCode = affiliate?.code || '—';
  const referralLink = affiliate ? `https://bailanow.com/?ref=${referralCode}` : 'https://bailanow.com';

  const copyLink = () => {
    if (!affiliate) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    addToast({ message: 'Link copiado al portapapeles', type: 'success' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-xl">
          <div className="text-6xl mb-4">🤝</div>
          <h1 className="font-display font-black text-2xl text-gray-900 mb-2">Programa de Afiliados & RRPP</h1>
          <p className="text-gray-500 text-sm mb-6">Gana comisiones por cada persona que traigas a BailaNow. Comparte tu link, genera ingresos.</p>
          <button onClick={() => navigate('/auth')} className="btn-orange w-full py-3 text-sm font-bold rounded-xl">
            Iniciar Sesion para Empezar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 via-brand-secondary to-brand px-4 pt-6 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🤝</span>
            <h1 className="font-display font-black text-2xl text-white">Afiliados & RRPP</h1>
          </div>
          <p className="text-white/70 text-sm">Gana comisiones por cada venta que generes</p>

          {/* Referral Link Card */}
          {loading ? (
            <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 flex justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          ) : !affiliate ? (
            <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center">
              <p className="text-white font-bold text-sm mb-1">Aún no eres afiliado</p>
              <p className="text-white/60 text-xs mb-4">Únete al programa y recibe tu link único para empezar a ganar comisiones.</p>
              <button onClick={joinProgram} disabled={joining}
                className="bg-white text-brand font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-gray-100 transition-all inline-flex items-center gap-2 disabled:opacity-60">
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                {joining ? 'Enviando…' : 'Unirme al programa'}
              </button>
            </div>
          ) : (
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            {affiliate.status !== 'active' && (
              <div className="mb-3 bg-yellow-400/20 border border-yellow-300/30 rounded-xl px-3 py-2 text-yellow-100 text-[11px] font-semibold">
                {affiliate.status === 'pending' ? '⏳ Tu solicitud está pendiente de aprobación. Ya puedes compartir tu link.' : '⚠ Tu cuenta de afiliado está suspendida.'}
              </div>
            )}
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-2">Tu link de afiliado</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-mono truncate border border-white/10">
                {referralLink}
              </div>
              <button onClick={copyLink}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-white text-brand hover:bg-gray-100'
                }`}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button onClick={copyLink} className="p-2.5 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <p className="text-white/50 text-[10px]">Codigo: <span className="text-white font-bold">{referralCode}</span></p>
              <span className="text-white/30">|</span>
              <p className="text-white/50 text-[10px]">Tier: <span className="text-yellow-300 font-bold">{stats.tier} {TIERS.find(t => t.name === stats.tier)?.icon}</span></p>
              <span className="text-white/30">|</span>
              <p className="text-white/50 text-[10px]">Comision: <span className="text-emerald-300 font-bold">{stats.commissionRate}%</span></p>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-5xl mx-auto px-4 -mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <DollarSign className="w-5 h-5 text-emerald-500 mb-1" />
            <p className="text-[10px] text-gray-400 uppercase font-bold">Total ganado</p>
            <p className="text-2xl font-black text-gray-900">€{stats.totalEarnings}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <Wallet className="w-5 h-5 text-yellow-500 mb-1" />
            <p className="text-[10px] text-gray-400 uppercase font-bold">Pendiente pago</p>
            <p className="text-2xl font-black text-gray-900">€{stats.pendingPayout}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <Users className="w-5 h-5 text-brand-secondary mb-1" />
            <p className="text-[10px] text-gray-400 uppercase font-bold">Referidos</p>
            <p className="text-2xl font-black text-gray-900">{stats.totalReferrals}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <TrendingUp className="w-5 h-5 text-brand mb-1" />
            <p className="text-[10px] text-gray-400 uppercase font-bold">Conversion</p>
            <p className="text-2xl font-black text-gray-900">{stats.conversionRate}%</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {[
            { id: 'dashboard' as const, label: 'Dashboard', icon: <BarChart3 className="w-3.5 h-3.5" /> },
            { id: 'referrals' as const, label: 'Referidos', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'materials' as const, label: 'Material', icon: <Gift className="w-3.5 h-3.5" /> },
            { id: 'payouts' as const, label: 'Pagos', icon: <Wallet className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                tab === t.id ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {/* Tier Progress */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-500" /> Tu Nivel de Afiliado
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {TIERS.map(tier => {
                  const isActive = tier.name === stats.tier;
                  return (
                    <div key={tier.name}
                      className={`rounded-xl p-3 text-center transition-all ${
                        isActive ? 'bg-pink-50 border-2 border-brand shadow-lg shadow-brand/10' : 'bg-gray-50 border border-gray-200'
                      }`}>
                      <div className="text-2xl mb-1">{tier.icon}</div>
                      <p className={`text-xs font-black ${isActive ? 'text-brand' : 'text-gray-500'}`}>{tier.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{tier.rate}% comision</p>
                      <p className="text-[9px] text-gray-300 mt-0.5">{tier.min}+ referidos</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" /> Como Funciona
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { step: '1', icon: <LinkIcon className="w-5 h-5" />, title: 'Comparte tu link', desc: 'Envia tu link unico a amigos, redes sociales o WhatsApp' },
                  { step: '2', icon: <Target className="w-5 h-5" />, title: 'Ellos compran', desc: 'Cuando compren entradas, servicios o suscripciones a traves de tu link' },
                  { step: '3', icon: <DollarSign className="w-5 h-5" />, title: 'Tu ganas', desc: `Recibes ${stats.commissionRate}% de comision automaticamente` },
                ].map(s => (
                  <div key={s.step} className="text-center p-4 rounded-xl bg-pink-50/50">
                    <div className="w-10 h-10 rounded-full bg-pink-100 text-brand flex items-center justify-center mx-auto mb-2">
                      {s.icon}
                    </div>
                    <p className="font-bold text-sm text-gray-900">{s.title}</p>
                    <p className="text-gray-500 text-xs mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 mb-3">Actividad Reciente</h3>
              {referrals.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">Aún no tienes referidos. Comparte tu link para empezar a ganar.</p>
              ) : (
              <div className="space-y-2">
                {referrals.slice(0, 4).map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{r.referred_name || 'Referido'}</p>
                      <p className="text-[10px] text-gray-400">{r.source || '—'} · {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">+€{(Number(r.commission) || 0).toFixed(2)}</p>
                      <p className={`text-[9px] font-bold uppercase ${r.status === 'paid' ? 'text-emerald-500' : 'text-yellow-500'}`}>
                        {r.status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        )}

        {tab === 'referrals' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-900">Historial de Referidos ({referrals.length})</h3>
            </div>
            {referrals.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Todavía no hay referidos registrados. Cuando alguien compre con tu link, aparecerá aquí.</p>
              </div>
            ) : (
            <div className="divide-y divide-gray-50">
              {referrals.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{r.referred_name || 'Referido'}</p>
                    <p className="text-xs text-gray-400">{r.source || '—'}</p>
                    <p className="text-[10px] text-gray-300">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-500 text-xs">Venta: €{Number(r.amount) || 0}</p>
                    <p className="text-emerald-600 font-bold text-sm">+€{(Number(r.commission) || 0).toFixed(2)}</p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      r.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      {r.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {tab === 'materials' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2">
                <Gift className="w-4 h-4 text-brand" /> Material Promocional
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {PROMO_MATERIALS.map(m => (
                  <div key={m.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-pink-300 transition-colors">
                    <div className="w-full h-24 bg-brand-orange rounded-lg mb-3 flex items-center justify-center">
                      <span className="text-3xl">{m.type === 'video' ? '🎬' : '🖼️'}</span>
                    </div>
                    <p className="font-semibold text-xs text-gray-900">{m.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{m.size} · {m.type}</p>
                    <button className="mt-2 w-full bg-pink-50 hover:bg-pink-100 text-brand text-xs font-bold py-1.5 rounded-lg transition-colors">
                      Descargar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <QrCode className="w-8 h-8 text-brand mx-auto mb-2" />
              <h3 className="font-bold text-sm text-gray-900 mb-1">Tu Codigo QR</h3>
              <p className="text-gray-400 text-xs mb-4">Imprime o comparte este QR con tu link de afiliado</p>
              <div className="w-40 h-40 bg-gray-100 rounded-xl mx-auto flex items-center justify-center border-2 border-dashed border-gray-300">
                <QrCode className="w-20 h-20 text-gray-400" />
              </div>
              <button className="mt-4 bg-brand hover:bg-brand-orange-dark text-white text-xs font-bold px-6 py-2 rounded-full transition-all">
                Descargar QR
              </button>
            </div>
          </div>
        )}

        {tab === 'payouts' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-gray-900">Solicitar Pago</h3>
                <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full">
                  Disponible: €{stats.pendingPayout}
                </span>
              </div>
              <p className="text-gray-400 text-xs mb-4">Minimo de retiro: 50. Pago via transferencia bancaria o PayPal.</p>
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-brand hover:bg-brand-orange-dark text-white font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  <Wallet className="w-4 h-4" /> Solicitar Pago
                </button>
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Ver Historial
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm text-gray-900 mb-3">Historial de Pagos</h3>
              <p className="text-gray-400 text-sm py-4 text-center">Todavía no has recibido pagos. Aparecerán aquí una vez procesados tus retiros.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliatePage;
