"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const detectionEngine_1 = require("../services/detectionEngine");
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
        return res.status(404).json({ status: false, error: 'Device not recognized' });
    }
    device.isOnline = true;
    if (batteryLevel !== undefined)
        device.batteryLevel = batteryLevel;
    device.lastHeartbeatAt = new Date().toISOString();
    database_1.db.save();
    return res.json({ status: true, message: 'Heartbeat acknowledged' });
});
// Ingest Incoming SMS from Mobile App
router.post('/sms-ingest', async (req, res) => {
    const { deviceToken, sender, message, timestamp } = req.body;
    if (!deviceToken || !sender || !message) {
        return res.status(400).json({ status: false, error: 'deviceToken, sender and message are required' });
    }
    const device = database_1.db.devices.find(d => d.deviceToken === deviceToken);
    if (!device) {
        return res.status(401).json({ status: false, error: 'Unauthorized device token' });
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
exports.default = router;
