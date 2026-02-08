import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { getBackendTarget } from '@/lib/env-config';

const AuthContext = createContext();

const LOCAL_SERVER_URL = getBackendTarget();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false); // No public settings in local
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    const token = localStorage.getItem('base44_local_token');

    if (!token) {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      return;
    }

    try {
      setIsLoadingAuth(true);
      const res = await fetch(`${LOCAL_SERVER_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Token inválido ou expirado');
      }

      const currentUser = await res.json();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      localStorage.removeItem('base44_local_token');
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: error.message });
    }
  };

  const logout = () => {
    localStorage.removeItem('base44_local_token');
    setUser(null);
    setIsAuthenticated(false);
    window.location.reload();
  };

  const navigateToLogin = () => {
    // Redirect to the internal Login page
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      logout,
      navigateToLogin,
      checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
