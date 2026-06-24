// Estado de propiedad de un perfil/entidad.
// Un perfil solo es "real" (vendible, reservable, contratable) cuando tiene
// dueño verificado: el superadmin asigna `user_id` al aprobar una reclamación.
// Mientras `user_id` esté vacío, la entidad es un perfil importado/placeholder
// y NO puede transaccionar — solo puede ser reclamado.

export const isClaimed = (ownerId?: string | null): boolean =>
  !!(ownerId && String(ownerId).trim());

// Mensaje único para toasts cuando se intenta comprar/reservar un perfil sin dueño.
export const UNCLAIMED_TOAST =
  'Este perfil aún no ha sido reclamado por su dueño. No se pueden hacer reservas ni compras hasta que el propietario lo verifique.';

// Etiqueta corta por tipo de entidad (para el banner).
export const UNCLAIMED_LABEL: Record<string, string> = {
  artist: 'Este artista',
  event: 'Este evento',
  venue: 'Este local',
  service: 'Este servicio',
};
