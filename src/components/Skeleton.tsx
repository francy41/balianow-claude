import React from 'react';
import { Skeleton, CardSkeleton } from './ui';

/**
 * Skeletons de carga.
 *
 * `Skeleton` y `CardSkeleton` viven en `./ui` (fuente única del design system);
 * aquí solo se reexportan para no romper los imports que ya apuntan a este
 * fichero. Lo propio de este módulo es `CardGridSkeleton`.
 */
export { Skeleton, CardSkeleton };

/** Rejilla de skeletons de tarjeta. */
export const CardGridSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 8,
  className = 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4',
}) => (
  <div className={className}>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export default Skeleton;
