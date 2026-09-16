import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './pages/landing/LandingPage';
import { AuthPage } from './pages/auth/AuthPage';
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { MerchantsManager } from './pages/merchants/MerchantsManager';
import { OrdersList } from './pages/orders/OrdersList';
import { CreateOrderPage } from './pages/orders/CreateOrderPage';
import { DevicesManager } from './pages/devices/DevicesManager';
import { ApiKeysManager } from './pages/apiKeys/ApiKeysManager';
import { PaymentPageCustomizer } from './pages/paymentPage/PaymentPageCustomizer';
import { TemplatePreview } from './pages/preview/TemplatePreview';
import { PlansPricing } from './pages/plans/PlansPricing';
import { AdminPanel } from './pages/admin/AdminPanel';
import { ApiDocsPage } from './pages/docs/ApiDocsPage';
import { HostedCheckout } from './pages/checkout/HostedCheckout';
import { SubscriptionLockNotice } from './components/common/SubscriptionLockNotice';
import { AlertTriangle, Zap, Lock } from 'lucide-react';

// Helper to determine initial page from window.location.pathname
const getPageFromPath = (path: string, user: any): string => {
  const clean = path.toLowerCase().replace(/\/+$/, '') || '/';
  
  if (clean.startsWith('/pay/')) return 'checkout';
  if (clean === '/login' || clean === '/signin' || clean === '/auth' || clean === '/register' || clean === '/signup') return 'auth';
  if (clean === '/dashboard' || clean === '/demo') return 'dashboard';
  if (clean === '/merchants') return 'merchants';
  if (clean === '/orders') return 'orders';
  if (clean === '/create-order' || clean === '/create') return 'create-order';
  if (clean === '/devices') return 'devices';
  if (clean === '/api-keys' || clean === '/keys') return 'api-keys';
  if (clean === '/payment-page' || clean === '/templates') return 'payment-page';
  if (clean === '/plans' || clean === '/pricing') return 'plans';
  if (clean === '/admin') return 'admin';
  if (clean === '/docs' || clean === '/api-docs') return 'docs';

  // Root path '/'
  if (clean === '/') {
    return user ? 'dashboard' : 'landing';
  }

  return user ? 'dashboard' : 'landing';
};

const getPathFromPage = (page: string): string => {
  switch (page) {
    case 'landing': return '/';
    case 'auth': return '/login';
    case 'dashboard': return '/dashboard';
    case 'merchants': return '/merchants';
    case 'orders': return '/orders';
    case 'create-order': return '/create-order';
    case 'devices': return '/devices';
    case 'api-keys': return '/api-keys';
    case 'payment-page': return '/payment-page';
    case 'plans': return '/plans';
    case 'admin': return '/admin';
    case 'docs': return '/docs';
    default: return '/';
  }
};

export const MainApp: React.FC = () => {
  const { user, subscription, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>(() => getPageFromPath(window.location.pathname, null));
  const [previewTemplateId, setPreviewTemplateId] = useState<string>('template_1');
  const [checkoutToken, setCheckoutToken] = useState<string | null>(() => {
    const path = window.location.pathname;
    return path.startsWith('/pay/') ? path.replace('/pay/', '').trim() : null;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const isSubscriptionActive = user?.role === 'SUPER_ADMIN' || subscription?.status === 'ACTIVE';

  // Sync state on browser URL popstate (Back/Forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/pay/')) {
        const token = path.replace('/pay/', '').trim();
        setCheckoutToken(token);
      } else {
        setCheckoutToken(null);
        const resolvedPage = getPageFromPath(path, user);
        setCurrentPage(resolvedPage);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // Initial routing check when user auth state loads
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/pay/')) {
      const token = path.replace('/pay/', '').trim();
      setCheckoutToken(token);
      return;
    }

    const resolved = getPageFromPath(path, user);
    setCurrentPage(resolved);
    
    // Normalize url if on /demo or legacy path
    if (path === '/demo') {
      window.history.replaceState(null, '', '/dashboard');
    }
  }, [user]);

  const handleNavigate = useCallback((page: string, params?: any) => {
    if (page === 'preview' && params?.templateId) {
      setPreviewTemplateId(params.templateId);
    }
    
    setCheckoutToken(null);
    setCurrentPage(page);
    setIsMobileMenuOpen(false);

    // Update browser URL
    const targetPath = getPathFromPage(page);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // If viewing a public hosted payment link (/pay/:token)
  if (checkoutToken) {
    return <HostedCheckout token={checkoutToken} />;
  }

  // If in full-screen template preview mode
  if (currentPage === 'preview') {
    return (
      <TemplatePreview
        templateId={previewTemplateId}
        onBack={() => handleNavigate('payment-page')}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
          <span className="text-xs font-mono text-emerald-400">Loading PayVia Gateway...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040f0c] text-emerald-50 flex flex-col font-sans">
      
      {/* Top Banner if Subscription is Inactive */}
      {user && !isSubscriptionActive && currentPage !== 'landing' && currentPage !== 'auth' && (
        <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/35 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-200 shadow-glow-amber sticky top-0 z-40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 animate-pulse shrink-0" />
            <span>
              <strong>Gateway Setup Mode:</strong> Choose and activate an active subscription plan to unlock live UPI payments, companion app pairing, and production API keys.
            </span>
          </div>
          <button
            onClick={() => handleNavigate('plans')}
            className="flex items-center gap-1.5 rounded-lg bg-amber-400 text-black font-extrabold px-3.5 py-1 text-xs hover:brightness-110 active:scale-95 transition shadow-sm shrink-0"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Activate Plan →</span>
          </button>
        </div>
      )}

      <Navbar
        onNavigate={handleNavigate}
        currentPage={currentPage}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
      />

      <div className="flex flex-1">
        {/* Render Sidebar for authenticated workspace pages */}
        {user && currentPage !== 'landing' && currentPage !== 'auth' && (
          <Sidebar
            currentPage={currentPage}
            onNavigate={handleNavigate}
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentPage === 'landing' && <LandingPage onNavigate={handleNavigate} />}
          
          {currentPage === 'auth' && (
            <AuthPage 
              onSuccess={(targetPage = 'dashboard') => {
                handleNavigate(targetPage);
              }} 
            />
          )}

          {/* If user is authenticated but has NO active plan, lock dashboard and feature pages */}
          {user && !isSubscriptionActive && (currentPage === 'dashboard' || currentPage === 'merchants' || currentPage === 'orders' || currentPage === 'create-order' || currentPage === 'devices' || currentPage === 'api-keys' || currentPage === 'payment-page') ? (
            <SubscriptionLockNotice onNavigate={handleNavigate} />
          ) : (
            <>
              {currentPage === 'dashboard' && <DashboardOverview onNavigate={handleNavigate} />}
              {currentPage === 'merchants' && <MerchantsManager />}
              {currentPage === 'orders' && <OrdersList />}
              {currentPage === 'create-order' && <CreateOrderPage />}
              {currentPage === 'devices' && <DevicesManager />}
              {currentPage === 'api-keys' && <ApiKeysManager />}
              {currentPage === 'payment-page' && <PaymentPageCustomizer onNavigate={handleNavigate} />}
            </>
          )}

          {currentPage === 'plans' && <PlansPricing onNavigate={handleNavigate} />}
          {currentPage === 'admin' && <AdminPanel />}
          {currentPage === 'docs' && <ApiDocsPage />}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
