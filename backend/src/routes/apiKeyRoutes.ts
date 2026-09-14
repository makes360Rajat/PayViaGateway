import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiKey, ApiKeyScope, PaymentProviderType } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// List API Keys
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const keys = db.apiKeys.filter(k => k.tenantId === tenantId);
  return res.json({ status: true, data: keys });
});

// Create new API Key
router.post('/create', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const tenant = req.tenant!;
    const plan = db.plans.find(p => p.id === tenant.planId) || db.plans[0];
    const currentKeysCount = db.apiKeys.filter(k => k.tenantId === tenantId).length;

    if (currentKeysCount >= plan.maxApiKeys) {
      return res.status(403).json({
        status: false,
        error: `Your current plan limit is ${plan.maxApiKeys} API keys. Upgrade your plan to create more.`
      });
    }

    const {
      name,
      scope,
      providerFilter,
      merchantAccountId,
      pinnedTemplate,
      webhookUrl,
      ipWhitelist
    } = req.body;

    if (!name) {
      return res.status(400).json({ status: false, error: 'API key name is required' });
    }

    const rawApiKey = `pv_live_${uuidv4().replace(/-/g, '')}`;
    const salt = bcrypt.genSaltSync(10);
    const keyHash = bcrypt.hashSync(rawApiKey, salt);
    const webhookSecret = `whsec_${uuidv4().replace(/-/g, '')}`;

    const newKey: ApiKey = {
      id: `key_${uuidv4().slice(0, 8)}`,
      tenantId,
      name,
      keyPrefix: rawApiKey.slice(0, 12),
      rawKey: rawApiKey,
      keyHash,
      scope: (scope as ApiKeyScope) || 'ALL',
      providerFilter: providerFilter as PaymentProviderType,
      merchantAccountId,
      pinnedTemplate: pinnedTemplate || undefined,
      webhookUrl,
      webhookSecret,
      ipWhitelist: ipWhitelist || [],
      isActive: true,
      createdAt: new Date().toISOString()
    };

    db.apiKeys.push(newKey);
    db.save();

    return res.status(201).json({
      status: true,
      message: 'API key created successfully',
      data: newKey,
      rawKey: rawApiKey // Only returned on creation
    });
  } catch (e: any) {
    return res.status(500).json({ status: false, error: e.message });
  }
});

// Update API Key settings
router.put('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { id } = req.params;
  const key = db.apiKeys.find(k => k.id === id && k.tenantId === tenantId);

  if (!key) {
    return res.status(404).json({ status: false, error: 'API key not found' });
  }

  const { name, scope, providerFilter, merchantAccountId, pinnedTemplate, webhookUrl, ipWhitelist, isActive } = req.body;

  if (name !== undefined) key.name = name;
  if (scope !== undefined) key.scope = scope;
  if (providerFilter !== undefined) key.providerFilter = providerFilter;
  if (merchantAccountId !== undefined) key.merchantAccountId = merchantAccountId;
  if (pinnedTemplate !== undefined) key.pinnedTemplate = pinnedTemplate;
  if (webhookUrl !== undefined) key.webhookUrl = webhookUrl;
  if (ipWhitelist !== undefined) key.ipWhitelist = ipWhitelist;
  if (isActive !== undefined) key.isActive = isActive;

  db.save();

  return res.json({ status: true, message: 'API key updated', data: key });
});

// Rotate API Key
router.post('/:id/rotate', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { id } = req.params;
  const key = db.apiKeys.find(k => k.id === id && k.tenantId === tenantId);

  if (!key) {
    return res.status(404).json({ status: false, error: 'API key not found' });
  }

  const rawApiKey = `pv_live_${uuidv4().replace(/-/g, '')}`;
  const salt = bcrypt.genSaltSync(10);
  key.rawKey = rawApiKey;
  key.keyPrefix = rawApiKey.slice(0, 12);
  key.keyHash = bcrypt.hashSync(rawApiKey, salt);
  db.save();

  return res.json({
    status: true,
    message: 'API key rotated successfully. Update your integration with the new key.',
    rawKey: rawApiKey
  });
});

// Delete API Key
router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { id } = req.params;
  const index = db.apiKeys.findIndex(k => k.id === id && k.tenantId === tenantId);

  if (index === -1) {
    return res.status(404).json({ status: false, error: 'API key not found' });
  }

  db.apiKeys.splice(index, 1);
  db.save();

  return res.json({ status: true, message: 'API key deleted' });
});

export default router;
