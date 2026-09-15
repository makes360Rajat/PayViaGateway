"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mysql_1 = require("./mysql");
const DB_FILE_PATH = path_1.default.join(__dirname, '../../data/database.json');
class Database {
    data;
    saveTimeout = null;
    constructor() {
        this.data = this.loadDatabase();
        this.initMySQL();
    }
    async initMySQL() {
        try {
            const connected = await mysql_1.MySQLClient.testConnection();
            if (connected) {
                // Sync current dataset to MySQL to ensure all tables are populated
                await mysql_1.MySQLClient.syncToMySQL(this.data);
            }
        }
        catch (e) {
            console.warn('MySQL initialization notice:', e.message);
        }
    }
    loadDatabase() {
        try {
            const dir = path_1.default.dirname(DB_FILE_PATH);
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            if (fs_1.default.existsSync(DB_FILE_PATH)) {
                const raw = fs_1.default.readFileSync(DB_FILE_PATH, 'utf-8');
                return JSON.parse(raw);
            }
        }
        catch (e) {
            console.error('Error reading database file, initializing new one', e);
        }
        const initial = this.seedDatabase();
        this.persistNow(initial);
        return initial;
    }
    persistNow(data) {
        try {
            const dir = path_1.default.dirname(DB_FILE_PATH);
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            fs_1.default.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
            // Also persist to MySQL asynchronously
            mysql_1.MySQLClient.syncToMySQL(data).catch(() => { });
        }
        catch (e) {
            console.error('Failed to write database file', e);
        }
    }
    save() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            this.persistNow(this.data);
        }, 100);
    }
    seedDatabase() {
        const salt = bcryptjs_1.default.genSaltSync(10);
        const adminPasswordHash = bcryptjs_1.default.hashSync('Admin@123456', salt);
        const merchantPasswordHash = bcryptjs_1.default.hashSync('Db@0125', salt);
        const defaultPlans = [
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
        const adminTenant = {
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
        const defaultMerchant = {
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
        const subscriptions = [
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
        const merchants = [
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
        const devices = [
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
        const apiKeys = [
            {
                id: 'key_001',
                tenantId: defaultMerchant.id,
                name: 'Production Web App Key',
                keyPrefix: 'pv_live_8f91',
                rawKey: 'pv_live_8f91a2b3c4d5e6f7a8b9c0d1e2f3a4b5',
                keyHash: bcryptjs_1.default.hashSync('pv_live_8f91a2b3c4d5e6f7a8b9c0d1e2f3a4b5', salt),
                scope: 'ALL',
                pinnedTemplate: 'template_1',
                webhookUrl: 'https://webhook.site/demo-payment-callback',
                webhookSecret: 'whsec_991823719283719283',
                isActive: true,
                createdAt: new Date().toISOString()
            }
        ];
        const templateSettings = [
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
        const orders = [
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
        const webhookLogs = [
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
    get tenants() { return this.data.tenants; }
    get plans() { return this.data.plans; }
    get subscriptions() { return this.data.subscriptions; }
    get merchants() { return this.data.merchants; }
    get devices() { return this.data.devices; }
    get apiKeys() { return this.data.apiKeys; }
    get orders() { return this.data.orders; }
    get webhookLogs() { return this.data.webhookLogs; }
    get smsLogs() { return this.data.smsLogs; }
    get templateSettings() { return this.data.templateSettings; }
    // Helpers
    findTenantById(id) {
        return this.data.tenants.find(t => t.id === id);
    }
    findTenantByEmail(email) {
        return this.data.tenants.find(t => t.email.toLowerCase() === email.toLowerCase());
    }
    findOrderByToken(linkToken) {
        return this.data.orders.find(o => o.linkToken === linkToken);
    }
    findOrderByOrderId(orderId) {
        return this.data.orders.find(o => o.orderId === orderId);
    }
    findOrderById(id) {
        return this.data.orders.find(o => o.id === id);
    }
    findApiKeyByKey(rawKey) {
        return this.data.apiKeys.find(k => k.isActive && bcryptjs_1.default.compareSync(rawKey, k.keyHash));
    }
}
exports.db = new Database();
