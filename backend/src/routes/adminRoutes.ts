import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { Plan } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Apply Super Admin middleware to all routes
router.use(authenticateToken, requireAdmin);

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

// Update user status or assign plan manually
router.put('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { planId, isActive, role } = req.body;

  const tenant = db.findTenantById(id);
  if (!tenant) {
    return res.status(404).json({ status: false, error: 'User not found' });
  }

  if (planId) tenant.planId = planId;
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
