"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// Apply Super Admin middleware to all routes
router.use(auth_1.authenticateToken, auth_1.requireAdmin);
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
// Update user status or assign plan manually
router.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const { planId, isActive, role } = req.body;
    const tenant = database_1.db.findTenantById(id);
    if (!tenant) {
        return res.status(404).json({ status: false, error: 'User not found' });
    }
    if (planId)
        tenant.planId = planId;
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
exports.default = router;
