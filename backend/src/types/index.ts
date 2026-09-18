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

export interface Tenant {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  businessName: string;
  phone?: string;
  planId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startsAt: string;
  expiresAt: string;
  ordersToday: number;
  lastResetDate: string;
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

export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  rawKey?: string;
  keyHash: string;
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
  utr?: string;
  gatewayTxnId?: string;
  payerVpa?: string;
  qrPayload?: string;
  rawVerificationData?: any;
  paidAt?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookLog {
  id: string;
  orderId: string;
  tenantId: string;
  targetUrl: string;
  payload: any;
  responseCode?: number;
  responseBody?: string;
  attemptCount: number;
  status: 'DELIVERED' | 'FAILED' | 'RETRYING';
  createdAt: string;
}

export interface SmsLog {
  id: string;
  deviceId: string;
  tenantId: string;
  sender: string;
  message: string;
  parsedAmount?: number;
  parsedUtr?: string;
  matchedOrderId?: string;
  status: 'PROCESSED' | 'UNMATCHED' | 'IGNORED';
  receivedAt: string;
}

export interface PaymentTemplateConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  badge?: string;
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
