import { db } from '../db/database';
import { PlanEntitlements, PlanUsage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PlanService {
  public static logAccess(tenantId: string, action: string, endpoint: string, result: 'SUCCESS' | 'BLOCKED', reason?: string) {
    console.log(`[PLAN_AUDIT] Tenant: ${tenantId} | Action: ${action} | Endpoint: ${endpoint} | Result: ${result} | Reason: ${reason || 'N/A'}`);
  }

  public static getSubscription(tenantId: string) {
    const subs = db.subscriptions
      .filter(s => s.tenantId === tenantId)
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    return subs[0] || null;
  }

  public static isPlanActive(tenantId: string): boolean {
    const tenant = db.findTenantById(tenantId);
    if (tenant?.role === 'SUPER_ADMIN') return true;

    const sub = this.getSubscription(tenantId);
    if (!sub) return false;
    if (sub.status !== 'ACTIVE') return false;

    if (sub.expiresAt) {
      const exp = new Date(sub.expiresAt).getTime();
      if (!isNaN(exp) && exp < Date.now()) {
        return false;
      }
    }
    return true;
  }

  public static getTestUsage(tenantId: string): { used: number; limit: number; remaining: number } {
    let usage = db.planUsage.find(u => u.tenantId === tenantId);
    if (!usage) {
      usage = {
        id: `pusg_${uuidv4().slice(0, 8)}`,
        tenantId,
        testOrdersUsed: 0,
        testOrdersLimit: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.planUsage.push(usage);
    }
    const used = usage.testOrdersUsed || 0;
    const limit = usage.testOrdersLimit || 5;
    return {
      used,
      limit,
      remaining: Math.max(0, limit - used)
    };
  }

  public static getEntitlements(tenantId: string): PlanEntitlements {
    const isActive = this.isPlanActive(tenantId);
    const usage = this.getTestUsage(tenantId);
    const sub = this.getSubscription(tenantId);

    let status = isActive ? 'ACTIVE' : (sub?.status || 'FREE_TEST');
    if (!isActive && (status === 'ACTIVE' || !status)) {
      status = 'FREE_TEST';
    }

    return {
      status,
      isPlanActive: isActive,
      isFreeTesting: !isActive,
      testOrdersUsed: usage.used,
      testOrdersMax: usage.limit,
      testOrdersRemaining: usage.remaining,
      canConnectMerchant: isActive,
      canReceiveLivePayments: isActive,
      canCreateTestOrders: isActive || (usage.remaining > 0)
    };
  }

  public static consumeTestOrderQuota(tenantId: string): boolean {
    let usage = db.planUsage.find(u => u.tenantId === tenantId);
    if (!usage) {
      usage = {
        id: `pusg_${uuidv4().slice(0, 8)}`,
        tenantId,
        testOrdersUsed: 0,
        testOrdersLimit: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.planUsage.push(usage);
    }

    if (usage.testOrdersUsed >= usage.testOrdersLimit) {
      return false;
    }

    usage.testOrdersUsed += 1;
    usage.updatedAt = new Date().toISOString();
    return true;
  }
}
