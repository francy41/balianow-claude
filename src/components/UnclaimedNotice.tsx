import React from 'react';
import { ShieldAlert } from 'lucide-react';
import ClaimProfileButton from './ClaimProfileButton';
import { UNCLAIMED_LABEL } from '../lib/ownership';

type TargetTable = 'artists' | 'events' | 'venues' | 'services';

interface Props {
  targetTable: TargetTable;
  targetId: string;
  targetName: string;
  /** Tipo singular para el texto (artist/event/venue/service) */
  kind: keyof typeof UNCLAIMED_LABEL;
}

// Banner que sustituye al CTA de compra/reserva cuando la entidad no tiene dueño.
// Explica por qué no se puede transaccionar e invita a reclamar el perfil.
const UnclaimedNotice: React.FC<Props> = ({ targetTable, targetId, targetName, kind }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
      <ShieldAlert className="w-5 h-5 text-amber-600" />
    </div>
    <p className="font-bold text-amber-800 text-sm">Perfil aún no reclamado</p>
    <p className="text-amber-700 text-xs mt-1 mb-3">
      {UNCLAIMED_LABEL[kind]} todavía no tiene un dueño verificado, por lo que no se
      pueden hacer reservas ni compras. ¿Eres el propietario?
    </p>
    <div className="flex justify-center">
      <ClaimProfileButton
        targetTable={targetTable}
        targetId={targetId}
        targetName={targetName}
        hasOwner={false}
      />
    </div>
  </div>
);

export default UnclaimedNotice;
