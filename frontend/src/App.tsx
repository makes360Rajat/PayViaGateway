import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './pages/landing/LandingPage';
import { AuthPage } from './pages/auth/AuthPage';
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { MerchantsManager } from './pages/merchants/MerchantsManager';
import { OrdersList } from './pages/orders/OrdersList';
import { ProfilePage } from './pages/profile/ProfilePage';
import { DevicesManager } from './pages/devices/DevicesManager';
import { ApiKeysManager } from './pages/apiKeys/ApiKeysManager';
import { PaymentPageCustomizer } from './pages/paymentPage/PaymentPageCustomizer';
import { TemplatePreview } from './pages/preview/TemplatePreview';
import { PlansPricing } from './pages/plans/PlansPricing';
import { AdminPanel } from './pages/admin/AdminPanel';
import { ApiDocsPage } from './pages/docs/ApiDocsPage';
import { ContactPage } from './pages/contact/ContactPage';
import { TermsOfServicePage } from './pages/terms/TermsOfServicePage';
import { HostedCheckout } from './pages/checkout/HostedCheckout';
import { SubscriptionLockNotice } from './components/common/SubscriptionLockNotice';
import { AlertTriangle, Zap, Lock } from 'lucide-react';

// Helper to determine initial page from window.location.pathname
const getPageFromPath = (path: string, user: any): string => {
  const clean = path.toLowerCase().replace(/\/+$/, '') || '/';
  
  if (clean.startsWith('/pay/')) return 'checkout';
  // Public merchant-only login
  if (clean === '/login' || clean === '/signin' || clean === '/auth' || clean === '/register' || clean === '/signup') return 'auth';
  // Secret Super Admin portal — not linked anywhere in the UI
  if (clean === '/login_super_admin' || clean === '/login_super_admin_auth') return 'admin-auth';
  if (clean === '/dashboard' || clean === '/demo') return 'dashboard';
  if (clean === '/merchants') return 'merchants';
  if (clean === '/orders') return 'orders';
  if (clean === '/profile' || clean === '/my-profile' || clean === '/account') return 'profile';
  if (clean === '/devices') return 'devices';
  if (clean === '/api-keys' || clean === '/keys') return 'api-keys';
  if (clean === '/payment-page' || clean === '/templates') return 'payment-page';
  if (clean === '/plans' || clean === '/pricing') return 'plans';
  if (clean === '/admin') return 'admin';
  if (clean === '/docs' || clean === '/api-docs') return 'docs';
  if (clean === '/contact' || clean === '/support') return 'contact';
  if (clean === '/terms' || clean === '/terms-of-service') return 'terms';

  // Root path '/' or anchor pages
  if (clean === '/' || clean === '/what' || clean === '/product' || clean === '/security' || clean === '/privacy' || clean === '/google-data' || clean === '/api') {
    return user ? 'dashboard' : 'landing';
  }

  return user ? 'dashboard' : 'landing';
};

const getPathFromPage = (page: string): string => {
  switch (page) {
    case 'landing': return '/';
    case 'auth': return '/login';
    case 'admin-auth': return '/login_super_admin';
    case 'dashboard': return '/dashboard';
    case 'merchants': return '/merchants';
    case 'orders': return '/orders';
    case 'profile': return '/profile';
    case 'devices': return '/devices';
    case 'api-keys': return '/api-keys';
    case 'payment-page': return '/payment-page';
    case 'plans': return '/plans';
    case 'admin': return '/admin';
    case 'docs': return '/docs';
    case 'contact': return '/contact';
    case 'terms': return '/terms';
    default: return '/';
  }
};

export const MainApp: React.FC = () => {
  const { user, subscription, isLoading, isImpersonating, exitImpersonation } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>(() => getPageFromPath(window.location.pathname, null));
  const [previewTemplateId, setPreviewTemplateId] = useState<string>('template_1');
  const [checkoutToken, setCheckoutToken] = useState<string | null>(() => {
    const path = window.location.pathname;
    return path.startsWith('/pay/') ? path.replace('/pay/', '').trim() : null;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const isSubscriptionActive = 
    user?.role === 'SUPER_ADMIN' || 
    subscription?.status === 'ACTIVE' || 
    (!!user && subscription?.status !== 'EXPIRED' && subscription?.status !== 'CANCELLED');

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
      
      {/* Top Banner if Super Admin is Impersonating a Merchant Workspace */}
      {isImpersonating && user && (
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-700 text-white px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-semibold shadow-xl sticky top-0 z-50 backdrop-blur-md border-b border-purple-400/30">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-black/40 text-purple-200 text-[10px] font-mono font-bold uppercase tracking-wider">
              Super Admin Workspace Mode
            </span>
            <span>
              Controlling merchant workspace: <strong>{user.businessName || user.name}</strong> ({user.email}).
            </span>
          </div>
          <button
            onClick={async () => {
              await exitImpersonation();
              handleNavigate('admin');
            }}
            className="px-3.5 py-1 rounded-lg bg-white text-purple-900 font-extrabold hover:bg-purple-50 active:scale-95 transition text-xs shadow-md shrink-0"
          >
            ← Return to Super Admin Panel
          </button>
        </div>
      )}

      {/* Top Banner if Subscription is Inactive */}
      {user && !isSubscriptionActive && !isImpersonating && currentPage !== 'landing' && currentPage !== 'auth' && (
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
        {user && currentPage !== 'landing' && currentPage !== 'auth' && currentPage !== 'admin-auth' && (
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
              adminMode={false}
              onSuccess={(targetPage = 'dashboard') => {
                handleNavigate(targetPage);
              }}
            />
          )}

          {currentPage === 'admin-auth' && (
            <AuthPage
              adminMode={true}
              onSuccess={(targetPage = 'dashboard') => {
                handleNavigate(targetPage);
              }}
            />
          )}

          {currentPage === 'dashboard' && <DashboardOverview onNavigate={handleNavigate} />}
          {currentPage === 'merchants' && <MerchantsManager onNavigate={handleNavigate} />}
          {currentPage === 'orders' && <OrdersList />}
          {currentPage === 'profile' && <ProfilePage />}
          {currentPage === 'devices' && <DevicesManager />}
          {currentPage === 'api-keys' && <ApiKeysManager />}
          {currentPage === 'payment-page' && <PaymentPageCustomizer onNavigate={handleNavigate} />}

          {currentPage === 'plans' && <PlansPricing onNavigate={handleNavigate} />}
          {currentPage === 'admin' && (user?.role === 'SUPER_ADMIN' ? <AdminPanel /> : <DashboardOverview onNavigate={handleNavigate} />)}
          {currentPage === 'docs' && <ApiDocsPage />}
          {currentPage === 'contact' && <ContactPage onNavigate={handleNavigate} />}
          {currentPage === 'terms' && <TermsOfServicePage onNavigate={handleNavigate} />}
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
