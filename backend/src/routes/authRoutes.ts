import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';
import { JWT_SECRET, authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { Tenant, TenantSubscription } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Register new merchant account
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, businessName, phone } = req.body;

    if (!email || !password || !businessName) {
      return res.status(400).json({ status: false, error: 'Email, password, and business name are required' });
    }

    const existing = db.findTenantByEmail(email);
    if (existing) {
      return res.status(409).json({ status: false, error: 'An account with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newTenant: Tenant = {
      id: `tenant_${uuidv4().slice(0, 8)}`,
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

    const newSubscription: TenantSubscription = {
      id: `sub_${uuidv4().slice(0, 8)}`,
      tenantId: newTenant.id,
      planId: 'plan_starter',
      status: 'ACTIVE',
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      ordersToday: 0,
      lastResetDate: new Date().toISOString().slice(0, 10)
    };

    // Auto-generate a primary API key
    const rawApiKey = `pv_live_${uuidv4().replace(/-/g, '')}`;
    const keyHash = bcrypt.hashSync(rawApiKey, salt);

    const defaultApiKey = {
      id: `key_${uuidv4().slice(0, 8)}`,
      tenantId: newTenant.id,
      name: 'Default API Key',
      keyPrefix: rawApiKey.slice(0, 12),
      rawKey: rawApiKey,
      keyHash,
      scope: 'ALL' as const,
      pinnedTemplate: 'template_1',
      webhookSecret: `whsec_${uuidv4().replace(/-/g, '')}`,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    // Template settings
    const defaultTemplateSettings = {
      tenantId: newTenant.id,
      templateMode: 'rotate' as const,
      defaultTemplate: 'template_1',
      enabledTemplates: [
        'template_1', 'template_2', 'template_3', 'template_4', 'template_5',
        'template_6', 'template_7', 'template_8', 'template_9', 'template_10'
      ],
      brandName: businessName,
      brandColor: '#6366f1'
    };

    db.tenants.push(newTenant);
    db.subscriptions.push(newSubscription);
    db.apiKeys.push(defaultApiKey);
    db.templateSettings.push(defaultTemplateSettings);
    db.save();

    const token = jwt.sign(
      { tenantId: newTenant.id, email: newTenant.email, role: newTenant.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

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
  } catch (e: any) {
    return res.status(500).json({ status: false, error: e.message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: false, error: 'Email and password are required' });
    }

    const tenant = db.findTenantByEmail(email);
    if (!tenant) {
      return res.status(401).json({ status: false, error: 'Invalid email or password' });
    }

    const isValid = bcrypt.compareSync(password, tenant.passwordHash);
    if (!isValid) {
      return res.status(401).json({ status: false, error: 'Invalid email or password' });
    }

    if (!tenant.isActive) {
      return res.status(403).json({ status: false, error: 'This account has been suspended or deactivated' });
    }

    const token = jwt.sign(
      { tenantId: tenant.id, email: tenant.email, role: tenant.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

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
  } catch (e: any) {
    return res.status(500).json({ status: false, error: e.message });
  }
});

// Current User Profile
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenant = req.tenant!;
  const plan = db.plans.find(p => p.id === tenant.planId) || db.plans[0];
  const subscription = db.subscriptions.find(s => s.tenantId === tenant.id);

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
      subscription
    }
  });
});

// Update Profile
router.put('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenant = req.tenant!;
  const { name, businessName, phone, currentPassword, newPassword } = req.body;

  if (name) tenant.name = name;
  if (businessName) tenant.businessName = businessName;
  if (phone) tenant.phone = phone;

  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, tenant.passwordHash)) {
      return res.status(400).json({ status: false, error: 'Current password is incorrect' });
    }
    const salt = bcrypt.genSaltSync(10);
    tenant.passwordHash = bcrypt.hashSync(newPassword, salt);
  }

  tenant.updatedAt = new Date().toISOString();
  db.save();

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

export default router;
