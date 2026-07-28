import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/appStore';

// "Mi perfil": lleva al usuario a SU perfil público, tal y como lo ve la gente.
const MyProfileRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/auth?redirect=/mi-perfil" replace />;
  return <Navigate to={`/p/${user.id}`} replace />;
};

export default MyProfileRedirect;
