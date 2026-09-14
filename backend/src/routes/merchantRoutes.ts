import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { MerchantAccount, PaymentProviderType } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// List all merchant accounts for tenant
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const accounts = db.merchants.filter(m => m.tenantId === tenantId);
  return res.json({ status: true, data: accounts });
});

// Create new merchant account
router.post('/create', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const tenant = req.tenant!;
    const plan = db.plans.find(p => p.id === tenant.planId) || db.plans[0];
    const currentAccountsCount = db.merchants.filter(m => m.tenantId === tenantId).length;

    if (currentAccountsCount >= plan.maxMerchantAccounts) {
      return res.status(403).json({
        status: false,
        error: `Your current plan limit is ${plan.maxMerchantAccounts} merchant accounts. Upgrade your plan to add more.`
      });
    }

    const {
      provider,
      label,
      upiId,
      displayName,
      weight,
      intentEnabled,
      credentials
    } = req.body;

    if (!provider || !label) {
      return res.status(400).json({ status: false, error: 'Provider and account label are required' });
    }

    const newAccount: MerchantAccount = {
      id: `m_${uuidv4().slice(0, 8)}`,
      tenantId,
      provider: provider as PaymentProviderType,
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

    db.merchants.push(newAccount);
    db.save();

    return res.status(201).json({ status: true, message: 'Merchant account connected successfully', data: newAccount });
  } catch (e: any) {
    return res.status(500).json({ status: false, error: e.message });
  }
});

// Update merchant account
router.put('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { id } = req.params;
  const account = db.merchants.find(m => m.id === id && m.tenantId === tenantId);

  if (!account) {
    return res.status(404).json({ status: false, error: 'Merchant account not found' });
  }

  const { label, upiId, displayName, weight, status, intentEnabled, credentials, gmailConnected, gmailEmail } = req.body;

  if (label !== undefined) account.label = label;
  if (upiId !== undefined) account.upiId = upiId;
  if (displayName !== undefined) account.displayName = displayName;
  if (weight !== undefined) account.weight = weight;
  if (status !== undefined) account.status = status;
  if (intentEnabled !== undefined) account.intentEnabled = intentEnabled;
  if (credentials !== undefined) account.credentials = { ...account.credentials, ...credentials };
  if (gmailConnected !== undefined) account.gmailConnected = gmailConnected;
  if (gmailEmail !== undefined) account.gmailEmail = gmailEmail;

  account.updatedAt = new Date().toISOString();
  db.save();

  return res.json({ status: true, message: 'Merchant account updated successfully', data: account });
});

// Toggle status (Active / Paused)
router.post('/:id/toggle', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { id } = req.params;
  const account = db.merchants.find(m => m.id === id && m.tenantId === tenantId);

  if (!account) {
    return res.status(404).json({ status: false, error: 'Merchant account not found' });
  }

  account.status = account.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
  account.updatedAt = new Date().toISOString();
  db.save();

  return res.json({ status: true, message: `Account is now ${account.status.toLowerCase()}`, data: account });
});

// Delete merchant account
router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { id } = req.params;
  const index = db.merchants.findIndex(m => m.id === id && m.tenantId === tenantId);

  if (index === -1) {
    return res.status(404).json({ status: false, error: 'Merchant account not found' });
  }

  db.merchants.splice(index, 1);
  db.save();

  return res.json({ status: true, message: 'Merchant account disconnected' });
});

// Trigger OTP for BharatPe / Freecharge
router.post('/:id/otp-send', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { id } = req.params;
  const { mobile } = req.body;
  const account = db.merchants.find(m => m.id === id && m.tenantId === tenantId);

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
router.post('/:id/otp-verify', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { id } = req.params;
  const { otp, mobile } = req.body;
  const account = db.merchants.find(m => m.id === id && m.tenantId === tenantId);

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
    sessionToken: `session_tok_${uuidv4().replace(/-/g, '')}`,
    syncedAt: new Date().toISOString()
  };
  account.status = 'ACTIVE';
  account.updatedAt = new Date().toISOString();
  db.save();

  return res.json({
    status: true,
    message: 'Account successfully authenticated and synced with provider!',
    data: account
  });
});

export default router;
