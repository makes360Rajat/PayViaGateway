import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { DetectionEngine } from '../services/detectionEngine';
import { WebhookService } from '../services/webhookService';
import { PlanService } from '../services/planService';
import { PairedDevice } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// List paired devices for tenant
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const devices = db.devices.filter(d => d.tenantId === tenantId);
  return res.json({ status: true, data: devices });
});

// Generate pairing code & token for new Android phone
router.post('/generate-pairing', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const pairingCode = `PAIR-${Math.floor(1000 + Math.random() * 9000)}`;
  const deviceToken = `dev_tok_${uuidv4().replace(/-/g, '')}`;

  const pendingDevice: PairedDevice = {
    id: `dev_${uuidv4().slice(0, 8)}`,
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

  db.devices.push(pendingDevice);
  db.save();

  const originHeader = req.headers['origin'] || req.headers['referer'];
  let dynamicServerUrl = process.env.API_BASE_URL || 'https://payvia360.com';
  if (originHeader) {
    try {
      const parsed = new URL(originHeader as string);
      if (parsed.hostname.includes('localhost') || parsed.hostname.includes('192.168.')) {
        dynamicServerUrl = `${parsed.protocol}//${parsed.hostname}:5001`;
      } else {
        dynamicServerUrl = `${parsed.protocol}//${parsed.host}`;
      }
    } catch (e) {}
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
router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { id } = req.params;
  const index = db.devices.findIndex(d => d.id === id && d.tenantId === tenantId);

  if (index === -1) {
    return res.status(404).json({ status: false, error: 'Device not found' });
  }

  db.devices.splice(index, 1);
  db.save();

  return res.json({ status: true, message: 'Device disconnected successfully' });
});

// Toggle paired device status (Active / Paused)
router.post('/:id/toggle', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { id } = req.params;
  const device = db.devices.find(d => d.id === id && d.tenantId === tenantId);

  if (!device) {
    return res.status(404).json({ status: false, error: 'Device not found' });
  }

  device.status = device.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
  db.save();

  return res.json({
    status: true,
    message: `Device is now ${device.status.toLowerCase()}`,
    deviceStatus: device.status,
    data: device
  });
});

// === MOBILE APP COMPANION ENDPOINTS (Authenticated via deviceToken or pairingCode) ===

