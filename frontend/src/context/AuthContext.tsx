import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserTenant, Plan, TenantSubscription } from '../types';
import { ApiService } from '../services/api';

interface AuthContextType {
  user: UserTenant | null;
  plan: Plan | null;
  subscription: TenantSubscription | null;
  token: string | null;
  isLoading: boolean;
  isImpersonating: boolean;
  impersonatedBy: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: UserTenant }>;
  register: (data: any) => Promise<{ success: boolean; error?: string; user?: UserTenant }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  impersonate: (newToken: string) => Promise<void>;
  exitImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserTenant | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('payvia_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => !!localStorage.getItem('payvia_original_admin_token'));
  const [impersonatedBy, setImpersonatedBy] = useState<string | null>(() => localStorage.getItem('payvia_impersonated_by'));

  const refreshProfile = async () => {
    if (!localStorage.getItem('payvia_token')) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await ApiService.getProfile();
      if (res.status && res.data) {
        setUser(res.data.tenant);
        setPlan(res.data.plan);
        setSubscription(res.data.subscription);
      } else {
        logout();
      }
    } catch (e) {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const res = await ApiService.login(email, password);
    setIsLoading(false);

    if (res.status && res.data?.token) {
      localStorage.removeItem('payvia_original_admin_token');
      localStorage.removeItem('payvia_impersonated_by');
      setIsImpersonating(false);
      setImpersonatedBy(null);

      localStorage.setItem('payvia_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.tenant);
      await refreshProfile();
      return { success: true, user: res.data.tenant };
    }
    return { success: false, error: res.error || 'Login failed' };
  };

  const register = async (data: any) => {
    setIsLoading(true);
    const res = await ApiService.register(data);
    setIsLoading(false);

    if (res.status && res.data?.token) {
      localStorage.setItem('payvia_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.tenant);
      await refreshProfile();
      return { success: true };
    }
    return { success: false, error: res.error || 'Registration failed' };
  };

  const impersonate = async (newToken: string) => {
    const currentToken = localStorage.getItem('payvia_token');
    if (currentToken && !localStorage.getItem('payvia_original_admin_token')) {
      localStorage.setItem('payvia_original_admin_token', currentToken);
      localStorage.setItem('payvia_impersonated_by', user?.email || 'admin@payvia.vip');
    }
    localStorage.setItem('payvia_token', newToken);
    setToken(newToken);
    setIsImpersonating(true);
    setImpersonatedBy(user?.email || 'admin@payvia.vip');
    await refreshProfile();
  };

  const exitImpersonation = async () => {
    const orig = localStorage.getItem('payvia_original_admin_token');
    if (orig) {
      localStorage.setItem('payvia_token', orig);
      localStorage.removeItem('payvia_original_admin_token');
      localStorage.removeItem('payvia_impersonated_by');
      setToken(orig);
      setIsImpersonating(false);
      setImpersonatedBy(null);
      await refreshProfile();
    }
  };

  const logout = () => {
    localStorage.removeItem('payvia_token');
    localStorage.removeItem('payvia_original_admin_token');
    localStorage.removeItem('payvia_impersonated_by');
    setToken(null);
    setUser(null);
    setPlan(null);
    setSubscription(null);
    setIsImpersonating(false);
    setImpersonatedBy(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        plan,
        subscription,
        token,
        isLoading,
        isImpersonating,
        impersonatedBy,
        login,
        register,
        logout,
        refreshProfile,
        impersonate,
        exitImpersonation
      }}
    >
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
