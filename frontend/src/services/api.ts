const API_BASE_URL = '/api';

export class ApiService {
  private static getToken(): string | null {
    return localStorage.getItem('payvia_token');
  }

  private static getHeaders(isJson = true): HeadersInit {
    const headers: Record<string, string> = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ status: boolean; data?: T; error?: string; message?: string; rawKey?: string }> {
    try {
      const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });

      const json = await response.json();
      if (!response.ok && !json.error) {
        json.error = `HTTP Error ${response.status}: ${response.statusText}`;
      }
      return json;
    } catch (e: any) {
      return { status: false, error: e.message || 'Network connection failed' };
    }
  }

  // Auth
  public static login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  public static register(data: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public static getProfile() {
    return this.request('/auth/me');
  }

  public static updateProfile(data: any) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  public static updatePassword(password: string) {
    return this.request('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }

  public static updateEmail(email: string) {
    return this.request('/auth/update-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // Merchants
  public static getMerchants() {
    return this.request('/merchants');
  }

  public static createMerchant(data: any) {
    return this.request('/merchants/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public static updateMerchant(id: string, data: any) {
    return this.request(`/merchants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  public static toggleMerchant(id: string) {
    return this.request(`/merchants/${id}/toggle`, {
      method: 'POST'
    });
  }

  public static deleteMerchant(id: string) {
    return this.request(`/merchants/${id}`, {
      method: 'DELETE'
    });
  }

  public static sendMerchantOtp(id: string, mobile?: string) {
    return this.request(`/merchants/${id}/otp-send`, {
      method: 'POST',
      body: JSON.stringify({ mobile })
    });
  }

  public static verifyMerchantOtp(id: string, otp: string, mobile?: string) {
    return this.request(`/merchants/${id}/otp-verify`, {
      method: 'POST',
      body: JSON.stringify({ otp, mobile })
    });
  }

  // Devices / SMS Gateway
  public static getDevices() {
    return this.request('/devices');
  }

  public static generatePairing() {
    return this.request('/devices/generate-pairing', {
      method: 'POST'
    });
  }

  public static deleteDevice(id: string) {
    return this.request(`/devices/${id}`, {
      method: 'DELETE'
    });
  }

  // Orders
  public static getOrders(params: { status?: string; provider?: string; search?: string; limit?: number; offset?: number } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.provider) query.set('provider', params.provider);
    if (params.search) query.set('search', params.search);
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.offset) query.set('offset', params.offset.toString());
    return this.request(`/orders?${query.toString()}`);
  }

  public static createOrderManual(data: any) {
    return this.request('/orders/create-manual', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public static forceVerifyOrder(id: string, utr?: string) {
    return this.request(`/orders/${id}/force-verify`, {
      method: 'POST',
      body: JSON.stringify({ utr })
    });
  }

  public static cancelOrder(id: string) {
    return this.request(`/orders/${id}/cancel`, {
      method: 'POST'
    });
  }

  // API Keys
  public static getApiKeys() {
    return this.request('/keys');
  }

  public static createApiKey(data: any) {
    return this.request('/keys/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public static rotateApiKey(id: string) {
    return this.request(`/keys/${id}/rotate`, {
      method: 'POST'
    });
  }

  public static deleteApiKey(id: string) {
    return this.request(`/keys/${id}`, {
      method: 'DELETE'
    });
  }

  // Payment Page & Templates
  public static getTemplateSettings() {
    return this.request('/templates/settings');
  }

  public static updateTemplateSettings(data: any) {
    return this.request('/templates/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  public static getTemplatesList() {
    return this.request('/templates');
  }

  public static getTemplatePreview(templateId: string) {
    return this.request(`/templates/preview/${templateId}`);
  }

  // Plans & Billing
  public static getPlans() {
    return this.request('/plans');
  }

  public static getCurrentSubscription() {
    return this.request('/plans/current');
  }

  public static upgradePlan(planId: string) {
    return this.request('/plans/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planId })
    });
  }

  // Hosted Checkout
  public static getCheckoutData(token: string) {
    return this.request(`/checkout/${token}`);
  }

  public static submitManualUtr(token: string, utr: string) {
    return this.request('/public/v1/order/submit-utr', {
      method: 'POST',
      body: JSON.stringify({ link_token: token, utr })
    });
  }

  // Contact Us Public Inquiries
  public static submitContactMessage(data: {
    name: string;
    email: string;
    subject?: string;
    orderId?: string;
    message: string;
  }) {
    return this.request('/contact', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Admin
  public static getAdminStats() {
    return this.request('/admin/stats');
  }

  public static getAdminUsers() {
    return this.request('/admin/users');
  }

  public static updateAdminUser(id: string, data: any) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  public static getAdminOrders(params: any = {}) {
    const query = new URLSearchParams(params);
    return this.request(`/admin/orders?${query.toString()}`);
  }

  public static createAdminPlan(data: any) {
    return this.request('/admin/plans/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public static getAdminContacts() {
    return this.request('/admin/contacts');
  }

  public static updateAdminContact(id: string, data: { status?: string; replyNotes?: string }) {
    return this.request(`/admin/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  public static deleteAdminContact(id: string) {
    return this.request(`/admin/contacts/${id}`, {
      method: 'DELETE'
    });
  }
}
