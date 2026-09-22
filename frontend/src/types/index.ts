export type UserRole = 'SUPER_ADMIN' | 'MERCHANT' | 'OPERATOR';

export type PaymentProviderType = 
  | 'PAYTM' 
  | 'BHARATPE' 
  | 'FAMPAY' 
  | 'FREECHARGE' 
  | 'CUSTOM_UPI' 
  | 'CRYPTO' 
  | 'GPAY_BUSINESS' 
  | 'MOBIKWIK' 
  | 'AMAZON_WALLET';

export type OrderStatus = 
  | 'PENDING' 
  | 'AWAITING_VERIFY' 
  | 'TXN_SUCCESS' 
  | 'FAILED' 
  | 'EXPIRED' 
  | 'CANCELLED';

export type ApiKeyScope = 'ALL' | 'PROVIDER' | 'ACCOUNT';
export type TemplateMode = 'fixed' | 'random' | 'rotate';

export interface UserTenant {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessName: string;
  phone?: string;
  planId: string;
  createdAt?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  validityDays: number;
  maxMerchantAccounts: number;
  maxOrdersPerDay: number;
  maxApiKeys: number;
  features: {
    webhooks: boolean;
    smsGateway: boolean;
    crypto: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
  };
  isActive: boolean;
}

export type SubscriptionStatus = 
  | 'NO_PLAN' 
  | 'FREE_TEST' 
  | 'ACTIVE' 
  | 'EXPIRED' 
  | 'CANCELLED' 
  | 'SUSPENDED' 
  | 'PENDING_PAYMENT';

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus | string;
  startsAt: string;
  expiresAt: string;
  ordersToday: number;
  lastResetDate: string;
}

export interface PlanUsage {
  id?: string;
  tenantId?: string;
  used: number;
  limit: number;
  remaining: number;
}

export interface PlanEntitlements {
  status: SubscriptionStatus | string;
  isPlanActive: boolean;
  isFreeTesting: boolean;
  testOrdersUsed: number;
  testOrdersMax: number;
  testOrdersRemaining: number;
  canConnectMerchant: boolean;
  canReceiveLivePayments: boolean;
  canCreateTestOrders: boolean;
}

export interface AccountDailyLimits {
  dailyAmountLimit?: number; // 0 or undefined = unlimited
  dailyCountLimit?: number;  // 0 or undefined = unlimited
  minAmountPerTxn?: number;  // single txn floor
  maxAmountPerTxn?: number;  // single txn ceiling
}

export interface AccountDailyStats {
  usedAmount: number;
  usedCount: number;
  dailyAmountLimit?: number;
  dailyCountLimit?: number;
  isExhausted: boolean;
  exhaustedReason?: string;
  remainingAmount?: number;
  remainingCount?: number;
  dateIST: string;
}

export interface MerchantAccount {
  id: string;
  tenantId: string;
  provider: PaymentProviderType;
  label: string;
  upiId: string;
  displayName: string;
  weight: number;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'ERROR';
  intentEnabled: boolean;
  credentials: Record<string, any>;
  dailyLimits?: AccountDailyLimits;
  dailyStats?: AccountDailyStats;
  gmailConnected?: boolean;
  gmailEmail?: string;
  lastUsedAt?: string;
  smsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PairedDevice {
  id: string;
  tenantId: string;
  deviceName: string;
  deviceToken: string;
  pairingCode: string;
  simSlots: { slot: number; operator: string; number?: string }[];
  batteryLevel: number;
  isOnline: boolean;
  lastHeartbeatAt: string;
  smsCapturedCount: number;
  status?: 'ACTIVE' | 'PAUSED';
  createdAt: string;
}

export type Device = PairedDevice;

export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  rawKey?: string;
  keyHash?: string;
  scope: ApiKeyScope;
  providerFilter?: PaymentProviderType;
  merchantAccountId?: string;
  pinnedTemplate?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  ipWhitelist?: string[];
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderId: string;
  tenantId: string;
  apiKeyId?: string;
  merchantAccountId?: string;
  merchantAccountLabel?: string;
  provider: PaymentProviderType;
  amount: number;
  currency: string;
  customerMobile?: string;
  customerName?: string;
  customerEmail?: string;
  remark1?: string;
  remark2?: string;
  returnUrl?: string;
  callbackUrl?: string;
  template: string;
  linkToken: string;
  paymentUrl: string;
  status: OrderStatus;
  mode?: 'LIVE' | 'TEST';
  isTest?: boolean;
  utr?: string;
  gatewayTxnId?: string;
  payerVpa?: string;
  qrPayload?: string;
  paidAt?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTemplateConfig {
  id: string;
  name: string;
  description: string;
  category?: string;
  badge?: string;
  swatch?: string[];
}

export interface TenantTemplateSettings {
  tenantId: string;
  templateMode: TemplateMode;
  defaultTemplate: string;
  enabledTemplates: string[];
  brandName?: string;
  brandColor?: string;
  brandLogoUrl?: string;
  supportEmail?: string;
}

export interface CheckoutData {
  order_id: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  provider: PaymentProviderType;
  template: string;
  customer_name?: string;
  customer_mobile?: string;
  remark1?: string;
  return_url?: string;
  expires_at: string;
  paid_at?: string;
  utr?: string;
  branding: {
    brand_name: string;
    brand_color: string;
    brand_logo?: string | null;
    support_email?: string;
  };
  payment_details: {
    upi_id: string;
    display_name: string;
    upi_uri: string;
    qr_code_base64: string;
    intents: {
      generic: string;
      gpay: string;
      phonepe: string;
      paytm: string;
      cred: string;
      bhim: string;
    };
    crypto_networks?: { chain: string; address: string }[];
  };
}
