import React, { useState, useEffect } from 'react';
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

export const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [previewTemplateId, setPreviewTemplateId] = useState<string>('template_1');
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Check URL pathname for /pay/:token or hash routing
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/pay/')) {
      const token = path.replace('/pay/', '').trim();
      if (token) {
        setCheckoutToken(token);
      }
    }
  }, []);

  // Update default page if user is logged in
  useEffect(() => {
    if (user && currentPage === 'landing') {
      setCurrentPage('dashboard');
    }
  }, [user]);

  const handleNavigate = (page: string, params?: any) => {
    if (page === 'preview' && params?.templateId) {
      setPreviewTemplateId(params.templateId);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If viewing a public hosted payment link (/pay/:token)
  if (checkoutToken) {
    return <HostedCheckout token={checkoutToken} />;
  }

  // If in full-screen template preview mode
  if (currentPage === 'preview') {
    return (
      <TemplatePreview
        templateId={previewTemplateId}
        onBack={() => setCurrentPage('payment-page')}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          <span className="text-xs font-mono text-slate-400">Loading PayVia Gateway...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040f0c] text-emerald-50 flex flex-col font-sans">
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
          {currentPage === 'auth' && <AuthPage onSuccess={() => setCurrentPage('dashboard')} />}
          {currentPage === 'dashboard' && <DashboardOverview onNavigate={handleNavigate} />}
          {currentPage === 'merchants' && <MerchantsManager />}
          {currentPage === 'orders' && <OrdersList />}
          {currentPage === 'create-order' && <CreateOrderPage />}
          {currentPage === 'devices' && <DevicesManager />}
          {currentPage === 'api-keys' && <ApiKeysManager />}
          {currentPage === 'payment-page' && <PaymentPageCustomizer onNavigate={handleNavigate} />}
          {currentPage === 'plans' && <PlansPricing />}
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
