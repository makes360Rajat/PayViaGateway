import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  Tenant,
  Plan,
  TenantSubscription,
  MerchantAccount,
  PairedDevice,
  ApiKey,
  Order,
  WebhookLog,
  SmsLog,
  TenantTemplateSettings
} from '../types';

interface DatabaseSchema {
  tenants: Tenant[];
  plans: Plan[];
  subscriptions: TenantSubscription[];
  merchants: MerchantAccount[];
  devices: PairedDevice[];
  apiKeys: ApiKey[];
  orders: Order[];
  webhookLogs: WebhookLog[];
  smsLogs: SmsLog[];
  templateSettings: TenantTemplateSettings[];
}

const DB_FILE_PATH = path.join(__dirname, '../../data/database.json');

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading database file, initializing new one', e);
    }

    const initial = this.seedDatabase();
    this.persistNow(initial);
    return initial;
  }

  private persistNow(data: DatabaseSchema) {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file', e);
    }
  }

  public save() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.persistNow(this.data);
    }, 100);
  }

  private seedDatabase(): DatabaseSchema {
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync('Admin@123456', salt);
    const merchantPasswordHash = bcrypt.hashSync('Db@0125', salt);

    const defaultPlans: Plan[] = [
      {
        id: 'plan_starter',
        name: 'Starter',
        price: 999,
        validityDays: 30,
        maxMerchantAccounts: 2,
        maxOrdersPerDay: 100,
        maxApiKeys: 2,
        features: {
          webhooks: true,
          smsGateway: true,
          crypto: false,
          prioritySupport: false,
          customBranding: false
        },
        isActive: true
      },
      {
        id: 'plan_pro',
        name: 'Pro',
        price: 2499,
        validityDays: 30,
        maxMerchantAccounts: 10,
        maxOrdersPerDay: 2000,
        maxApiKeys: 10,
        features: {
          webhooks: true,
          smsGateway: true,
          crypto: true,
          prioritySupport: true,
          customBranding: true
        },
        isActive: true
      },
      {
        id: 'plan_unlimited',
        name: 'Enterprise VIP',
        price: 5999,
        validityDays: 90,
        maxMerchantAccounts: 50,
        maxOrdersPerDay: 50000,
        maxApiKeys: 50,
        features: {
          webhooks: true,
          smsGateway: true,
          crypto: true,
          prioritySupport: true,
          customBranding: true
        },
        isActive: true
      }
    ];

    const adminTenant: Tenant = {
      id: 'tenant_admin_001',
      name: 'Super Administrator',
      email: 'admin@payvia.vip',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      businessName: 'PayVia Official Platform',
      planId: 'plan_unlimited',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const defaultMerchant: Tenant = {
      id: 'tenant_pankaj_007',
      name: 'Pankaj Sharma',
      email: 'pankajpanks007@gmail.com',
      passwordHash: merchantPasswordHash,
      role: 'MERCHANT',
      businessName: 'Pankaj Enterprises & Tech',
      phone: '+919876543210',
      planId: 'plan_pro',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const subscriptions: TenantSubscription[] = [
      {
        id: 'sub_admin_001',
        tenantId: adminTenant.id,
        planId: 'plan_unlimited',
        status: 'ACTIVE',
        startsAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        ordersToday: 0,
        lastResetDate: new Date().toISOString().slice(0, 10)
      },
      {
        id: 'sub_pankaj_001',
        tenantId: defaultMerchant.id,
        planId: 'plan_pro',
        status: 'ACTIVE',
        startsAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
        ordersToday: 14,
        lastResetDate: new Date().toISOString().slice(0, 10)
      }
    ];

    const merchants: MerchantAccount[] = [
      {
        id: 'm_paytm_01',
        tenantId: defaultMerchant.id,
        provider: 'PAYTM',
        label: 'Main Store Paytm',
        upiId: 'pankajshop@paytm',
        displayName: 'Pankaj Store',
        weight: 3,
        status: 'ACTIVE',
        intentEnabled: true,
        credentials: {
          mid: 'PANKAJ982348123982',
          merchantKey: 'AbCdEf123456KeyXYZ',
          subAccountId: 'sub_001'
        },
        smsCount: 42,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'm_bharatpe_01',
        tenantId: defaultMerchant.id,
        provider: 'BHARATPE',
        label: 'BharatPe Merchant QR',
        upiId: 'pankajretail@yesbankltd',
        displayName: 'Pankaj Retail QR',
        weight: 2,
        status: 'ACTIVE',
        intentEnabled: true,
        credentials: {
          mobile: '9876543210',
          merchantId: 'BP_7812903',
          token: 'bp_session_token_live'
        },
        smsCount: 28,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'm_fampay_01',
        tenantId: defaultMerchant.id,
        provider: 'FAMPAY',
        label: 'FamPay Fast Pay',
        upiId: 'pankaj007@fam',
        displayName: 'Pankaj FamPay',
        weight: 1,
        status: 'ACTIVE',
        intentEnabled: true,
        gmailConnected: true,
        gmailEmail: 'pankajpanks007@gmail.com',
        credentials: {
          oauthToken: 'oauth_gmail_token_valid'
        },
        smsCount: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'm_custom_upi_01',
        tenantId: defaultMerchant.id,
        provider: 'CUSTOM_UPI',
        label: 'ICICI Current Account UPI',
        upiId: 'pankajenterprises@icici',
        displayName: 'Pankaj Enterprises UPI',
        weight: 2,
        status: 'ACTIVE',
        intentEnabled: true,
        credentials: {
          devicePaired: true
        },
        smsCount: 89,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'm_crypto_01',
        tenantId: defaultMerchant.id,
        provider: 'CRYPTO',
        label: 'USDT / USDC Multi-Chain',
        upiId: 'crypto-wallet',
        displayName: 'Crypto Vault',
        weight: 1,
        status: 'ACTIVE',
        intentEnabled: false,
        credentials: {
          networks: [
            { chain: 'TRC20', address: 'TX9Q8yJz42mN8K9vP2bQw5R1t7YmU3x8Zb' },
            { chain: 'POLYGON', address: '0x71C2a8B998E1f0E389aDe1b9319B1484C3F6e9A0' },
            { chain: 'BSC', address: '0x71C2a8B998E1f0E389aDe1b9319B1484C3F6e9A0' }
          ]
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const devices: PairedDevice[] = [
      {
        id: 'dev_001',
        tenantId: defaultMerchant.id,
        deviceName: 'OnePlus 11 5G (SIM Gateway 1)',
        deviceToken: 'dev_tok_991823abce1283',
        pairingCode: 'PAIR-8892',
        simSlots: [
          { slot: 1, operator: 'Jio 5G', number: '+91 98765 43210' },
          { slot: 2, operator: 'Airtel 4G', number: '+91 98123 45678' }
        ],
        batteryLevel: 94,
        isOnline: true,
        lastHeartbeatAt: new Date().toISOString(),
        smsCapturedCount: 142,
        createdAt: new Date().toISOString()
      }
    ];

    const apiKeys: ApiKey[] = [
      {
        id: 'key_001',
        tenantId: defaultMerchant.id,
        name: 'Production Web App Key',
        keyPrefix: 'pv_live_8f91',
        rawKey: 'pv_live_8f91a2b3c4d5e6f7a8b9c0d1e2f3a4b5',
        keyHash: bcrypt.hashSync('pv_live_8f91a2b3c4d5e6f7a8b9c0d1e2f3a4b5', salt),
        scope: 'ALL',
        pinnedTemplate: 'template_1',
        webhookUrl: 'https://webhook.site/demo-payment-callback',
        webhookSecret: 'whsec_991823719283719283',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];

    const templateSettings: TenantTemplateSettings[] = [
      {
        tenantId: defaultMerchant.id,
        templateMode: 'rotate',
        defaultTemplate: 'template_1',
        enabledTemplates: [
          'template_1', 'template_2', 'template_3', 'template_4', 'template_5',
          'template_6', 'template_7', 'template_8', 'template_9', 'template_10'
        ],
        brandName: 'Pankaj Tech Store',
        brandColor: '#6366f1',
        supportEmail: 'support@pankajtech.com'
      }
    ];

    const orders: Order[] = [
      {
        id: 'ord_sample_01',
        orderId: 'PV891273910283',
        tenantId: defaultMerchant.id,
        apiKeyId: apiKeys[0].id,
        merchantAccountId: merchants[0].id,
        merchantAccountLabel: merchants[0].label,
        provider: 'PAYTM',
        amount: 499.00,
        currency: 'INR',
        customerMobile: '9876543210',
        customerName: 'Aarav Gupta',
        customerEmail: 'aarav@gmail.com',
        remark1: 'Invoice #1042',
        returnUrl: 'https://merchant.example.com/checkout/success',
        template: 'template_1',
        linkToken: 'token_sample_abc123',
        paymentUrl: 'http://localhost:3000/pay/token_sample_abc123',
        status: 'TXN_SUCCESS',
        utr: '419827391823',
        gatewayTxnId: 'PAYTM2026091109123812',
        paidAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 3900 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3600 * 1000).toISOString()
      },
      {
        id: 'ord_sample_02',
        orderId: 'PV891273910284',
        tenantId: defaultMerchant.id,
        apiKeyId: apiKeys[0].id,
        merchantAccountId: merchants[1].id,
        merchantAccountLabel: merchants[1].label,
        provider: 'BHARATPE',
        amount: 1499.50,
        currency: 'INR',
        customerMobile: '9812345678',
        customerName: 'Pooja Verma',
        remark1: 'Annual Pro Subscription',
        returnUrl: 'https://merchant.example.com/checkout/success',
        template: 'template_4',
        linkToken: 'token_sample_def456',
        paymentUrl: 'http://localhost:3000/pay/token_sample_def456',
        status: 'TXN_SUCCESS',
        utr: '419827391899',
        gatewayTxnId: 'BP_TXN_9981273',
        paidAt: new Date(Date.now() - 7200 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 7500 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 7200 * 1000).toISOString()
      },
      {
        id: 'ord_sample_03',
        orderId: 'PV891273910285',
        tenantId: defaultMerchant.id,
        apiKeyId: apiKeys[0].id,
        merchantAccountId: merchants[3].id,
        merchantAccountLabel: merchants[3].label,
        provider: 'CUSTOM_UPI',
        amount: 250.00,
        currency: 'INR',
        customerMobile: '9988776655',
        customerName: 'Vikram Singh',
        remark1: 'Digital Course Bundle',
        template: 'template_2',
        linkToken: 'token_sample_ghi789',
        paymentUrl: 'http://localhost:3000/pay/token_sample_ghi789',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 9 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 60 * 1000).toISOString()
      }
    ];

    const webhookLogs: WebhookLog[] = [
      {
        id: 'wh_001',
        orderId: orders[0].id,
        tenantId: defaultMerchant.id,
        targetUrl: 'https://webhook.site/demo-payment-callback',
        payload: {
          event: 'payment.success',
          order_id: orders[0].orderId,
          amount: 499.00,
          status: 'TXN_SUCCESS',
          utr: '419827391823'
        },
        responseCode: 200,
        responseBody: '{"success":true}',
        attemptCount: 1,
        status: 'DELIVERED',
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString()
      }
    ];

    return {
      tenants: [adminTenant, defaultMerchant],
      plans: defaultPlans,
      subscriptions,
      merchants,
      devices,
      apiKeys,
      orders,
      webhookLogs,
      smsLogs: [],
      templateSettings
    };
  }

  // Getters
  public get tenants(): Tenant[] { return this.data.tenants; }
  public get plans(): Plan[] { return this.data.plans; }
  public get subscriptions(): TenantSubscription[] { return this.data.subscriptions; }
  public get merchants(): MerchantAccount[] { return this.data.merchants; }
  public get devices(): PairedDevice[] { return this.data.devices; }
  public get apiKeys(): ApiKey[] { return this.data.apiKeys; }
  public get orders(): Order[] { return this.data.orders; }
  public get webhookLogs(): WebhookLog[] { return this.data.webhookLogs; }
  public get smsLogs(): SmsLog[] { return this.data.smsLogs; }
  public get templateSettings(): TenantTemplateSettings[] { return this.data.templateSettings; }

  // Helpers
  public findTenantById(id: string): Tenant | undefined {
    return this.data.tenants.find(t => t.id === id);
  }

  public findTenantByEmail(email: string): Tenant | undefined {
    return this.data.tenants.find(t => t.email.toLowerCase() === email.toLowerCase());
  }

  public findOrderByToken(linkToken: string): Order | undefined {
    return this.data.orders.find(o => o.linkToken === linkToken);
  }

  public findOrderByOrderId(orderId: string): Order | undefined {
    return this.data.orders.find(o => o.orderId === orderId);
  }

  public findOrderById(id: string): Order | undefined {
    return this.data.orders.find(o => o.id === id);
  }

  public findApiKeyByKey(rawKey: string): ApiKey | undefined {
    return this.data.apiKeys.find(k => k.isActive && bcrypt.compareSync(rawKey, k.keyHash));
  }
}

export const db = new Database();
