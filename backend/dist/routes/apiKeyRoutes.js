"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// List API Keys
router.get('/', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const keys = database_1.db.apiKeys.filter(k => k.tenantId === tenantId);
    return res.json({ status: true, data: keys });
});
// Create new API Key
router.post('/create', auth_1.authenticateToken, (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const tenant = req.tenant;
        const plan = database_1.db.plans.find(p => p.id === tenant.planId) || database_1.db.plans[0];
        const currentKeysCount = database_1.db.apiKeys.filter(k => k.tenantId === tenantId).length;
        if (currentKeysCount >= plan.maxApiKeys) {
            return res.status(403).json({
                status: false,
                error: `Your current plan limit is ${plan.maxApiKeys} API keys. Upgrade your plan to create more.`
            });
        }
        const { name, scope, providerFilter, merchantAccountId, pinnedTemplate, webhookUrl, ipWhitelist } = req.body;
        if (!name) {
            return res.status(400).json({ status: false, error: 'API key name is required' });
        }
        const rawApiKey = `pv_live_${(0, uuid_1.v4)().replace(/-/g, '')}`;
        const salt = bcryptjs_1.default.genSaltSync(10);
        const keyHash = bcryptjs_1.default.hashSync(rawApiKey, salt);
        const webhookSecret = `whsec_${(0, uuid_1.v4)().replace(/-/g, '')}`;
        const newKey = {
            id: `key_${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId,
            name,
            keyPrefix: rawApiKey.slice(0, 12),
            rawKey: rawApiKey,
            keyHash,
            scope: scope || 'ALL',
            providerFilter: providerFilter,
            merchantAccountId,
            pinnedTemplate: pinnedTemplate || undefined,
            webhookUrl,
            webhookSecret,
            ipWhitelist: ipWhitelist || [],
            isActive: true,
            createdAt: new Date().toISOString()
        };
        database_1.db.apiKeys.push(newKey);
        database_1.db.save();
        return res.status(201).json({
            status: true,
            message: 'API key created successfully',
            data: newKey,
            rawKey: rawApiKey // Only returned on creation
        });
    }
    catch (e) {
        return res.status(500).json({ status: false, error: e.message });
    }
});
// Update API Key settings
router.put('/:id', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const key = database_1.db.apiKeys.find(k => k.id === id && k.tenantId === tenantId);
    if (!key) {
        return res.status(404).json({ status: false, error: 'API key not found' });
    }
    const { name, scope, providerFilter, merchantAccountId, pinnedTemplate, webhookUrl, ipWhitelist, isActive } = req.body;
    if (name !== undefined)
        key.name = name;
    if (scope !== undefined)
        key.scope = scope;
    if (providerFilter !== undefined)
        key.providerFilter = providerFilter;
    if (merchantAccountId !== undefined)
        key.merchantAccountId = merchantAccountId;
    if (pinnedTemplate !== undefined)
        key.pinnedTemplate = pinnedTemplate;
    if (webhookUrl !== undefined)
        key.webhookUrl = webhookUrl;
    if (ipWhitelist !== undefined)
        key.ipWhitelist = ipWhitelist;
    if (isActive !== undefined)
        key.isActive = isActive;
    database_1.db.save();
    return res.json({ status: true, message: 'API key updated', data: key });
});
// Rotate API Key
router.post('/:id/rotate', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const key = database_1.db.apiKeys.find(k => k.id === id && k.tenantId === tenantId);
    if (!key) {
        return res.status(404).json({ status: false, error: 'API key not found' });
    }
    const rawApiKey = `pv_live_${(0, uuid_1.v4)().replace(/-/g, '')}`;
    const salt = bcryptjs_1.default.genSaltSync(10);
    key.rawKey = rawApiKey;
    key.keyPrefix = rawApiKey.slice(0, 12);
    key.keyHash = bcryptjs_1.default.hashSync(rawApiKey, salt);
    database_1.db.save();
    return res.json({
        status: true,
        message: 'API key rotated successfully. Update your integration with the new key.',
        rawKey: rawApiKey
    });
});
// Delete API Key
router.delete('/:id', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const index = database_1.db.apiKeys.findIndex(k => k.id === id && k.tenantId === tenantId);
    if (index === -1) {
        return res.status(404).json({ status: false, error: 'API key not found' });
    }
    database_1.db.apiKeys.splice(index, 1);
    database_1.db.save();
    return res.json({ status: true, message: 'API key deleted' });
});
exports.default = router;
