"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const routerEngine_1 = require("../services/routerEngine");
const detectionEngine_1 = require("../services/detectionEngine");
const webhookService_1 = require("../services/webhookService");
const planService_1 = require("../services/planService");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
const BASE_FRONTEND_URL = process.env.FRONTEND_URL || 'https://payvia360.com';
// ==========================================
// 1. PUBLIC REST API (For Merchant Backends)
// ==========================================
// Create Order (Public API)
router.post('/public/v1/order/create', auth_1.authenticateApiKey, (req, res) => {
    try {
        const tenant = req.tenant;
        const apiKey = req.apiKey;
        const isPlanActive = planService_1.PlanService.isPlanActive(tenant.id);
        let mode = 'LIVE';
        if (!isPlanActive) {
            const allowed = planService_1.PlanService.consumeTestOrderQuota(tenant.id);
            if (!allowed) {
                planService_1.PlanService.logAccess(tenant.id, 'ORDER_CREATION_BLOCKED', req.originalUrl, 'BLOCKED', 'Free test limit reached (5/5)');
                return res.status(403).json({
                    status: false,
                    error: 'PLAN_UPGRADE_REQUIRED',
                    reason: 'FREE_TEST_LIMIT_REACHED',
                    message: 'Free test quota reached (5/5). Please upgrade to an active plan to create more orders or connect live merchant accounts.',
                    data: planService_1.PlanService.getTestUsage(tenant.id)
                });
            }
            mode = 'TEST';
        }
        const { amount, customer_mobile, customer_name, customer_email, remark1, remark2, return_url, callback_url, template } = req.body;
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(422).json({ status: false, error: 'Invalid or missing amount. Must be a positive number.' });
        }
        // Check daily quota
        const subscription = database_1.db.subscriptions.find(s => s.tenantId === tenant.id);
        const plan = database_1.db.plans.find(p => p.id === tenant.planId) || database_1.db.plans[0];
        const today = new Date().toISOString().slice(0, 10);
        if (subscription) {
            if (subscription.lastResetDate !== today) {
                subscription.ordersToday = 0;
                subscription.lastResetDate = today;
            }
            if (subscription.ordersToday >= plan.maxOrdersPerDay) {
                return res.status(429).json({
                    status: false,
                    error: `Daily order limit of ${plan.maxOrdersPerDay} orders reached for your plan. Please upgrade.`
                });
            }
            subscription.ordersToday += 1;
        }
        // Resolve Merchant Account via Weighted Router Engine or Sandbox Test Gateway
        const merchantAccount = mode === 'TEST' ? {
            id: 'mch_sandbox_test',
            label: 'Sandbox Test Gateway',
            provider: 'CUSTOM_UPI',
            upiId: 'test@payvia',
            displayName: 'PayVia Test Sandbox'
        } : routerEngine_1.RouterEngine.selectMerchantAccount(tenant.id, apiKey);
        // Resolve Payment Page Template
        const resolvedTemplate = template || routerEngine_1.RouterEngine.resolveTemplate(tenant.id, apiKey);
        // Generate Unique Token and Order ID
        const linkToken = (0, uuid_1.v4)().replace(/-/g, '').slice(0, 16);
        const orderId = `BYTE${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min window
        // Resolve Base URL dynamically from request origin/referer or fallback
        let dynamicBaseUrl = BASE_FRONTEND_URL;
        const originHeader = req.headers['origin'] || req.headers['referer'];
        if (originHeader) {
            try {
                const parsed = new URL(originHeader);
                dynamicBaseUrl = `${parsed.protocol}//${parsed.host}`;
            }
            catch (e) { }
        }
        const paymentUrl = `${dynamicBaseUrl}/pay/${linkToken}`;
        const newOrder = {
            id: `ord_${(0, uuid_1.v4)().slice(0, 8)}`,
            orderId,
            tenantId: tenant.id,
            apiKeyId: apiKey.id,
            merchantAccountId: merchantAccount.id,
            merchantAccountLabel: merchantAccount.label,
            provider: merchantAccount.provider,
            amount: parsedAmount,
            currency: 'INR',
            customerMobile: customer_mobile,
            customerName: customer_name,
            customerEmail: customer_email,
            remark1,
            remark2,
            returnUrl: return_url,
            callbackUrl: callback_url,
            template: resolvedTemplate,
            linkToken,
            paymentUrl,
            status: 'PENDING',
            mode,
            expiresAt,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        database_1.db.orders.push(newOrder);
        database_1.db.save();
        return res.status(200).json({
            status: true,
            message: mode === 'TEST' ? 'Test payment link created (Sandbox mode)' : 'Payment link created',
            data: {
                order_id: newOrder.orderId,
                provider: newOrder.provider,
                merchant_account_id: merchantAccount.id,
                account_label: merchantAccount.label,
                amount: newOrder.amount,
                template: newOrder.template,
                payment_url: newOrder.paymentUrl,
                link_token: newOrder.linkToken,
                status: newOrder.status,
                mode: newOrder.mode,
                isTest: newOrder.mode === 'TEST',
                expires_at: newOrder.expiresAt,
                testUsage: mode === 'TEST' ? planService_1.PlanService.getTestUsage(tenant.id) : undefined
            }
        });
    }
    catch (e) {
        return res.status(409).json({ status: false, error: e.message });
    }
});
// Check Order Status (Public API - POST & GET support)
const handleOrderStatus = (req, res) => {
    const orderId = (req.body?.order_id || req.query?.order_id);
    if (!orderId) {
        return res.status(422).json({ status: false, error: 'order_id parameter is required' });
    }
    const order = database_1.db.orders.find(o => o.orderId === orderId && o.tenantId === req.tenant.id);
    if (!order) {
        return res.status(404).json({ status: false, error: 'Order not found on your account' });
    }
    return res.json({
        status: true,
        data: {
            order_id: order.orderId,
            provider: order.provider,
            amount: order.amount,
            txn_status: order.status,
            utr: order.utr || null,
            gateway_txn: order.gatewayTxnId || null,
            paid_at: order.paidAt || null,
            expires_at: order.expiresAt,
            payment_url: order.paymentUrl
        }
    });
};
router.post('/public/v1/order/status', auth_1.authenticateApiKey, handleOrderStatus);
router.get('/public/v1/order/status', auth_1.authenticateApiKey, handleOrderStatus);
// Submit Manual UTR (Public API)
router.post('/public/v1/order/submit-utr', async (req, res) => {
    const { link_token, utr } = req.body;
    if (!link_token || !utr) {
        return res.status(400).json({ status: false, error: 'link_token and utr are required' });
    }
    const result = await detectionEngine_1.DetectionEngine.verifyManualUtr(link_token, utr);
    if (!result.success) {
        return res.status(400).json({ status: false, error: result.message });
    }
    return res.json({
        status: true,
        message: result.message,
        data: {
            order_id: result.order?.orderId,
            status: result.order?.status,
            utr: result.order?.utr
        }
    });
});
// ==========================================
// 2. DASHBOARD / PORTAL API (JWT Authenticated)
// ==========================================
// List Orders for Tenant with filters
router.get('/', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const { status, provider, search, limit = 50, offset = 0 } = req.query;
    let filtered = database_1.db.orders.filter(o => o.tenantId === tenantId);
    if (status && status !== 'ALL') {
        filtered = filtered.filter(o => o.status === status);
    }
    if (provider && provider !== 'ALL') {
        filtered = filtered.filter(o => o.provider === provider);
    }
    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(o => o.orderId.toLowerCase().includes(q) ||
            (o.utr && o.utr.toLowerCase().includes(q)) ||
            (o.customerMobile && o.customerMobile.includes(q)) ||
            (o.customerName && o.customerName.toLowerCase().includes(q)) ||
            (o.remark1 && o.remark1.toLowerCase().includes(q)));
    }
    // Sort by newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = filtered.length;
    const sliced = filtered.slice(Number(offset), Number(offset) + Number(limit));
    return res.json({
        status: true,
        total,
        data: sliced
    });
});
// Create manual payment link from dashboard
router.post('/create-manual', auth_1.authenticateToken, (req, res) => {
    try {
        const tenant = req.tenant;
        const { amount, customerMobile, customerName, remark1, merchantAccountId, template } = req.body;
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ status: false, error: 'Enter a valid amount' });
        }
        const isPlanActive = planService_1.PlanService.isPlanActive(tenant.id);
        let mode = 'LIVE';
        if (!isPlanActive) {
            const allowed = planService_1.PlanService.consumeTestOrderQuota(tenant.id);
            if (!allowed) {
                planService_1.PlanService.logAccess(tenant.id, 'ORDER_CREATION_BLOCKED', req.originalUrl, 'BLOCKED', 'Free test limit reached (5/5)');
                return res.status(403).json({
                    status: false,
                    error: 'PLAN_UPGRADE_REQUIRED',
                    reason: 'FREE_TEST_LIMIT_REACHED',
                    message: 'Free test quota reached (5/5). Please upgrade to an active plan to create more orders or connect live merchant accounts.',
                    data: planService_1.PlanService.getTestUsage(tenant.id)
                });
            }
            mode = 'TEST';
        }
        let merchantAccount;
        if (mode === 'TEST') {
            merchantAccount = {
                id: 'mch_sandbox_test',
                label: 'Sandbox Test Gateway',
                provider: 'CUSTOM_UPI',
                upiId: 'test@payvia',
                displayName: 'PayVia Test Sandbox'
            };
        }
        else {
            if (merchantAccountId) {
                merchantAccount = database_1.db.merchants.find(m => m.id === merchantAccountId && m.tenantId === tenant.id);
            }
            if (!merchantAccount) {
                merchantAccount = routerEngine_1.RouterEngine.selectMerchantAccount(tenant.id);
            }
        }
        const resolvedTemplate = template || routerEngine_1.RouterEngine.resolveTemplate(tenant.id);
        const linkToken = (0, uuid_1.v4)().replace(/-/g, '').slice(0, 16);
        const orderId = `BYTE${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const paymentUrl = `${BASE_FRONTEND_URL}/pay/${linkToken}`;
        const newOrder = {
            id: `ord_${(0, uuid_1.v4)().slice(0, 8)}`,
            orderId,
            tenantId: tenant.id,
            merchantAccountId: merchantAccount.id,
            merchantAccountLabel: merchantAccount.label,
            provider: merchantAccount.provider,
            amount: parsedAmount,
            currency: 'INR',
            customerMobile,
            customerName,
            remark1,
            template: resolvedTemplate,
            linkToken,
            paymentUrl,
            status: 'PENDING',
            mode,
            expiresAt,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        database_1.db.orders.push(newOrder);
        database_1.db.save();
        return res.status(201).json({
            status: true,
            message: mode === 'TEST' ? 'Test payment link created (Sandbox mode)' : 'Order created',
            data: {
                ...newOrder,
                isTest: mode === 'TEST',
                testUsage: mode === 'TEST' ? planService_1.PlanService.getTestUsage(tenant.id) : undefined
            }
        });
    }
    catch (e) {
        return res.status(400).json({ status: false, error: e.message });
    }
});
// Force Verify / Settle Order from Dashboard
router.post('/:id/force-verify', auth_1.authenticateToken, async (req, res) => {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { utr } = req.body;
    const order = database_1.db.orders.find(o => o.id === id && o.tenantId === tenantId);
    if (!order) {
        return res.status(404).json({ status: false, error: 'Order not found' });
    }
    if ((order.mode ?? 'LIVE') === 'LIVE' && !planService_1.PlanService.isPlanActive(tenantId)) {
        planService_1.PlanService.logAccess(tenantId, 'SETTLEMENT_BLOCKED', req.originalUrl, 'BLOCKED', 'Active plan required for live settlement');
        return res.status(403).json({
            status: false,
            error: 'PLAN_REQUIRED',
            reason: 'ACTIVE_PLAN_REQUIRED',
            message: 'Settling live payment orders requires an active subscription plan.'
        });
    }
    order.status = 'TXN_SUCCESS';
    order.utr = utr || `MANUAL_${Date.now()}`;
    order.paidAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    order.rawVerificationData = { matchedBy: 'DASHBOARD_FORCE_VERIFY', verifiedBy: req.tenant.email };
    database_1.db.save();
    // Check and activate plan if this was a subscription order
    planService_1.PlanService.activatePurchasedPlanIfSettled(order);
    // Dispatch Webhook to merchant callback
    await webhookService_1.WebhookService.dispatchOrderCallback(order);
    return res.json({ status: true, message: 'Order marked as SUCCESS', data: order });
});
// Cancel Order
router.post('/:id/cancel', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const order = database_1.db.orders.find(o => o.id === id && o.tenantId === tenantId);
    if (!order) {
        return res.status(404).json({ status: false, error: 'Order not found' });
    }
    order.status = 'CANCELLED';
    order.updatedAt = new Date().toISOString();
    database_1.db.save();
    return res.json({ status: true, message: 'Order cancelled', data: order });
});
exports.default = router;
