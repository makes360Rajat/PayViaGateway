"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// Apply Super Admin middleware to all routes
router.use(auth_1.authenticateToken, auth_1.requireAdmin);
// The receiving account for subscription payments.  This is deliberately a
// platform-owned setting rather than a merchant fallback, so every plan QR
// points to the Super Admin's configured VPA.
router.get('/billing-account', (_req, res) => {
    const admin = database_1.db.tenants.find(t => t.role === 'SUPER_ADMIN');
    if (!admin)
        return res.status(404).json({ status: false, error: 'Super Admin account not found' });
    const accounts = database_1.db.merchants.filter(m => m.tenantId === admin.id && m.status === 'ACTIVE');
    const account = accounts.find(m => m.credentials?.isPlatformBilling === true) || accounts[0] || null;
    return res.json({ status: true, data: account });
});
router.put('/billing-account', (req, res) => {
    const { upiId, displayName, label, provider = 'CUSTOM_UPI' } = req.body;
    const cleanUpiId = String(upiId || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,256}@[a-z0-9._-]{2,256}$/i.test(cleanUpiId)) {
        return res.status(400).json({ status: false, error: 'Enter a valid UPI ID, for example business@bank' });
    }
    const admin = database_1.db.tenants.find(t => t.role === 'SUPER_ADMIN');
    if (!admin)
        return res.status(404).json({ status: false, error: 'Super Admin account not found' });
    const now = new Date().toISOString();
    const adminAccounts = database_1.db.merchants.filter(m => m.tenantId === admin.id);
    let account = adminAccounts.find(m => m.credentials?.isPlatformBilling === true) || adminAccounts[0];
    // Only one platform collection account can be active at a time.
    adminAccounts.forEach(m => { m.credentials = { ...m.credentials, isPlatformBilling: false }; });
    if (!account) {
        account = {
            id: `m_platform_${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId: admin.id,
            provider: provider,
            label: String(label || 'Platform subscription collection'),
            upiId: cleanUpiId,
            displayName: String(displayName || admin.businessName || 'PayVia Platform'),
            weight: 1,
            status: 'ACTIVE',
            intentEnabled: true,
            credentials: { isPlatformBilling: true },
            smsCount: 0,
            createdAt: now,
            updatedAt: now
        };
        database_1.db.merchants.push(account);
    }
    else {
        account.upiId = cleanUpiId;
        account.displayName = String(displayName || account.displayName || 'PayVia Platform');
        account.label = String(label || account.label || 'Platform subscription collection');
        account.provider = provider;
        account.status = 'ACTIVE';
        account.intentEnabled = true;
        account.credentials = { ...account.credentials, isPlatformBilling: true };
        account.updatedAt = now;
    }
    database_1.db.save();
    return res.json({ status: true, message: 'Platform subscription receiving UPI account saved', data: account });
});
// Platform Overview Metrics
router.get('/stats', (req, res) => {
    const totalTenants = database_1.db.tenants.length;
    const activeTenants = database_1.db.tenants.filter(t => t.isActive).length;
    const totalMerchants = database_1.db.merchants.length;
    const activeMerchants = database_1.db.merchants.filter(m => m.status === 'ACTIVE').length;
    const today = new Date().toISOString().slice(0, 10);
    const totalOrders = database_1.db.orders.length;
    const todayOrders = database_1.db.orders.filter(o => o.createdAt.startsWith(today));
    const totalVolume = database_1.db.orders
        .filter(o => o.status === 'TXN_SUCCESS')
        .reduce((sum, o) => sum + o.amount, 0);
    const todayVolume = todayOrders
        .filter(o => o.status === 'TXN_SUCCESS')
        .reduce((sum, o) => sum + o.amount, 0);
    const successfulOrdersCount = database_1.db.orders.filter(o => o.status === 'TXN_SUCCESS').length;
    const successRate = totalOrders > 0 ? ((successfulOrdersCount / totalOrders) * 100).toFixed(1) : '100.0';
    return res.json({
        status: true,
        data: {
            totalTenants,
            activeTenants,
            totalMerchants,
            activeMerchants,
            totalOrders,
            todayOrdersCount: todayOrders.length,
            totalVolume,
            todayVolume,
            successRate: parseFloat(successRate),
            activeDevices: database_1.db.devices.filter(d => d.isOnline).length
        }
    });
});
// List all tenants / merchants
router.get('/users', (req, res) => {
    const usersWithStats = database_1.db.tenants.map(t => {
        const plan = database_1.db.plans.find(p => p.id === t.planId);
        const merchantAccountsCount = database_1.db.merchants.filter(m => m.tenantId === t.id).length;
        const ordersCount = database_1.db.orders.filter(o => o.tenantId === t.id).length;
        const totalVolume = database_1.db.orders
            .filter(o => o.tenantId === t.id && o.status === 'TXN_SUCCESS')
            .reduce((sum, o) => sum + o.amount, 0);
        return {
            id: t.id,
            name: t.name,
            email: t.email,
            role: t.role,
            businessName: t.businessName,
            phone: t.phone,
            plan: plan?.name || 'Free',
            isActive: t.isActive,
            merchantAccountsCount,
            ordersCount,
            totalVolume,
            createdAt: t.createdAt
        };
    });
    return res.json({ status: true, data: usersWithStats });
});
// Super Admin Plan Approval without payment (Free Plan or any tier)
router.post('/users/:id/approve-plan', (req, res) => {
    const { id } = req.params;
    const { planId = 'plan_free' } = req.body;
    const tenant = database_1.db.findTenantById(id);
    if (!tenant) {
        return res.status(404).json({ status: false, error: 'User not found' });
    }
    let plan = database_1.db.plans.find(p => p.id === planId);
    if (!plan && planId === 'plan_free') {
        const freePlan = {
            id: 'plan_free',
            name: 'Free Plan',
            price: 0,
            maxMerchantAccounts: 2,
            maxOrdersPerDay: 500,
            maxApiKeys: 2,
            validityDays: 365,
            features: {
                webhooks: true,
                smsGateway: true,
                crypto: false,
                prioritySupport: false,
                customBranding: false
            },
            isActive: true
        };
        database_1.db.plans.push(freePlan);
        plan = freePlan;
    }
    if (!plan) {
        return res.status(404).json({ status: false, error: 'Subscription plan not found' });
    }
    tenant.planId = plan.id;
    tenant.isActive = true;
    tenant.updatedAt = new Date().toISOString();
    let sub = database_1.db.subscriptions.find(s => s.tenantId === tenant.id);
    const now = new Date();
    const expires = new Date(now.getTime() + (plan.validityDays || 365) * 86400000);
    if (sub) {
        sub.planId = plan.id;
        sub.status = 'ACTIVE';
        sub.startsAt = now.toISOString();
        sub.expiresAt = expires.toISOString();
        sub.ordersToday = 0;
    }
    else {
        sub = {
            id: 'sub_' + Math.random().toString(36).substring(2, 9),
            tenantId: tenant.id,
            planId: plan.id,
            status: 'ACTIVE',
            startsAt: now.toISOString(),
            expiresAt: expires.toISOString(),
            ordersToday: 0,
            lastResetDate: now.toISOString().split('T')[0]
        };
        database_1.db.subscriptions.push(sub);
    }
    database_1.db.save();
    return res.json({
        status: true,
        message: `✓ ${tenant.name} successfully approved under ${plan.name} without payment!`,
        data: {
            tenantId: tenant.id,
            planId: plan.id,
            planName: plan.name,
            status: 'ACTIVE'
        }
    });
});
// Update account controls (Active/Inactive, Role, and Super Admin Plan override)
router.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const { planId, isActive, role } = req.body;
    const tenant = database_1.db.findTenantById(id);
    if (!tenant) {
        return res.status(404).json({ status: false, error: 'User not found' });
    }
    if (planId !== undefined) {
        const plan = database_1.db.plans.find(p => p.id === planId);
        if (plan) {
            tenant.planId = plan.id;
            let sub = database_1.db.subscriptions.find(s => s.tenantId === tenant.id);
            const now = new Date();
            const expires = new Date(now.getTime() + (plan.validityDays || 365) * 86400000);
            if (sub) {
                sub.planId = plan.id;
                sub.status = 'ACTIVE';
                sub.startsAt = now.toISOString();
                sub.expiresAt = expires.toISOString();
            }
            else {
                database_1.db.subscriptions.push({
                    id: 'sub_' + Math.random().toString(36).substring(2, 9),
                    tenantId: tenant.id,
                    planId: plan.id,
                    status: 'ACTIVE',
                    startsAt: now.toISOString(),
                    expiresAt: expires.toISOString(),
                    ordersToday: 0,
                    lastResetDate: now.toISOString().split('T')[0]
                });
            }
        }
    }
    if (isActive !== undefined)
        tenant.isActive = isActive;
    if (role)
        tenant.role = role;
    tenant.updatedAt = new Date().toISOString();
    database_1.db.save();
    return res.json({ status: true, message: 'User updated successfully', data: tenant });
});
// Global Orders Firehose (cross-tenant)
router.get('/orders', (req, res) => {
    const { search, status, provider, limit = 100 } = req.query;
    let orders = [...database_1.db.orders];
    if (status && status !== 'ALL') {
        orders = orders.filter(o => o.status === status);
    }
    if (provider && provider !== 'ALL') {
        orders = orders.filter(o => o.provider === provider);
    }
    if (search) {
        const q = search.toLowerCase();
        orders = orders.filter(o => o.orderId.toLowerCase().includes(q) ||
            (o.utr && o.utr.toLowerCase().includes(q)) ||
            (o.customerMobile && o.customerMobile.includes(q)));
    }
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({
        status: true,
        total: orders.length,
        data: orders.slice(0, Number(limit))
    });
});
// Dynamic Plan Management (CRUD)
router.post('/plans/create', (req, res) => {
    const { name, price, validityDays, maxMerchantAccounts, maxOrdersPerDay, maxApiKeys, features } = req.body;
    if (!name || price === undefined) {
        return res.status(400).json({ status: false, error: 'Name and price are required' });
    }
    const newPlan = {
        id: `plan_${(0, uuid_1.v4)().slice(0, 8)}`,
        name,
        price: Number(price),
        validityDays: Number(validityDays || 30),
        maxMerchantAccounts: Number(maxMerchantAccounts || 5),
        maxOrdersPerDay: Number(maxOrdersPerDay || 500),
        maxApiKeys: Number(maxApiKeys || 3),
        features: features || {
            webhooks: true,
            smsGateway: true,
            crypto: false,
            prioritySupport: false,
            customBranding: false
        },
        isActive: true
    };
    database_1.db.plans.push(newPlan);
    database_1.db.save();
    return res.status(201).json({ status: true, message: 'Plan created', data: newPlan });
});
router.put('/plans/:id', (req, res) => {
    const { id } = req.params;
    const plan = database_1.db.plans.find(p => p.id === id);
    if (!plan) {
        return res.status(404).json({ status: false, error: 'Plan not found' });
    }
    const { name, price, validityDays, maxMerchantAccounts, maxOrdersPerDay, maxApiKeys, features, isActive } = req.body;
    if (name !== undefined)
        plan.name = name;
    if (price !== undefined)
        plan.price = Number(price);
    if (validityDays !== undefined)
        plan.validityDays = Number(validityDays);
    if (maxMerchantAccounts !== undefined)
        plan.maxMerchantAccounts = Number(maxMerchantAccounts);
    if (maxOrdersPerDay !== undefined)
        plan.maxOrdersPerDay = Number(maxOrdersPerDay);
    if (maxApiKeys !== undefined)
        plan.maxApiKeys = Number(maxApiKeys);
    if (features !== undefined)
        plan.features = { ...plan.features, ...features };
    if (isActive !== undefined)
        plan.isActive = isActive;
    database_1.db.save();
    return res.json({ status: true, message: 'Plan updated', data: plan });
});
router.patch('/plans/:id/toggle-status', (req, res) => {
    const { id } = req.params;
    const plan = database_1.db.plans.find(p => p.id === id);
    if (!plan) {
        return res.status(404).json({ status: false, error: 'Plan not found' });
    }
    plan.isActive = !plan.isActive;
    database_1.db.save();
    return res.json({
        status: true,
        message: `Plan ${plan.name} is now ${plan.isActive ? 'ACTIVE' : 'INACTIVE'}`,
        data: { id: plan.id, isActive: plan.isActive }
    });
});
router.delete('/plans/:id', (req, res) => {
    const { id } = req.params;
    if (id === 'plan_free') {
        return res.status(400).json({ status: false, error: 'Cannot delete standard Free Plan. You may deactivate it instead.' });
    }
    const idx = database_1.db.plans.findIndex(p => p.id === id);
    if (idx === -1) {
        return res.status(404).json({ status: false, error: 'Plan not found' });
    }
    // Reassign any tenants on this plan to Free Plan
    database_1.db.tenants.forEach(t => {
        if (t.planId === id)
            t.planId = 'plan_free';
    });
    database_1.db.plans.splice(idx, 1);
    database_1.db.save();
    return res.json({ status: true, message: 'Plan deleted successfully. Any affected tenants have been moved to Free Plan.' });
});
exports.default = router;
