/**
 * ProtectedRoute — Guards routes that require authentication or specific roles.
 *
 * Usage:
 *   <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>} />
 *   <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
 *
 * - Not authenticated → redirects to /auth with ?redirect= param so we can return after login
 * - Wrong role → redirects to /dashboard (not to /auth, to avoid leaking the route exists)
 * - Loading → shows FullPageLoader to avoid flash of unauthorized content
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/appStore';
import type { UserRole } from '../store/appStore';
import { FullPageLoader } from './ui';
import { canAccess } from '../lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  // While Supabase session is being restored, don't flash unauthorized state
  if (isLoading) {
    return <FullPageLoader />;
  }

  // Not logged in → send to auth with redirect back
  if (!isAuthenticated || !user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Wrong role → send to dashboard, don't expose that the route exists
  // superadmin tiene acceso a todo (admin, partner, etc.)
  // Se comprueba tanto el rol activo (user.role) como TODOS los roles de la
  // cuenta (user.roles) — así alguien con rol activo "dancer" pero que
  // también tiene "instructor" asignado no pierde acceso a rutas de instructor.
  if (requiredRole && !canAccess(user, requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
