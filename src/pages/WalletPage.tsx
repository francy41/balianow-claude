import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, Plus, CreditCard, RefreshCw } from 'lucide-react';
import { useAuthStore, useUIStore } from '../store/appStore';
import { Button, Card } from '../components/ui';

const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addToast } = useUIStore();
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💳</div>
          <p className="text-gray-600 mb-4">Inicia sesión para ver tu wallet</p>
          <Button variant="orange" onClick={() => navigate('/auth')}>Iniciar Sesión</Button>
        </div>
      </div>
    );
  }

  const transactions = [
    { id: 1, type: 'income',  desc: 'Pago por DJ Set — Boda García',    amount: 450,  date: '12 May 2026', status: 'completed' },
    { id: 2, type: 'outcome', desc: 'Comisión plataforma (15%)',          amount: -67.5, date: '12 May 2026', status: 'completed' },
    { id: 3, type: 'income',  desc: 'Clase privada — Carlos R.',          amount: 120,  date: '8 May 2026',  status: 'completed' },
    { id: 4, type: 'outcome', desc: 'Suscripción Pro (Mayo)',              amount: -50,  date: '1 May 2026',  status: 'completed' },
    { id: 5, type: 'pending', desc: 'Pago pendiente — Festival BCN',      amount: 350,  date: '15 May 2026', status: 'pending' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="font-display font-black text-3xl text-gray-900 mb-6">💳 Mi Wallet</h1>

        {/* Balance Card */}
        <div className="bg-gray-900 rounded-3xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-orange/20 to-transparent pointer-events-none" />
          <p className="text-white/60 text-sm mb-1">Saldo disponible</p>
          <p className="font-black text-5xl text-white">€{user.wallet.toFixed(2)}</p>
          <p className="text-white/40 text-xs mt-2">Actualizado ahora · Plataforma ¡Ritmo Latino!</p>

          <div className="flex gap-3 mt-6">
            <Button variant="orange" icon={<Plus className="w-4 h-4" />} onClick={() => setShowDeposit(true)} className="flex-1">
              Recargar
            </Button>
            <button
              onClick={() => addToast({ message: 'Solicitud de retiro procesada', type: 'success' })}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/20 text-white text-sm font-semibold hover:bg-white/10 transition-all"
            >
              <ArrowUpRight className="w-4 h-4" /> Retirar
            </button>
          </div>
        </div>

        {/* Escrow info */}
        <div className="card-white rounded-2xl p-4 mb-6 flex items-center gap-3 border-l-4 border-yellow-400">
          <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
            <span className="text-yellow-500 text-xl">🔒</span>
          </div>
          <div>
            <p className="text-gray-900 font-semibold text-sm">€350 en escrow</p>
            <p className="text-gray-400 text-xs">Fondos retenidos · Festival BCN (pendiente confirmación)</p>
          </div>
        </div>

        {/* Deposit panel */}
        {showDeposit && (
          <div className="card-white rounded-2xl p-4 mb-6 border border-brand-orange/30">
            <h3 className="text-gray-900 font-semibold mb-3">Recargar Wallet</h3>
            <div className="flex gap-2 mb-3">
              {['10', '25', '50', '100', '200'].map(amount => (
                <button key={amount} onClick={() => setDepositAmount(amount)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${depositAmount === amount ? 'bg-brand-orange text-white border-brand-orange' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-brand-orange hover:text-brand-orange'}`}>
                  €{amount}
                </button>
              ))}
            </div>
            <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
              placeholder="Otro importe..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 mb-3 text-sm" />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowDeposit(false)} className="flex-1">Cancelar</Button>
              <Button variant="orange" className="flex-1" icon={<CreditCard className="w-4 h-4" />} onClick={() => {
                setShowDeposit(false);
                addToast({ message: `€${depositAmount} añadidos a tu wallet (demo)`, type: 'success' });
              }}>
                Pagar con Stripe
              </Button>
            </div>
            <p className="text-gray-400 text-xs text-center mt-2">Pagos seguros con Stripe · Visa · Mastercard · PayPal</p>
          </div>
        )}

        {/* Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Historial</h2>
            <button className="text-brand-orange text-sm flex items-center gap-1 hover:text-brand-orange-dark">
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </button>
          </div>
          <div className="space-y-2">
            {transactions.map(tx => (
              <Card key={tx.id} className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  tx.type === 'income' ? 'bg-emerald-100' : tx.type === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  {tx.type === 'income' ? <ArrowDownLeft className="w-5 h-5 text-emerald-600" /> :
                   tx.type === 'pending' ? <RefreshCw className="w-5 h-5 text-yellow-600" /> :
                   <ArrowUpRight className="w-5 h-5 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-medium truncate">{tx.desc}</p>
                  <p className="text-gray-400 text-xs">{tx.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {tx.amount > 0 ? '+' : ''}€{Math.abs(tx.amount).toFixed(2)}
                  </p>
                  <p className={`text-xs ${tx.status === 'pending' ? 'text-yellow-500' : 'text-gray-300'}`}>
                    {tx.status === 'pending' ? 'Pendiente' : 'Completado'}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-pink-50 rounded-2xl p-4 text-center border border-pink-100">
          <p className="text-gray-500 text-xs">
            ¡Ritmo Latino! aplica una comisión del <span className="text-gray-900 font-semibold">15%</span> sobre cada transacción.<br />
            Pagos asegurados con escrow. Liberación tras confirmación del servicio.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
