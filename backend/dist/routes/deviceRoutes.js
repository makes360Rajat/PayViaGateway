"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const detectionEngine_1 = require("../services/detectionEngine");
const webhookService_1 = require("../services/webhookService");
const planService_1 = require("../services/planService");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// List paired devices for tenant
router.get('/', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const devices = database_1.db.devices.filter(d => d.tenantId === tenantId);
    return res.json({ status: true, data: devices });
});
// Generate pairing code & token for new Android phone
router.post('/generate-pairing', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const pairingCode = `PAIR-${Math.floor(1000 + Math.random() * 9000)}`;
    const deviceToken = `dev_tok_${(0, uuid_1.v4)().replace(/-/g, '')}`;
    const pendingDevice = {
        id: `dev_${(0, uuid_1.v4)().slice(0, 8)}`,
        tenantId,
        deviceName: 'Pending Device Pairing...',
        deviceToken,
        pairingCode,
        simSlots: [],
        batteryLevel: 100,
        isOnline: false,
        status: 'ACTIVE',
        lastHeartbeatAt: new Date().toISOString(),
        smsCapturedCount: 0,
        createdAt: new Date().toISOString()
    };
    database_1.db.devices.push(pendingDevice);
    database_1.db.save();
    const originHeader = req.headers['origin'] || req.headers['referer'];
    let dynamicServerUrl = process.env.API_BASE_URL || 'https://payvia360.com';
    if (originHeader) {
        try {
            const parsed = new URL(originHeader);
            if (parsed.hostname.includes('localhost') || parsed.hostname.includes('192.168.')) {
                dynamicServerUrl = `${parsed.protocol}//${parsed.hostname}:5001`;
            }
            else {
                dynamicServerUrl = `${parsed.protocol}//${parsed.host}`;
            }
        }
        catch (e) { }
    }
    return res.json({
        status: true,
        data: {
            pairingCode,
            deviceToken,
            serverUrl: dynamicServerUrl,
            qrData: JSON.stringify({
                serverUrl: dynamicServerUrl,
                deviceToken,
                pairingCode,
                tenantId
            })
        }
    });
});
// Delete paired device
router.delete('/:id', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const index = database_1.db.devices.findIndex(d => d.id === id && d.tenantId === tenantId);
    if (index === -1) {
        return res.status(404).json({ status: false, error: 'Device not found' });
    }
    database_1.db.devices.splice(index, 1);
    database_1.db.save();
    return res.json({ status: true, message: 'Device disconnected successfully' });
});
// Toggle paired device status (Active / Paused)
router.post('/:id/toggle', auth_1.authenticateToken, (req, res) => {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const device = database_1.db.devices.find(d => d.id === id && d.tenantId === tenantId);
    if (!device) {
        return res.status(404).json({ status: false, error: 'Device not found' });
    }
    device.status = device.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    database_1.db.save();
    return res.json({
        status: true,
        message: `Device is now ${device.status.toLowerCase()}`,
        deviceStatus: device.status,
        data: device
    });
});
// === MOBILE APP COMPANION ENDPOINTS (Authenticated via deviceToken or pairingCode) ===
// Device Complete Pairing from Mobile App
router.post('/pair', async (req, res) => {
    const { deviceToken, pairingCode, pairingId, deviceName, simSlots, batteryLevel } = req.body;
    const rawInput = (pairingCode || pairingId || deviceToken || '').trim();
    if (!rawInput) {
        return res.status(400).json({ status: false, error: 'Pairing Code or Device Token is required' });
    }
    const upperCode = rawInput.toUpperCase();
    const device = database_1.db.devices.find(d => (d.pairingCode && (d.pairingCode.toUpperCase() === upperCode || d.pairingCode.toUpperCase() === `PAIR-${upperCode}`)) ||
        (d.deviceToken && d.deviceToken === rawInput) ||
        d.id === rawInput);
    if (!device) {
        return res.status(404).json({ status: false, error: `Invalid or expired Pairing Code: "${rawInput}"` });
    }
    device.deviceName = deviceName || 'Android Gateway Phone';
    device.simSlots = simSlots || [{ slot: 1, operator: 'SIM 1' }];
    device.batteryLevel = batteryLevel || 100;
    device.isOnline = true;
    device.lastHeartbeatAt = new Date().toISOString();
    database_1.db.save();
    return res.json({
        status: true,
        message: 'Device successfully paired and activated as SMS Gateway',
        data: {
            deviceId: device.id,
            deviceToken: device.deviceToken,
            pairingCode: device.pairingCode,
            tenantId: device.tenantId
        }
    });
});
// Device Heartbeat from Mobile App (sent every 60s)
router.post('/heartbeat', async (req, res) => {
    const { deviceToken, batteryLevel } = req.body;
    if (!deviceToken) {
        return res.status(400).json({ status: false, error: 'Device token required' });
    }
    const device = database_1.db.devices.find(d => d.deviceToken === deviceToken);
    if (!device) {
        return res.status(404).json({
            status: false,
            error: 'DEVICE_DISCONNECTED',
            message: 'Device has been disconnected or removed from dashboard'
        });
    }
    device.isOnline = true;
    if (batteryLevel !== undefined)
        device.batteryLevel = batteryLevel;
    device.lastHeartbeatAt = new Date().toISOString();
    database_1.db.save();
    const devStatus = device.status || 'ACTIVE';
    return res.json({
        status: true,
        deviceStatus: devStatus,
        isPaused: devStatus === 'PAUSED',
        message: devStatus === 'PAUSED' ? 'Heartbeat acknowledged (GATEWAY PAUSED)' : 'Heartbeat acknowledged'
    });
});
// Ingest Incoming SMS from Mobile App
router.post('/sms-ingest', async (req, res) => {
    const { deviceToken, sender, message, timestamp } = req.body;
    if (!sender || !message) {
        return res.status(400).json({ status: false, error: 'sender and message are required' });
    }
    let device = database_1.db.devices.find(d => d.deviceToken === deviceToken);
    if (device && device.status === 'PAUSED') {
        return res.json({
            status: false,
            error: 'DEVICE_PAUSED',
            message: 'SMS ingestion is suspended while gateway device is paused'
        });
    }
    if (!device) {
        // Zero-drop auto-registration: fallback to first tenant or auto-create device
        const fallbackTenantId = database_1.db.tenants[0]?.id || 'tenant_default';
        device = {
            id: `dev_${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId: fallbackTenantId,
            deviceName: 'Auto-Registered Gateway Phone',
            deviceToken: deviceToken || `dev_auto_${Date.now()}`,
            pairingCode: 'AUTO',
            simSlots: [{ slot: 1, operator: 'SIM 1' }],
            batteryLevel: 100,
            isOnline: true,
            status: 'ACTIVE',
            lastHeartbeatAt: new Date().toISOString(),
            smsCapturedCount: 0,
            createdAt: new Date().toISOString()
        };
        database_1.db.devices.push(device);
        database_1.db.save();
    }
    device.isOnline = true;
    device.lastHeartbeatAt = new Date().toISOString();
    device.smsCapturedCount = (device.smsCapturedCount || 0) + 1;
    // Process via Detection Engine
    const result = await detectionEngine_1.DetectionEngine.processIncomingSms(device.id, device.tenantId, sender, message);
    return res.json({
        status: true,
        matched: result.matched,
        orderId: result.orderId || null,
        message: result.matched ? `Payment matched with Order ${result.orderId}!` : 'SMS received and logged'
    });
});
// Ingest Incoming Push Notification from Companion App (GPay, PhonePe, Paytm, BharatPe, etc.)
router.post('/notification-ingest', async (req, res) => {
    const { deviceToken, packageName, title, message } = req.body;
    if (!title) {
        return res.status(400).json({ status: false, error: 'title is required' });
    }
    let device = database_1.db.devices.find(d => d.deviceToken === deviceToken);
    if (device && device.status === 'PAUSED') {
        return res.json({
            status: false,
            error: 'DEVICE_PAUSED',
            message: 'Notification ingestion is suspended while gateway device is paused'
        });
    }
    if (!device) {
        // Zero-drop auto-registration: fallback to first tenant or auto-create device
        const fallbackTenantId = database_1.db.tenants[0]?.id || 'tenant_default';
        device = {
            id: `dev_${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId: fallbackTenantId,
            deviceName: 'Auto-Registered Gateway Phone',
            deviceToken: deviceToken || `dev_auto_${Date.now()}`,
            pairingCode: 'AUTO',
            simSlots: [{ slot: 1, operator: 'SIM 1' }],
            batteryLevel: 100,
            isOnline: true,
            status: 'ACTIVE',
            lastHeartbeatAt: new Date().toISOString(),
            smsCapturedCount: 0,
            createdAt: new Date().toISOString()
        };
        database_1.db.devices.push(device);
        database_1.db.save();
    }
    device.isOnline = true;
    device.lastHeartbeatAt = new Date().toISOString();
    device.smsCapturedCount = (device.smsCapturedCount || 0) + 1;
    // Process via Detection Engine
    const result = await detectionEngine_1.DetectionEngine.processIncomingNotification(device.id, device.tenantId, packageName || 'com.google.android.apps.nbu.paisa.user', title, message || '');
    return res.json({
        status: true,
        matched: result.matched,
        orderId: result.orderId || null,
        message: result.message
    });
});
// Companion App: Fetch Orders for Connected Tenant (with tabs & pagination)
router.get('/orders', async (req, res) => {
    const token = (req.query.deviceToken || req.headers['x-device-token'] || '').trim();
    if (!token) {
        return res.status(400).json({ status: false, error: 'deviceToken is required' });
    }
    const device = database_1.db.devices.find(d => d.deviceToken === token ||
        (d.pairingCode && d.pairingCode.toUpperCase() === token.toUpperCase()));
    if (!device) {
        return res.status(404).json({
            status: false,
            error: 'DEVICE_DISCONNECTED',
            message: 'Device has been disconnected or removed from dashboard'
        });
    }
    const devStatus = device.status || 'ACTIVE';
    const isPaused = devStatus === 'PAUSED';
    const tenantId = device.tenantId;
    const { status, limit = 20, offset = 0 } = req.query;
    let allTenantOrders = database_1.db.orders.filter(o => o.tenantId === tenantId);
    allTenantOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const counts = {
        all: allTenantOrders.length,
        verified: allTenantOrders.filter(o => o.status === 'TXN_SUCCESS').length,
        pending: allTenantOrders.filter(o => o.status === 'PENDING').length,
        rejected: allTenantOrders.filter(o => o.status === 'FAILED' || o.status === 'CANCELLED' || o.status === 'EXPIRED').length,
    };
    let filtered = allTenantOrders;
    if (status && status !== 'ALL') {
        const s = status.toUpperCase();
        if (s === 'VERIFIED' || s === 'TXN_SUCCESS') {
            filtered = filtered.filter(o => o.status === 'TXN_SUCCESS');
        }
        else if (s === 'PENDING') {
            filtered = filtered.filter(o => o.status === 'PENDING');
        }
        else if (s === 'REJECTED' || s === 'CANCELLED' || s === 'FAILED') {
            filtered = filtered.filter(o => o.status === 'CANCELLED' || o.status === 'FAILED' || o.status === 'EXPIRED');
        }
    }
    const total = filtered.length;
    const sliced = filtered.slice(Number(offset), Number(offset) + Number(limit));
    return res.json({
        status: true,
        deviceStatus: devStatus,
        isPaused,
        total,
        counts,
        orders: sliced,
        data: sliced,
        pagination: {
            total,
            limit: Number(limit),
            offset: Number(offset),
            hasMore: Number(offset) + Number(limit) < total
        }
    });
});
// Companion App: Manually Settle / Verify Order
router.post('/orders/:id/settle', async (req, res) => {
    const { deviceToken, utr } = req.body;
    const { id } = req.params;
    if (!deviceToken) {
        return res.status(400).json({ status: false, error: 'deviceToken is required' });
    }
    const device = database_1.db.devices.find(d => d.deviceToken === deviceToken ||
        (d.pairingCode && d.pairingCode.toUpperCase() === deviceToken.toUpperCase()));
    if (!device) {
        return res.status(404).json({
            status: false,
            error: 'DEVICE_DISCONNECTED',
            message: 'Device has been disconnected or removed from dashboard'
        });
    }
    if (device.status === 'PAUSED') {
        return res.status(403).json({
            status: false,
            error: 'DEVICE_PAUSED',
            message: 'Cannot settle or verify orders while gateway device is paused from dashboard'
        });
    }
    const order = database_1.db.orders.find(o => (o.id === id || o.orderId === id) && o.tenantId === device.tenantId);
    if (!order) {
        return res.status(404).json({ status: false, error: 'Order not found for this merchant' });
    }
    if ((order.remark1 || '').startsWith('PLAN_PURCHASE:')) {
        return res.status(403).json({
            status: false,
            error: 'Subscription orders cannot be manually settled. Submit the payment receipt through SMS/notification capture.'
        });
    }
    order.status = 'TXN_SUCCESS';
    order.utr = utr || `MANUAL_${Date.now()}`;
    order.paidAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    order.rawVerificationData = {
        matchedBy: 'COMPANION_APP_MANUAL',
        deviceId: device.id,
        deviceName: device.deviceName
    };
    database_1.db.save();
    // Check and activate plan if this was a subscription order
    planService_1.PlanService.activatePurchasedPlanIfSettled(order);
    // Dispatch Webhook to merchant callback
    try {
        await webhookService_1.WebhookService.dispatchOrderCallback(order);
    }
    catch (err) {
        console.error('Webhook dispatch error:', err);
    }
    return res.json({
        status: true,
        message: `Order ${order.orderId} successfully marked as SETTLED / VERIFIED`,
        data: order
    });
});
// Companion App: Manually Cancel Order
router.post('/orders/:id/cancel', async (req, res) => {
    const { deviceToken } = req.body;
    const { id } = req.params;
    if (!deviceToken) {
        return res.status(400).json({ status: false, error: 'deviceToken is required' });
    }
    const device = database_1.db.devices.find(d => d.deviceToken === deviceToken ||
        (d.pairingCode && d.pairingCode.toUpperCase() === deviceToken.toUpperCase()));
    if (!device) {
        return res.status(404).json({
            status: false,
            error: 'DEVICE_DISCONNECTED',
            message: 'Device has been disconnected or removed from dashboard'
        });
    }
    if (device.status === 'PAUSED') {
        return res.status(403).json({
            status: false,
            error: 'DEVICE_PAUSED',
            message: 'Cannot cancel orders while gateway device is paused from dashboard'
        });
    }
    const order = database_1.db.orders.find(o => (o.id === id || o.orderId === id) && o.tenantId === device.tenantId);
    if (!order) {
        return res.status(404).json({ status: false, error: 'Order not found for this merchant' });
    }
    order.status = 'CANCELLED';
    order.updatedAt = new Date().toISOString();
    database_1.db.save();
    return res.json({
        status: true,
        message: `Order ${order.orderId} marked as CANCELLED`,
        data: order
    });
});
exports.default = router;
