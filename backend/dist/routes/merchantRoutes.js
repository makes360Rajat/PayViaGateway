"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
const planService_1 = require("../services/planService");
const router = (0, express_1.Router)();
// List all merchant accounts for tenant
router.get('/', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const accounts = database_1.db.merchants.filter(m => m.tenantId === tenantId);
    return res.json({ status: true, data: accounts });
});
// Create new merchant account
router.post('/create', auth_1.authenticateToken, (req, res) => {
    try {
        const tenantId = req.tenant.id;
        if (!planService_1.PlanService.isPlanActive(tenantId)) {
            planService_1.PlanService.logAccess(tenantId, 'MERCHANT_CONNECTION_BLOCKED', '/api/merchants/create', 'BLOCKED', 'Active plan required');
            return res.status(403).json({
                status: false,
                error: 'PLAN_REQUIRED',
                reason: 'ACTIVE_PLAN_REQUIRED',
                message: 'Connecting merchant accounts to receive live payments requires an active subscription plan. Please upgrade your plan.'
            });
        }
        const tenant = req.tenant;
        const plan = database_1.db.plans.find(p => p.id === tenant.planId) || database_1.db.plans[0];
        const currentAccountsCount = database_1.db.merchants.filter(m => m.tenantId === tenantId).length;
        if (currentAccountsCount >= plan.maxMerchantAccounts) {
            return res.status(403).json({
                status: false,
                error: `Your current plan limit is ${plan.maxMerchantAccounts} merchant accounts. Upgrade your plan to add more.`
            });
        }
        const { provider, label, upiId, displayName, weight, intentEnabled, credentials } = req.body;
        if (!provider || !label) {
            return res.status(400).json({ status: false, error: 'Provider and account label are required' });
        }
        const newAccount = {
            id: `m_${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId,
            provider: provider,
            label,
            upiId: upiId || 'wallet@gateway',
            displayName: displayName || label,
            weight: typeof weight === 'number' ? weight : 1,
            status: 'ACTIVE',
            intentEnabled: intentEnabled !== false,
            credentials: credentials || {},
            smsCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        database_1.db.merchants.push(newAccount);
        database_1.db.save();
        return res.status(201).json({ status: true, message: 'Merchant account connected successfully', data: newAccount });
    }
    catch (e) {
        return res.status(500).json({ status: false, error: e.message });
    }
});
// Update merchant account
router.put('/:id', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const account = database_1.db.merchants.find(m => m.id === id && m.tenantId === tenantId);
    if (!account) {
        return res.status(404).json({ status: false, error: 'Merchant account not found' });
    }
    const { label, upiId, displayName, weight, status, intentEnabled, credentials, gmailConnected, gmailEmail } = req.body;
    if (label !== undefined)
        account.label = label;
    if (upiId !== undefined)
        account.upiId = upiId;
    if (displayName !== undefined)
        account.displayName = displayName;
    if (weight !== undefined)
        account.weight = weight;
    if (status !== undefined)
        account.status = status;
    if (intentEnabled !== undefined)
        account.intentEnabled = intentEnabled;
    if (credentials !== undefined)
        account.credentials = { ...account.credentials, ...credentials };
    if (gmailConnected !== undefined)
        account.gmailConnected = gmailConnected;
    if (gmailEmail !== undefined)
        account.gmailEmail = gmailEmail;
    account.updatedAt = new Date().toISOString();
    database_1.db.save();
    return res.json({ status: true, message: 'Merchant account updated successfully', data: account });
});
// Toggle status (Active / Paused)
router.post('/:id/toggle', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const account = database_1.db.merchants.find(m => m.id === id && m.tenantId === tenantId);
    if (!account) {
        return res.status(404).json({ status: false, error: 'Merchant account not found' });
    }
    account.status = account.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    account.updatedAt = new Date().toISOString();
    database_1.db.save();
    return res.json({ status: true, message: `Account is now ${account.status.toLowerCase()}`, data: account });
});
// Delete merchant account
router.delete('/:id', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const index = database_1.db.merchants.findIndex(m => m.id === id && m.tenantId === tenantId);
    if (index === -1) {
        return res.status(404).json({ status: false, error: 'Merchant account not found' });
    }
    database_1.db.merchants.splice(index, 1);
    database_1.db.save();
    return res.json({ status: true, message: 'Merchant account disconnected' });
});
// Trigger OTP for BharatPe / Freecharge
router.post('/:id/otp-send', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { mobile } = req.body;
    const account = database_1.db.merchants.find(m => m.id === id && m.tenantId === tenantId);
    if (!account) {
        return res.status(404).json({ status: false, error: 'Merchant account not found' });
    }
    // Simulated OTP dispatch
    return res.json({
        status: true,
        message: `OTP sent successfully to ${mobile || 'your registered mobile number'}`
    });
});
// Verify OTP for BharatPe / Freecharge
router.post('/:id/otp-verify', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { otp, mobile } = req.body;
    const account = database_1.db.merchants.find(m => m.id === id && m.tenantId === tenantId);
    if (!account) {
        return res.status(404).json({ status: false, error: 'Merchant account not found' });
    }
    if (!otp || otp.length < 4) {
        return res.status(400).json({ status: false, error: 'Please enter a valid OTP' });
    }
    account.credentials = {
        ...account.credentials,
        sessionValid: true,
        mobile: mobile || account.credentials?.mobile,
        sessionToken: `session_tok_${(0, uuid_1.v4)().replace(/-/g, '')}`,
        syncedAt: new Date().toISOString()
    };
    account.status = 'ACTIVE';
    account.updatedAt = new Date().toISOString();
    database_1.db.save();
    return res.json({
        status: true,
        message: 'Account successfully authenticated and synced with provider!',
        data: account
    });
});
exports.default = router;
