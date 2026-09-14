"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authenticateApiKey = exports.authenticateToken = exports.JWT_SECRET = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../db/database");
exports.JWT_SECRET = process.env.JWT_SECRET || 'payvia_super_secure_jwt_secret_key_2026';
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) {
        return res.status(401).json({ status: false, error: 'Authentication token missing or invalid' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        const tenant = database_1.db.findTenantById(decoded.tenantId);
        if (!tenant || !tenant.isActive) {
            return res.status(401).json({ status: false, error: 'Account inactive or not found' });
        }
        req.tenant = tenant;
        next();
    }
    catch (err) {
        return res.status(401).json({ status: false, error: 'Invalid or expired session token' });
    }
};
exports.authenticateToken = authenticateToken;
const authenticateApiKey = (req, res, next) => {
    const apiKeyHeader = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    const apiKeyFromBody = req.body?.user_token;
    const rawKey = (apiKeyHeader || apiKeyFromBody);
    if (!rawKey) {
        return res.status(401).json({ status: false, error: 'API key is required in x-api-key header or Authorization: Bearer' });
    }
    const apiKey = database_1.db.findApiKeyByKey(rawKey);
    if (!apiKey) {
        return res.status(401).json({ status: false, error: 'Invalid or revoked API key' });
    }
    const tenant = database_1.db.findTenantById(apiKey.tenantId);
    if (!tenant || !tenant.isActive) {
        return res.status(401).json({ status: false, error: 'Tenant account is inactive or suspended' });
    }
    // Check IP Whitelist if configured
    if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
        const clientIp = req.ip || req.socket.remoteAddress || '';
        const isAllowed = apiKey.ipWhitelist.some(allowed => clientIp.includes(allowed));
        if (!isAllowed) {
            return res.status(403).json({ status: false, error: `Unauthorized IP address: ${clientIp}` });
        }
    }
    // Update last used timestamp
    apiKey.lastUsedAt = new Date().toISOString();
    database_1.db.save();
    req.tenant = tenant;
    req.apiKey = apiKey;
    next();
};
exports.authenticateApiKey = authenticateApiKey;
const requireAdmin = (req, res, next) => {
    if (!req.tenant || req.tenant.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ status: false, error: 'Super Admin privileges required' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
