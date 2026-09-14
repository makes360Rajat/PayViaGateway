import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { DetectionEngine } from '../services/detectionEngine';
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
    lastHeartbeatAt: new Date().toISOString(),
    smsCapturedCount: 0,
    createdAt: new Date().toISOString()
  };

  db.devices.push(pendingDevice);
  db.save();

  return res.json({
    status: true,
    data: {
      pairingCode,
      deviceToken,
      qrData: JSON.stringify({
        serverUrl: process.env.BASE_URL || 'http://localhost:5000',
        deviceToken,
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

// === MOBILE APP COMPANION ENDPOINTS (Authenticated via deviceToken) ===

// Device Complete Pairing from Mobile App
router.post('/pair', async (req: Request, res: Response) => {
  const { deviceToken, deviceName, simSlots, batteryLevel } = req.body;

  if (!deviceToken) {
    return res.status(400).json({ status: false, error: 'Device token is required' });
  }

  const device = db.devices.find(d => d.deviceToken === deviceToken);
  if (!device) {
    return res.status(404).json({ status: false, error: 'Invalid or expired pairing token' });
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
    return res.status(404).json({ status: false, error: 'Device not recognized' });
  }

  device.isOnline = true;
  if (batteryLevel !== undefined) device.batteryLevel = batteryLevel;
  device.lastHeartbeatAt = new Date().toISOString();
  db.save();

  return res.json({ status: true, message: 'Heartbeat acknowledged' });
});

// Ingest Incoming SMS from Mobile App
router.post('/sms-ingest', async (req: Request, res: Response) => {
  const { deviceToken, sender, message, timestamp } = req.body;

  if (!deviceToken || !sender || !message) {
    return res.status(400).json({ status: false, error: 'deviceToken, sender and message are required' });
  }

  const device = db.devices.find(d => d.deviceToken === deviceToken);
  if (!device) {
    return res.status(401).json({ status: false, error: 'Unauthorized device token' });
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

export default router;
