import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserTenant, Plan, TenantSubscription } from '../types';
import { ApiService } from '../services/api';

interface AuthContextType {
  user: UserTenant | null;
  plan: Plan | null;
  subscription: TenantSubscription | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserTenant | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('payvia_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
      localStorage.setItem('payvia_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.tenant);
      await refreshProfile();
      return { success: true };
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

  const logout = () => {
    localStorage.removeItem('payvia_token');
    setToken(null);
    setUser(null);
    setPlan(null);
    setSubscription(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        plan,
        subscription,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshProfile
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
