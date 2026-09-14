"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
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
// Upgrade / Change Subscription Plan
router.post('/upgrade', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const tenant = req.tenant;
    const { planId } = req.body;
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
