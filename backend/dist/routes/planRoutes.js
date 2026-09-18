"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const planService_1 = require("../services/planService");
const router = (0, express_1.Router)();
// List all available plans
router.get('/', (req, res) => {
    const plans = database_1.db.plans.filter(p => p.isActive);
    return res.json({ status: true, data: plans });
});
// Get current subscription & usage stats
router.get('/current', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const tenant = req.tenant;
    const plan = database_1.db.plans.find(p => p.id === tenant.planId) || database_1.db.plans[0];
    const subscription = database_1.db.subscriptions.find(s => s.tenantId === tenantId);
    const activeMerchantsCount = database_1.db.merchants.filter(m => m.tenantId === tenantId && m.status === 'ACTIVE').length;
    const totalApiKeysCount = database_1.db.apiKeys.filter(k => k.tenantId === tenantId).length;
    const today = new Date().toISOString().slice(0, 10);
    const ordersTodayCount = database_1.db.orders.filter(o => o.tenantId === tenantId && o.createdAt.startsWith(today)).length;
    return res.json({
        status: true,
        data: {
            plan,
            subscription,
            entitlements: planService_1.PlanService.getEntitlements(tenantId),
            testUsage: planService_1.PlanService.getTestUsage(tenantId),
            usage: {
                merchantsUsed: activeMerchantsCount,
                merchantsMax: plan.maxMerchantAccounts,
                apiKeysUsed: totalApiKeysCount,
                apiKeysMax: plan.maxApiKeys,
                ordersToday: ordersTodayCount,
                ordersMax: plan.maxOrdersPerDay
            }
        }
    });
});
// Initiate Plan Purchase (Routed exclusively to Super Admin's merchant account)
router.post('/purchase', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const tenant = req.tenant;
    const { planId } = req.body;
    const targetPlan = database_1.db.plans.find(p => p.id === planId && p.isActive);
    if (!targetPlan) {
        return res.status(404).json({ status: false, error: 'Selected plan not found' });
    }
    try {
        const origin = req.headers['origin'] || req.headers['referer'];
        let baseUrl = 'https://payvia360.com';
        if (origin) {
            try {
                const parsed = new URL(origin);
                baseUrl = `${parsed.protocol}//${parsed.host}`;
            }
            catch (e) { }
        }
        const orderInfo = planService_1.PlanService.createSubscriptionOrder(tenant, targetPlan, baseUrl);
        return res.json({
            status: true,
            message: 'Subscription payment order created. Please complete payment to Super Admin account.',
            data: orderInfo
        });
    }
    catch (e) {
        return res.status(500).json({ status: false, error: e.message });
    }
});
// Check Plan Purchase & Activation Status
router.get('/purchase-status', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const orderId = (req.query.orderId || req.query.order_id || req.query.id);
    const linkToken = (req.query.token || req.query.linkToken);
    if (!orderId && !linkToken) {
        return res.status(400).json({ status: false, error: 'orderId or token is required' });
    }
    const order = database_1.db.orders.find(o => o.orderId === orderId || o.id === orderId || o.linkToken === linkToken);
    if (!order) {
        return res.status(404).json({ status: false, error: 'Subscription order not found' });
    }
    // Subscription orders belong to the buyer encoded in their protected order
    // remark.  Do not disclose or poll another tenant's purchase by guessing an
    // order id or link token.
    const purchaseParts = (order.remark1 || '').split(':');
    if (purchaseParts[0] !== 'PLAN_PURCHASE' || purchaseParts[2] !== tenantId) {
        return res.status(403).json({ status: false, error: 'This subscription order does not belong to your account' });
    }
    const isSettled = (order.status === 'TXN_SUCCESS');
    if (isSettled) {
        planService_1.PlanService.activatePurchasedPlanIfSettled(order);
    }
    const isActive = planService_1.PlanService.isPlanActive(tenantId);
    const sub = planService_1.PlanService.getSubscription(tenantId);
    return res.json({
        status: true,
        data: {
            orderId: order.orderId,
            status: order.status,
            isSettled,
            isPlanActive: isActive,
            paidAmount: order.amount,
            utr: order.utr || null,
            planId: sub?.planId || null,
            subscription: sub
        }
    });
});
// Upgrades must use the same verified purchase flow as new subscriptions.
router.post('/upgrade', auth_1.authenticateToken, (req, res) => {
    return res.status(402).json({
        status: false,
        error: 'Payment required. Create a verified purchase order via /plans/purchase.'
    });
});
exports.default = router;
