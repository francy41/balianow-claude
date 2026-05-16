import React, { useState } from 'react';
import { CreditCard, Plus, Trash2, Shield, Check } from 'lucide-react';
import { usePerformerStore, useUIStore, type PaymentMethod } from '../store/appStore';
import { Button } from './ui';

interface Props {
  userId: string;
  holderDefault?: string;
  title?: string;
  subtitle?: string;
}

const TYPE_INFO: Record<PaymentMethod['type'], { icon: string; label: string }> = {
  card:   { icon: '💳', label: 'Tarjeta' },
  paypal: { icon: '🅿️', label: 'PayPal' },
  stripe: { icon: '⚡', label: 'Stripe' },
};

const BRAND_INFO: Record<NonNullable<PaymentMethod['brand']>, { color: string; label: string }> = {
  visa:       { color: 'bg-blue-600',   label: 'VISA' },
  mastercard: { color: 'bg-orange-500', label: 'Mastercard' },
  amex:       { color: 'bg-blue-400',   label: 'Amex' },
  discover:   { color: 'bg-orange-600', label: 'Discover' },
};

const PaymentMethodsPanel: React.FC<Props> = ({
  userId,
  holderDefault = '',
  title = 'Métodos de pago',
  subtitle = 'Tarjetas, PayPal o Stripe para pagar reservas, cursos y servicios.'
}) => {
  const { paymentMethods, addPaymentMethod, removePaymentMethod, setDefaultPaymentMethod } = usePerformerStore();
  const { addToast } = useUIStore();
  const mine = paymentMethods.filter(p => p.userId === userId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'card' as PaymentMethod['type'],
    holderName: holderDefault,
    cardNumber: '',
    expMonth: '',
    expYear: '',
    cvc: '',
    paypalEmail: '',
  });

  const detectBrand = (num: string): PaymentMethod['brand'] => {
    const n = num.replace(/\s/g, '');
    if (n.startsWith('4')) return 'visa';
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    if (/^6/.test(n)) return 'discover';
    return 'visa';
  };

  const submit = () => {
    if (!form.holderName.trim()) { addToast({ message: 'Introduce el nombre del titular', type: 'error' }); return; }
    if (form.type === 'card') {
      const clean = form.cardNumber.replace(/\s/g, '');
      if (clean.length < 13 || clean.length > 19) {
        addToast({ message: 'Número de tarjeta inválido', type: 'error' }); return;
      }
      if (!form.expMonth || !form.expYear) {
        addToast({ message: 'Fecha de expiración inválida', type: 'error' }); return;
      }
      addPaymentMethod({
        userId, type: 'card',
        brand: detectBrand(clean),
        last4: clean.slice(-4),
        expMonth: parseInt(form.expMonth, 10),
        expYear: parseInt(form.expYear, 10),
        holderName: form.holderName.trim(),
        isDefault: mine.length === 0,
      });
    } else if (form.type === 'paypal') {
      if (!form.paypalEmail.includes('@')) {
        addToast({ message: 'Email PayPal inválido', type: 'error' }); return;
      }
      addPaymentMethod({
        userId, type: 'paypal',
        account: form.paypalEmail.trim(),
        holderName: form.holderName.trim(),
        isDefault: mine.length === 0,
      });
    } else {
      addPaymentMethod({
        userId, type: 'stripe',
        account: `cus_${Date.now()}`,
        holderName: form.holderName.trim(),
        isDefault: mine.length === 0,
      });
    }
    addToast({ message: 'Método de pago añadido', type: 'success' });
    setShowForm(false);
    setForm({ type: 'card', holderName: holderDefault, cardNumber: '', expMonth: '', expYear: '', cvc: '', paypalEmail: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-black text-xl text-gray-900">{title}</h2>
          <p className="text-gray-400 text-sm">{subtitle}</p>
        </div>
        <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancelar' : 'Añadir método'}
        </Button>
      </div>

      {showForm && (
        <div className="card-white p-5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(['card', 'paypal', 'stripe'] as const).map(t => (
              <button key={t} onClick={() => setForm({ ...form, type: t })}
                className={`p-3 rounded-xl border text-center transition-all ${
                  form.type === t ? 'border-brand-orange bg-orange-50' : 'border-gray-200 bg-white hover:border-brand-orange/50'
                }`}>
                <div className="text-2xl mb-1">{TYPE_INFO[t].icon}</div>
                <p className="text-sm font-bold text-gray-900">{TYPE_INFO[t].label}</p>
              </button>
            ))}
          </div>

          <input value={form.holderName} onChange={e => setForm({ ...form, holderName: e.target.value })}
            placeholder="Nombre del titular (igual que en la tarjeta)" className="input-field" />

          {form.type === 'card' && (
            <>
              <input value={form.cardNumber}
                onChange={e => {
                  // Format card number with spaces
                  const v = e.target.value.replace(/\D/g, '').slice(0, 19);
                  setForm({ ...form, cardNumber: v.replace(/(\d{4})(?=\d)/g, '$1 ') });
                }}
                placeholder="1234 1234 1234 1234"
                inputMode="numeric"
                className="input-field font-mono" />
              <div className="grid grid-cols-3 gap-2">
                <input value={form.expMonth} onChange={e => setForm({ ...form, expMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                  placeholder="MM" maxLength={2} inputMode="numeric" className="input-field text-center" />
                <input value={form.expYear} onChange={e => setForm({ ...form, expYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="YYYY" maxLength={4} inputMode="numeric" className="input-field text-center" />
                <input value={form.cvc} onChange={e => setForm({ ...form, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="CVC" maxLength={4} inputMode="numeric" className="input-field text-center" />
              </div>
            </>
          )}

          {form.type === 'paypal' && (
            <input value={form.paypalEmail} onChange={e => setForm({ ...form, paypalEmail: e.target.value })}
              placeholder="tu-email@paypal.com" className="input-field" type="email" />
          )}

          {form.type === 'stripe' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-gray-700">
              Serás redirigido a Stripe para conectar tu cuenta. (Mock: se creará un customer ID al guardar.)
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-gray-700 flex items-start gap-2">
            <Shield className="w-4 h-4 text-green-700 flex-shrink-0 mt-0.5" />
            Tus datos viajan cifrados (TLS) y nunca se almacenan en texto claro. Solo guardamos los últimos 4 dígitos.
          </div>

          <Button variant="orange" className="w-full" onClick={submit}>
            <Check className="w-4 h-4" /> Guardar método de pago
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {mine.length === 0 && !showForm && (
          <div className="card-white p-10 text-center text-gray-400">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aún no tienes métodos de pago.</p>
            <p className="text-xs text-gray-400 mt-1">Añade uno para poder reservar y contratar servicios.</p>
          </div>
        )}
        {mine.map(m => (
          <div key={m.id} className="card-white p-4 flex items-center gap-3">
            {m.type === 'card' && m.brand ? (
              <div className={`${BRAND_INFO[m.brand].color} text-white text-[10px] font-black w-14 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
                {BRAND_INFO[m.brand].label}
              </div>
            ) : (
              <div className="text-3xl">{TYPE_INFO[m.type].icon}</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-gray-900 text-sm">
                  {m.type === 'card'
                    ? <>•••• •••• •••• <span className="font-mono">{m.last4}</span></>
                    : m.type === 'paypal' ? m.account : 'Stripe Customer'}
                </p>
                {m.isDefault && <span className="text-[10px] bg-brand-orange text-white px-2 py-0.5 rounded-full font-bold uppercase">Default</span>}
              </div>
              <p className="text-xs text-gray-400">
                {m.holderName}
                {m.type === 'card' && m.expMonth && m.expYear && ` · Vence ${String(m.expMonth).padStart(2, '0')}/${m.expYear}`}
              </p>
            </div>
            <div className="flex gap-2">
              {!m.isDefault && (
                <button onClick={() => setDefaultPaymentMethod(userId, m.id)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-lg">
                  Hacer default
                </button>
              )}
              <button onClick={() => { removePaymentMethod(m.id); addToast({ message: 'Método eliminado', type: 'info' }); }}
                className="text-xs bg-red-50 hover:bg-red-100 text-red-500 font-bold p-1.5 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethodsPanel;
