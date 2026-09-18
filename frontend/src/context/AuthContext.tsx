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
  const [token, setToken] = useState<string | null>(() => ApiService.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
    return typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('payvia_original_admin_token');
  });
  const [impersonatedBy, setImpersonatedBy] = useState<string | null>(() => {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('payvia_impersonated_by') : null;
  });

  const refreshProfile = async () => {
    const currentToken = ApiService.getToken();
    if (!currentToken) {
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
      if (ApiService.getToken()) {
        refreshProfile();
      }
    }, 15000);

    const onFocus = () => {
      if (ApiService.getToken()) {
        refreshProfile();
      }
    };

    const onCustomRefresh = () => {
      if (ApiService.getToken()) {
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
      const tenant = res.data.tenant;
      // Isolate to current tab and partition by role in persistent storage
      ApiService.setToken(res.data.token, tenant.role, tenant.email);

      setToken(res.data.token);
      setUser(tenant);
      setIsImpersonating(false);
      setImpersonatedBy(null);

      await refreshProfile();
      return { success: true, user: tenant };
    }
    return { success: false, error: res.error || 'Login failed' };
  };

  const register = async (data: any) => {
    setIsLoading(true);
    const res = await ApiService.register(data);
    setIsLoading(false);

    if (res.status && res.data?.token) {
      const tenant = res.data.tenant;
      ApiService.setToken(res.data.token, 'MERCHANT', tenant?.email);

      setToken(res.data.token);
      setUser(tenant);
      await refreshProfile();
      return { success: true, user: tenant };
    }
    return { success: false, error: res.error || 'Registration failed' };
  };

  const impersonate = async (newToken: string) => {
    const currentToken = ApiService.getToken();
    if (currentToken && typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('payvia_original_admin_token')) {
      sessionStorage.setItem('payvia_original_admin_token', currentToken);
      sessionStorage.setItem('payvia_impersonated_by', user?.email || 'admin@payvia.vip');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('payvia_tab_token', newToken);
      sessionStorage.setItem('payvia_tab_role', 'MERCHANT');
    }
    setToken(newToken);
    setIsImpersonating(true);
    setImpersonatedBy(user?.email || 'admin@payvia.vip');
    await refreshProfile();
  };

  const exitImpersonation = async () => {
    const orig = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('payvia_original_admin_token') : null;
    if (orig) {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('payvia_tab_token', orig);
        sessionStorage.setItem('payvia_tab_role', 'SUPER_ADMIN');
        sessionStorage.removeItem('payvia_original_admin_token');
        sessionStorage.removeItem('payvia_impersonated_by');
      }
      setToken(orig);
      setIsImpersonating(false);
      setImpersonatedBy(null);
      await refreshProfile();
    }
  };

  const logout = () => {
    ApiService.clearToken(user?.role);
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
