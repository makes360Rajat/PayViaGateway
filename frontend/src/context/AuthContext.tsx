import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserTenant, Plan, TenantSubscription, PlanEntitlements, PlanUsage } from '../types';
import { ApiService } from '../services/api';

export interface QuotaUsage {
  ordersToday: number;
  ordersMax: number;
  merchantsUsed?: number;
  merchantsMax?: number;
  apiKeysUsed?: number;
  apiKeysMax?: number;
}

interface AuthContextType {
  user: UserTenant | null;
  plan: Plan | null;
  subscription: TenantSubscription | null;
  usage: QuotaUsage | null;
  entitlements: PlanEntitlements | null;
  isPlanActive: boolean;
  planUsage: PlanUsage | null;
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
  const [usage, setUsage] = useState<QuotaUsage | null>(null);
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
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
      const [profileRes, subRes] = await Promise.all([
        ApiService.getProfile(),
        ApiService.getCurrentSubscription()
      ]);

      if (profileRes.status && profileRes.data) {
        setUser(profileRes.data.tenant);
        
        const activePlan = profileRes.data.plan || (subRes.status ? subRes.data?.plan : null);
        setPlan(activePlan);
        
        const sub = (subRes.status && subRes.data?.subscription) 
          ? subRes.data.subscription 
          : profileRes.data.subscription;
          
        const usageData = (subRes.status && subRes.data?.usage) 
          ? subRes.data.usage 
          : profileRes.data.usage;

        if (sub) {
          const ordCount = usageData?.ordersToday ?? sub.ordersToday ?? (sub as any).orders_today ?? 0;
          sub.ordersToday = Number(ordCount);
        }
        setSubscription(sub);
        
        if (usageData) {
          setUsage(usageData);
        }

        const entData = (subRes.status && subRes.data?.entitlements)
          ? subRes.data.entitlements
          : profileRes.data?.entitlements;
        setEntitlements(entData || null);

        const pusgData = (subRes.status && subRes.data?.testUsage)
          ? subRes.data.testUsage
          : profileRes.data?.planUsage;
        setPlanUsage(pusgData || null);
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

    const interval = setInterval(() => {
      if (localStorage.getItem('payvia_token')) {
        refreshProfile();
      }
    }, 10000);

    const onFocus = () => {
      if (localStorage.getItem('payvia_token')) {
        refreshProfile();
      }
    };

    const onCustomRefresh = () => {
      if (localStorage.getItem('payvia_token')) {
        refreshProfile();
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('payvia_quota_refresh', onCustomRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('payvia_quota_refresh', onCustomRefresh);
    };
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
    setUsage(null);
    setIsImpersonating(false);
    setImpersonatedBy(null);
  };

  const isPlanActive = Boolean(
    user?.role === 'SUPER_ADMIN' ||
    (entitlements ? entitlements.isPlanActive : (subscription?.status === 'ACTIVE'))
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        plan,
        subscription,
        usage,
        entitlements,
        isPlanActive,
        planUsage,
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
