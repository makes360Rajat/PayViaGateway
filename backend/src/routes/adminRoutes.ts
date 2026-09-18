import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { Plan, MerchantAccount, PaymentProviderType } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Apply Super Admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// The receiving account for subscription payments.  This is deliberately a
// platform-owned setting rather than a merchant fallback, so every plan QR
// points to the Super Admin's configured VPA.
router.get('/billing-account', (_req: AuthenticatedRequest, res: Response) => {
  const admin = db.tenants.find(t => t.role === 'SUPER_ADMIN');
  if (!admin) return res.status(404).json({ status: false, error: 'Super Admin account not found' });
  const accounts = db.merchants.filter(m => m.tenantId === admin.id && m.status === 'ACTIVE');
  const account = accounts.find(m => m.credentials?.isPlatformBilling === true) || accounts[0] || null;
  return res.json({ status: true, data: account });
});

router.put('/billing-account', (req: AuthenticatedRequest, res: Response) => {
  const { upiId, displayName, label, provider = 'CUSTOM_UPI' } = req.body;
  const cleanUpiId = String(upiId || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,256}@[a-z0-9._-]{2,256}$/i.test(cleanUpiId)) {
    return res.status(400).json({ status: false, error: 'Enter a valid UPI ID, for example business@bank' });
  }

  const admin = db.tenants.find(t => t.role === 'SUPER_ADMIN');
  if (!admin) return res.status(404).json({ status: false, error: 'Super Admin account not found' });
  const now = new Date().toISOString();
  const adminAccounts = db.merchants.filter(m => m.tenantId === admin.id);
  let account = adminAccounts.find(m => m.credentials?.isPlatformBilling === true) || adminAccounts[0];

  // Only one platform collection account can be active at a time.
  adminAccounts.forEach(m => { m.credentials = { ...m.credentials, isPlatformBilling: false }; });
  if (!account) {
    account = {
      id: `m_platform_${uuidv4().slice(0, 8)}`,
      tenantId: admin.id,
      provider: provider as PaymentProviderType,
      label: String(label || 'Platform subscription collection'),
      upiId: cleanUpiId,
      displayName: String(displayName || admin.businessName || 'PayVia Platform'),
      weight: 1,
      status: 'ACTIVE',
      intentEnabled: true,
      credentials: { isPlatformBilling: true },
      smsCount: 0,
      createdAt: now,
      updatedAt: now
    } as MerchantAccount;
    db.merchants.push(account);
  } else {
    account.upiId = cleanUpiId;
    account.displayName = String(displayName || account.displayName || 'PayVia Platform');
    account.label = String(label || account.label || 'Platform subscription collection');
    account.provider = provider as PaymentProviderType;
    account.status = 'ACTIVE';
    account.intentEnabled = true;
    account.credentials = { ...account.credentials, isPlatformBilling: true };
    account.updatedAt = now;
  }
  db.save();
  return res.json({ status: true, message: 'Platform subscription receiving UPI account saved', data: account });
});

// Platform Overview Metrics
router.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  const totalTenants = db.tenants.length;
  const activeTenants = db.tenants.filter(t => t.isActive).length;
  const totalMerchants = db.merchants.length;
  const activeMerchants = db.merchants.filter(m => m.status === 'ACTIVE').length;

  const today = new Date().toISOString().slice(0, 10);
  const totalOrders = db.orders.length;
  const todayOrders = db.orders.filter(o => o.createdAt.startsWith(today));

  const totalVolume = db.orders
    .filter(o => o.status === 'TXN_SUCCESS')
    .reduce((sum, o) => sum + o.amount, 0);

  const todayVolume = todayOrders
    .filter(o => o.status === 'TXN_SUCCESS')
    .reduce((sum, o) => sum + o.amount, 0);

  const successfulOrdersCount = db.orders.filter(o => o.status === 'TXN_SUCCESS').length;
  const successRate = totalOrders > 0 ? ((successfulOrdersCount / totalOrders) * 100).toFixed(1) : '100.0';

  return res.json({
    status: true,
    data: {
      totalTenants,
      activeTenants,
      totalMerchants,
      activeMerchants,
      totalOrders,
      todayOrdersCount: todayOrders.length,
      totalVolume,
      todayVolume,
      successRate: parseFloat(successRate),
      activeDevices: db.devices.filter(d => d.isOnline).length
    }
  });
});

