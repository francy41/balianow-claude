import React from 'react';

/**
 * Bloque base con efecto shimmer (clase `.skeleton` definida en index.css,
 * con soporte de dark mode y prefers-reduced-motion).
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} aria-hidden="true" />
);

/** Skeleton de una tarjeta de listado (artista / local / evento). */
export const CardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
    <Skeleton className="h-40 w-full !rounded-none" />
    <div className="p-4 space-y-2.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 !rounded-full" />
        <Skeleton className="h-5 w-12 !rounded-full" />
      </div>
    </div>
  </div>
);

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
