import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { TenantSubscription } from '../types';
import { v4 as uuidv4 } from 'uuid';

import { PlanService } from '../services/planService';

const router = Router();

// List all available plans
router.get('/', (req, res) => {
  const plans = db.plans.filter(p => p.isActive);
  return res.json({ status: true, data: plans });
});

// Get current subscription & usage stats
router.get('/current', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const tenant = req.tenant!;
  const plan = db.plans.find(p => p.id === tenant.planId) || db.plans[0];
  const subscription = db.subscriptions.find(s => s.tenantId === tenantId);

  const activeMerchantsCount = db.merchants.filter(m => m.tenantId === tenantId && m.status === 'ACTIVE').length;
  const totalApiKeysCount = db.apiKeys.filter(k => k.tenantId === tenantId).length;
  const today = new Date().toISOString().slice(0, 10);
  const ordersTodayCount = db.orders.filter(
    o => o.tenantId === tenantId && o.createdAt.startsWith(today)
  ).length;

  return res.json({
    status: true,
    data: {
      plan,
      subscription,
      entitlements: PlanService.getEntitlements(tenantId),
      testUsage: PlanService.getTestUsage(tenantId),
      usage: {
        merchantsUsed: activeMerchantsCount,
        merchantsMax: plan.maxMerchantAccounts,
        apiKeysUsed: totalApiKeysCount,
        apiKeysMax: plan.maxApiKeys,
        ordersToday: ordersTodayCount,
        ordersMax: plan.maxOrdersPerDay
      }
    }
  });
});

// Upgrade / Change Subscription Plan
router.post('/upgrade', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const tenant = req.tenant!;
  const { planId } = req.body;

  const targetPlan = db.plans.find(p => p.id === planId && p.isActive);
  if (!targetPlan) {
    return res.status(404).json({ status: false, error: 'Selected plan not found' });
  }

  tenant.planId = targetPlan.id;
  tenant.updatedAt = new Date().toISOString();

  let subscription = db.subscriptions.find(s => s.tenantId === tenantId);
  if (!subscription) {
    subscription = {
      id: `sub_${uuidv4().slice(0, 8)}`,
      tenantId,
      planId: targetPlan.id,
      status: 'ACTIVE',
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + targetPlan.validityDays * 24 * 3600 * 1000).toISOString(),
      ordersToday: 0,
      lastResetDate: new Date().toISOString().slice(0, 10)
    };
    db.subscriptions.push(subscription);
  } else {
    subscription.planId = targetPlan.id;
    subscription.status = 'ACTIVE';
    subscription.expiresAt = new Date(Date.now() + targetPlan.validityDays * 24 * 3600 * 1000).toISOString();
  }

  db.save();

  return res.json({
    status: true,
    message: `Successfully upgraded to ${targetPlan.name} plan!`,
    data: {
      plan: targetPlan,
      subscription
    }
  });
});

export default router;