// List all tenants / merchants
router.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const usersWithStats = db.tenants.map(t => {
    const plan = db.plans.find(p => p.id === t.planId);
    const merchantAccountsCount = db.merchants.filter(m => m.tenantId === t.id).length;
    const ordersCount = db.orders.filter(o => o.tenantId === t.id).length;
    const totalVolume = db.orders
      .filter(o => o.tenantId === t.id && o.status === 'TXN_SUCCESS')
      .reduce((sum, o) => sum + o.amount, 0);

    return {
      id: t.id,
      name: t.name,
      email: t.email,
      role: t.role,
      businessName: t.businessName,
      phone: t.phone,
      plan: plan?.name || 'Free',
      isActive: t.isActive,
      merchantAccountsCount,
      ordersCount,
      totalVolume,
      createdAt: t.createdAt
    };
  });

  return res.json({ status: true, data: usersWithStats });
});

// Update account controls. Subscription plans are changed exclusively by the
// verified plan-payment flow; an admin dashboard request cannot grant a plan.
router.put('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { planId, isActive, role } = req.body;

  const tenant = db.findTenantById(id);
  if (!tenant) {
    return res.status(404).json({ status: false, error: 'User not found' });
  }

  if (planId !== undefined) {
    return res.status(403).json({ status: false, error: 'Plans cannot be assigned manually. A verified subscription payment is required.' });
  }
  if (isActive !== undefined) tenant.isActive = isActive;
  if (role) tenant.role = role;

  tenant.updatedAt = new Date().toISOString();
  db.save();

  return res.json({ status: true, message: 'User updated successfully', data: tenant });
});

// Global Orders Firehose (cross-tenant)
router.get('/orders', (req: AuthenticatedRequest, res: Response) => {
  const { search, status, provider, limit = 100 } = req.query;

  let orders = [...db.orders];

  if (status && status !== 'ALL') {
    orders = orders.filter(o => o.status === status);
  }

  if (provider && provider !== 'ALL') {
    orders = orders.filter(o => o.provider === provider);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    orders = orders.filter(o =>
      o.orderId.toLowerCase().includes(q) ||
      (o.utr && o.utr.toLowerCase().includes(q)) ||
      (o.customerMobile && o.customerMobile.includes(q))
    );
  }

  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({
    status: true,
    total: orders.length,
    data: orders.slice(0, Number(limit))
  });
});

// Dynamic Plan Management (CRUD)
router.post('/plans/create', (req: AuthenticatedRequest, res: Response) => {
  const { name, price, validityDays, maxMerchantAccounts, maxOrdersPerDay, maxApiKeys, features } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ status: false, error: 'Name and price are required' });
  }

  const newPlan: Plan = {
    id: `plan_${uuidv4().slice(0, 8)}`,
    name,
    price: Number(price),
    validityDays: Number(validityDays || 30),
    maxMerchantAccounts: Number(maxMerchantAccounts || 5),
    maxOrdersPerDay: Number(maxOrdersPerDay || 500),
    maxApiKeys: Number(maxApiKeys || 3),
    features: features || {
      webhooks: true,
      smsGateway: true,
      crypto: false,
      prioritySupport: false,
      customBranding: false
    },
    isActive: true
  };

  db.plans.push(newPlan);
  db.save();

  return res.status(201).json({ status: true, message: 'Plan created', data: newPlan });
});

router.put('/plans/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const plan = db.plans.find(p => p.id === id);

  if (!plan) {
    return res.status(404).json({ status: false, error: 'Plan not found' });
  }

  const { name, price, validityDays, maxMerchantAccounts, maxOrdersPerDay, maxApiKeys, features, isActive } = req.body;

  if (name !== undefined) plan.name = name;
  if (price !== undefined) plan.price = Number(price);
  if (validityDays !== undefined) plan.validityDays = Number(validityDays);
  if (maxMerchantAccounts !== undefined) plan.maxMerchantAccounts = Number(maxMerchantAccounts);
  if (maxOrdersPerDay !== undefined) plan.maxOrdersPerDay = Number(maxOrdersPerDay);
  if (maxApiKeys !== undefined) plan.maxApiKeys = Number(maxApiKeys);
  if (features !== undefined) plan.features = { ...plan.features, ...features };
  if (isActive !== undefined) plan.isActive = isActive;

  db.save();

  return res.json({ status: true, message: 'Plan updated', data: plan });
});

export default router;