// Device Complete Pairing from Mobile App
router.post('/pair', async (req: Request, res: Response) => {
  const { deviceToken, pairingCode, pairingId, deviceName, simSlots, batteryLevel } = req.body;

  const rawInput = (pairingCode || pairingId || deviceToken || '').trim();
  if (!rawInput) {
    return res.status(400).json({ status: false, error: 'Pairing Code or Device Token is required' });
  }

  const upperCode = rawInput.toUpperCase();
  const device = db.devices.find(d => 
    (d.pairingCode && (d.pairingCode.toUpperCase() === upperCode || d.pairingCode.toUpperCase() === `PAIR-${upperCode}`)) ||
    (d.deviceToken && d.deviceToken === rawInput) ||
    d.id === rawInput
  );

  if (!device) {
    return res.status(404).json({ status: false, error: `Invalid or expired Pairing Code: "${rawInput}"` });
  }

  device.deviceName = deviceName || 'Android Gateway Phone';
  device.simSlots = simSlots || [{ slot: 1, operator: 'SIM 1' }];
  device.batteryLevel = batteryLevel || 100;
  device.isOnline = true;
  device.lastHeartbeatAt = new Date().toISOString();
  db.save();

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
router.post('/heartbeat', async (req: Request, res: Response) => {
  const { deviceToken, batteryLevel } = req.body;

  if (!deviceToken) {
    return res.status(400).json({ status: false, error: 'Device token required' });
  }

  const device = db.devices.find(d => d.deviceToken === deviceToken);
  if (!device) {
    return res.status(404).json({
      status: false,
      error: 'DEVICE_DISCONNECTED',
      message: 'Device has been disconnected or removed from dashboard'
    });
  }

  device.isOnline = true;
  if (batteryLevel !== undefined) device.batteryLevel = batteryLevel;
  device.lastHeartbeatAt = new Date().toISOString();
  db.save();

  const devStatus = device.status || 'ACTIVE';
  return res.json({
    status: true,
    deviceStatus: devStatus,
    isPaused: devStatus === 'PAUSED',
    message: devStatus === 'PAUSED' ? 'Heartbeat acknowledged (GATEWAY PAUSED)' : 'Heartbeat acknowledged'
  });
});

  // Ingest Incoming SMS from Mobile App
router.post('/sms-ingest', async (req: Request, res: Response) => {
  const { deviceToken, sender, message, timestamp } = req.body;

  if (!sender || !message) {
    return res.status(400).json({ status: false, error: 'sender and message are required' });
  }

  let device = db.devices.find(d => d.deviceToken === deviceToken);
  if (device && device.status === 'PAUSED') {
    return res.json({
      status: false,
      error: 'DEVICE_PAUSED',
      message: 'SMS ingestion is suspended while gateway device is paused'
    });
  }
  if (!device) {
    // Zero-drop auto-registration: fallback to first tenant or auto-create device
    const fallbackTenantId = db.tenants[0]?.id || 'tenant_default';
    device = {
      id: `dev_${uuidv4().slice(0, 8)}`,
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
    db.devices.push(device);
    db.save();
  }

  device.isOnline = true;
  device.lastHeartbeatAt = new Date().toISOString();
  device.smsCapturedCount = (device.smsCapturedCount || 0) + 1;

  // Process via Detection Engine
  const result = await DetectionEngine.processIncomingSms(
    device.id,
    device.tenantId,
    sender,
    message
  );

  return res.json({
    status: true,
    matched: result.matched,
    orderId: result.orderId || null,
    message: result.matched ? `Payment matched with Order ${result.orderId}!` : 'SMS received and logged'
  });
});

// Ingest Incoming Push Notification from Companion App (GPay, PhonePe, Paytm, BharatPe, etc.)
router.post('/notification-ingest', async (req: Request, res: Response) => {
  const { deviceToken, packageName, title, message } = req.body;

  if (!title) {
    return res.status(400).json({ status: false, error: 'title is required' });
  }

  let device = db.devices.find(d => d.deviceToken === deviceToken);
  if (device && device.status === 'PAUSED') {
    return res.json({
      status: false,
      error: 'DEVICE_PAUSED',
      message: 'Notification ingestion is suspended while gateway device is paused'
    });
  }
  if (!device) {
    // Zero-drop auto-registration: fallback to first tenant or auto-create device
    const fallbackTenantId = db.tenants[0]?.id || 'tenant_default';
    device = {
      id: `dev_${uuidv4().slice(0, 8)}`,
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
    db.devices.push(device);
    db.save();
  }

  device.isOnline = true;
  device.lastHeartbeatAt = new Date().toISOString();
  device.smsCapturedCount = (device.smsCapturedCount || 0) + 1;

  // Process via Detection Engine
  const result = await DetectionEngine.processIncomingNotification(
    device.id,
    device.tenantId,
    packageName || 'com.google.android.apps.nbu.paisa.user',
    title,
    message || ''
  );

  return res.json({
    status: true,
    matched: result.matched,
    orderId: result.orderId || null,
    message: result.message
  });
});

// Companion App: Fetch Orders for Connected Tenant (with tabs & pagination)
router.get('/orders', async (req: Request, res: Response) => {
  const token = ((req.query.deviceToken as string) || (req.headers['x-device-token'] as string) || '').trim();
  if (!token) {
    return res.status(400).json({ status: false, error: 'deviceToken is required' });
  }

  const device = db.devices.find(d => 
    d.deviceToken === token || 
    (d.pairingCode && d.pairingCode.toUpperCase() === token.toUpperCase())
  );

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

  let allTenantOrders = db.orders.filter(o => o.tenantId === tenantId);
  allTenantOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const counts = {
    all: allTenantOrders.length,
    verified: allTenantOrders.filter(o => o.status === 'TXN_SUCCESS').length,
    pending: allTenantOrders.filter(o => o.status === 'PENDING').length,
    rejected: allTenantOrders.filter(o => o.status === 'FAILED' || o.status === 'CANCELLED' || o.status === 'EXPIRED').length,
  };

  let filtered = allTenantOrders;
  if (status && status !== 'ALL') {
    const s = (status as string).toUpperCase();
    if (s === 'VERIFIED' || s === 'TXN_SUCCESS') {
      filtered = filtered.filter(o => o.status === 'TXN_SUCCESS');
    } else if (s === 'PENDING') {
      filtered = filtered.filter(o => o.status === 'PENDING');
    } else if (s === 'REJECTED' || s === 'CANCELLED' || s === 'FAILED') {
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
router.post('/orders/:id/settle', async (req: Request, res: Response) => {
  const { deviceToken, utr } = req.body;
  const { id } = req.params;

  if (!deviceToken) {
    return res.status(400).json({ status: false, error: 'deviceToken is required' });
  }

  const device = db.devices.find(d => 
    d.deviceToken === deviceToken || 
    (d.pairingCode && d.pairingCode.toUpperCase() === deviceToken.toUpperCase())
  );

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

  const order = db.orders.find(o => 
    (o.id === id || o.orderId === id) && o.tenantId === device.tenantId
  );

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
  db.save();

  // Check and activate plan if this was a subscription order
  PlanService.activatePurchasedPlanIfSettled(order);

  // Dispatch Webhook to merchant callback
  try {
    await WebhookService.dispatchOrderCallback(order);
  } catch (err) {
    console.error('Webhook dispatch error:', err);
  }

  return res.json({ 
    status: true, 
    message: `Order ${order.orderId} successfully marked as SETTLED / VERIFIED`, 
    data: order 
  });
});

// Companion App: Manually Cancel Order
router.post('/orders/:id/cancel', async (req: Request, res: Response) => {
  const { deviceToken } = req.body;
  const { id } = req.params;

  if (!deviceToken) {
    return res.status(400).json({ status: false, error: 'deviceToken is required' });
  }

  const device = db.devices.find(d => 
    d.deviceToken === deviceToken || 
    (d.pairingCode && d.pairingCode.toUpperCase() === deviceToken.toUpperCase())
  );

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

  const order = db.orders.find(o => 
    (o.id === id || o.orderId === id) && o.tenantId === device.tenantId
  );

  if (!order) {
    return res.status(404).json({ status: false, error: 'Order not found for this merchant' });
  }

  order.status = 'CANCELLED';
  order.updatedAt = new Date().toISOString();
  db.save();

  return res.json({ 
    status: true, 
    message: `Order ${order.orderId} marked as CANCELLED`, 
    data: order 
  });
});

export default router;
