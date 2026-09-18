"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
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
    // Super Admin can activate without payment
    if (tenant.role === 'SUPER_ADMIN') {
        tenant.planId = targetPlan.id;
        tenant.updatedAt = new Date().toISOString();
        let subscription = database_1.db.subscriptions.find(s => s.tenantId === tenantId);
        if (!subscription) {
            subscription = {
                id: `sub_${(0, uuid_1.v4)().slice(0, 8)}`,
                tenantId,
                planId: targetPlan.id,
                status: 'ACTIVE',
                startsAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
                ordersToday: 0,
                lastResetDate: new Date().toISOString().slice(0, 10)
            };
            database_1.db.subscriptions.push(subscription);
        }
        else {
            subscription.planId = targetPlan.id;
            subscription.status = 'ACTIVE';
            subscription.expiresAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
        }
        database_1.db.save();
        return res.json({
            status: true,
            message: `Super Admin activated ${targetPlan.name} plan directly`,
            data: {
                orderId: 'ord_admin_bypass',
                isSettled: true,
                isPlanActive: true,
                plan: targetPlan
            }
        });
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
// Upgrade / Change Subscription Plan (Super Admin only - merchants must pay via /purchase)
router.post('/upgrade', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const tenant = req.tenant;
    const { planId } = req.body;
    if (tenant.role !== 'SUPER_ADMIN') {
        return res.status(402).json({
            status: false,
            error: 'Payment required to activate plan. Please initiate plan purchase.'
        });
    }
    const targetPlan = database_1.db.plans.find(p => p.id === planId && p.isActive);
    if (!targetPlan) {
        return res.status(404).json({ status: false, error: 'Selected plan not found' });
    }
    tenant.planId = targetPlan.id;
    tenant.updatedAt = new Date().toISOString();
    let subscription = database_1.db.subscriptions.find(s => s.tenantId === tenantId);
    if (!subscription) {
        subscription = {
            id: `sub_${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId,
            planId: targetPlan.id,
            status: 'ACTIVE',
            startsAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + targetPlan.validityDays * 24 * 3600 * 1000).toISOString(),
            ordersToday: 0,
            lastResetDate: new Date().toISOString().slice(0, 10)
        };
        database_1.db.subscriptions.push(subscription);
    }
    else {
        subscription.planId = targetPlan.id;
        subscription.status = 'ACTIVE';
        subscription.expiresAt = new Date(Date.now() + targetPlan.validityDays * 24 * 3600 * 1000).toISOString();
    }
    database_1.db.save();
    return res.json({
        status: true,
        message: `Successfully upgraded to ${targetPlan.name} plan!`,
        data: {
            plan: targetPlan,
            subscription
        }
    });
});
exports.default = router;
