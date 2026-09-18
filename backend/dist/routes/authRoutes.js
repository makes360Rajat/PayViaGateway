"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
const planService_1 = require("../services/planService");
const router = (0, express_1.Router)();
// Register new merchant account
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, businessName, phone } = req.body;
        if (!email || !password || !businessName) {
            return res.status(400).json({ status: false, error: 'Email, password, and business name are required' });
        }
        const existing = database_1.db.findTenantByEmail(email);
        if (existing) {
            return res.status(409).json({ status: false, error: 'An account with this email already exists' });
        }
        const salt = bcryptjs_1.default.genSaltSync(10);
        const passwordHash = bcryptjs_1.default.hashSync(password, salt);
        const newTenant = {
            id: `tenant_${(0, uuid_1.v4)().slice(0, 8)}`,
            name: name || businessName,
            email: email.toLowerCase(),
            passwordHash,
            role: 'MERCHANT',
            businessName,
            phone,
            planId: 'plan_starter',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const newSubscription = {
            id: `sub_${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId: newTenant.id,
            planId: 'plan_starter',
            status: 'PENDING_PAYMENT',
            startsAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
            ordersToday: 0,
            lastResetDate: new Date().toISOString().slice(0, 10)
        };
        const newPlanUsage = {
            id: `pusg_${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId: newTenant.id,
            testOrdersUsed: 0,
            testOrdersLimit: 5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        database_1.db.planUsage.push(newPlanUsage);
        // Auto-generate a primary API key
        const rawApiKey = `pv_live_${(0, uuid_1.v4)().replace(/-/g, '')}`;
        const keyHash = bcryptjs_1.default.hashSync(rawApiKey, salt);
        const defaultApiKey = {
            id: `key_${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId: newTenant.id,
            name: 'Default API Key',
            keyPrefix: rawApiKey.slice(0, 12),
            rawKey: rawApiKey,
            keyHash,
            scope: 'ALL',
            pinnedTemplate: 'template_1',
            webhookSecret: `whsec_${(0, uuid_1.v4)().replace(/-/g, '')}`,
            isActive: true,
            createdAt: new Date().toISOString()
        };
        // Template settings
        const defaultTemplateSettings = {
            tenantId: newTenant.id,
            templateMode: 'rotate',
            defaultTemplate: 'template_1',
            enabledTemplates: [
                'template_1', 'template_2', 'template_3', 'template_4', 'template_5',
                'template_6', 'template_7', 'template_8', 'template_9', 'template_10', 'template_11'
            ],
            brandName: businessName,
            brandColor: '#6366f1'
        };
        database_1.db.tenants.push(newTenant);
        database_1.db.subscriptions.push(newSubscription);
        database_1.db.apiKeys.push(defaultApiKey);
        database_1.db.templateSettings.push(defaultTemplateSettings);
        database_1.db.save();
        const token = jsonwebtoken_1.default.sign({ tenantId: newTenant.id, email: newTenant.email, role: newTenant.role }, auth_1.JWT_SECRET, { expiresIn: '30d' });
        return res.status(201).json({
            status: true,
            message: 'Account registered successfully',
            data: {
                token,
                tenant: {
                    id: newTenant.id,
                    name: newTenant.name,
                    email: newTenant.email,
                    role: newTenant.role,
                    businessName: newTenant.businessName,
                    planId: newTenant.planId
                },
                apiKey: rawApiKey
            }
        });
    }
    catch (e) {
        return res.status(500).json({ status: false, error: e.message });
    }
});
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ status: false, error: 'Email and password are required' });
        }
        const tenant = database_1.db.findTenantByEmail(email);
        if (!tenant) {
            return res.status(401).json({ status: false, error: 'Invalid email or password' });
        }
        const isValid = bcryptjs_1.default.compareSync(password, tenant.passwordHash);
        if (!isValid) {
            return res.status(401).json({ status: false, error: 'Invalid email or password' });
        }
        if (!tenant.isActive) {
            return res.status(403).json({ status: false, error: 'This account has been suspended or deactivated' });
        }
        const token = jsonwebtoken_1.default.sign({ tenantId: tenant.id, email: tenant.email, role: tenant.role }, auth_1.JWT_SECRET, { expiresIn: '30d' });
        return res.json({
            status: true,
            data: {
                token,
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    email: tenant.email,
                    role: tenant.role,
                    businessName: tenant.businessName,
                    phone: tenant.phone,
                    planId: tenant.planId
                }
            }
        });
    }
    catch (e) {
        return res.status(500).json({ status: false, error: e.message });
    }
});
// Current User Profile
router.get('/me', auth_1.authenticateToken, (req, res) => {
    const tenant = req.tenant;
    const plan = database_1.db.plans.find(p => p.id === tenant.planId) || database_1.db.plans[0];
    const subscription = database_1.db.subscriptions.find(s => s.tenantId === tenant.id);
    return res.json({
        status: true,
        data: {
            tenant: {
                id: tenant.id,
                name: tenant.name,
                email: tenant.email,
                role: tenant.role,
                businessName: tenant.businessName,
                phone: tenant.phone,
                planId: tenant.planId,
                createdAt: tenant.createdAt
            },
            plan,
            subscription,
            entitlements: planService_1.PlanService.getEntitlements(tenant.id),
            planUsage: planService_1.PlanService.getTestUsage(tenant.id)
        }
    });
});
// Update Profile
router.put('/profile', auth_1.authenticateToken, (req, res) => {
    const tenant = req.tenant;
    const { name, businessName, phone, currentPassword, newPassword } = req.body;
    if (name)
        tenant.name = name;
    if (businessName)
        tenant.businessName = businessName;
    if (phone)
        tenant.phone = phone;
    if (newPassword) {
        if (!currentPassword || !bcryptjs_1.default.compareSync(currentPassword, tenant.passwordHash)) {
            return res.status(400).json({ status: false, error: 'Current password is incorrect' });
        }
        const salt = bcryptjs_1.default.genSaltSync(10);
        tenant.passwordHash = bcryptjs_1.default.hashSync(newPassword, salt);
    }
    tenant.updatedAt = new Date().toISOString();
    database_1.db.save();
    return res.json({
        status: true,
        message: 'Profile updated successfully',
        data: {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            businessName: tenant.businessName,
            phone: tenant.phone
        }
    });
});
exports.default = router;
