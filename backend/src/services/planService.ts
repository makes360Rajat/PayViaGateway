import { db } from '../db/database';
import { PlanEntitlements, PlanUsage, Tenant, Plan, MerchantAccount, Order } from '../types';
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

  public static getSuperAdmin(): Tenant | null {
    const admin = db.tenants.find(t => t.role === 'SUPER_ADMIN' || t.email.toLowerCase() === 'admin@payvia.vip');
    return admin || null;
  }

  public static getSuperAdminMerchant(): MerchantAccount | null {
    const admin = this.getSuperAdmin();
    if (!admin) return null;
    const mchs = db.merchants.filter(m => m.tenantId === admin.id && m.status === 'ACTIVE');
    // The Super Admin can explicitly mark the account used for subscription
    // collection.  Keep the first legacy admin account as a migration
    // fallback, but never route platform money to another tenant's account.
    return mchs.find(m => m.credentials?.isPlatformBilling === true) || mchs[0] || null;
  }

  public static createSubscriptionOrder(buyerTenant: Tenant, targetPlan: Plan, baseUrl?: string) {
    const admin = this.getSuperAdmin();
    if (!admin) {
      throw new Error("Super Admin platform configuration not found");
    }
    const mch = this.getSuperAdminMerchant();
    if (!mch) {
      throw new Error("No active Super Admin merchant account available to receive plan payment");
    }

    const orderId = `ord_sub_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
    const linkToken = uuidv4().replace(/-/g, '').slice(0, 16);
    const amount = Number(targetPlan.price);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    const customerName = buyerTenant.businessName || buyerTenant.name;
    const customerMobile = buyerTenant.phone || '';
    const remark1 = `PLAN_PURCHASE:${targetPlan.id}:${buyerTenant.id}`;

    const dynamicBase = baseUrl || 'https://payvia360.com';
    const paymentUrl = `${dynamicBase}/checkout/${linkToken}`;
    const upiId = mch.upiId || 'admin@payvia';
    const payeeName = mch.displayName || 'PayVia Official Platform';
    const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(orderId)}`;

    const newOrder: Order = {
      id: orderId,
      orderId,
      tenantId: admin.id,
      merchantAccountId: mch.id,
      merchantAccountLabel: mch.label,
      provider: mch.provider,
      amount,
      currency: 'INR',
      customerMobile,
      customerName,
      remark1,
      template: 'checkout_v2',
      linkToken,
      paymentUrl,
      status: 'PENDING',
      mode: 'LIVE',
      expiresAt,
      createdAt: now,
      updatedAt: now
    };

    db.orders.push(newOrder);
    db.save();

    this.logAccess(buyerTenant.id, 'PLAN_PURCHASE_ORDER_CREATED', '/api/plans/purchase', 'SUCCESS', `Order ${orderId} for plan ${targetPlan.name} created`);

    return {
      orderId,
      linkToken,
      amount,
      plan: targetPlan,
      merchant: mch,
      paymentUrl,
      upiIntentUrl,
      upiId,
      payeeName,
      expiresAt
    };
  }

  public static activatePurchasedPlanIfSettled(orderData: Order | string): boolean {
    let order: Order | undefined;
    if (typeof orderData === 'string') {
      order = db.findOrderByOrderId(orderData) || db.findOrderById(orderData);
    } else {
      order = orderData;
    }

    if (!order) return false;
    const remark = order.remark1 || '';
    if (!remark.startsWith('PLAN_PURCHASE:')) return false;
    if (order.status !== 'TXN_SUCCESS') return false;

    // A plan order may only be activated by a receipt captured from the
    // configured receiving account.  Dashboard/manual state changes are not
    // payment proof and must never grant a subscription.
    const verifiedBy = order.rawVerificationData?.matchedBy;
    const trustedReceiptSources = new Set([
      'SMS_GATEWAY',
      'APP_NOTIFICATION_LISTENER',
      'SMS_GATEWAY_CROSS_CHECK'
    ]);
    if (!trustedReceiptSources.has(verifiedBy)) {
      this.logAccess('unknown', 'PLAN_ACTIVATION_UNTRUSTED_RECEIPT', 'settle', 'BLOCKED', `Order ${order.orderId} source: ${verifiedBy || 'missing'}`);
      return false;
    }

    const parts = remark.split(':');
    if (parts.length < 3) return false;

    const planId = parts[1];
    const buyerTenantId = parts[2];

    const buyer = db.findTenantById(buyerTenantId);
    if (!buyer) return false;

    const targetPlan = db.plans.find(p => p.id === planId);
    if (!targetPlan) return false;

    const planPrice = Number(targetPlan.price);
    const paidAmount = Number(order.amount);

    if (paidAmount < (planPrice - 0.5)) {
      this.logAccess(buyerTenantId, 'PLAN_ACTIVATION_AMOUNT_MISMATCH', 'settle', 'BLOCKED', `Paid ${paidAmount} less than plan price ${planPrice}`);
      return false;
    }

    const now = new Date().toISOString();
    const validityDays = targetPlan.validityDays || 30;
    const expiresAt = new Date(Date.now() + validityDays * 24 * 3600 * 1000).toISOString();

    // 1. Update Tenant plan
    buyer.planId = targetPlan.id;
    buyer.updatedAt = now;

    // 2. Update / Insert Subscription
    let sub = db.subscriptions.find(s => s.tenantId === buyerTenantId);
    if (sub) {
      sub.planId = targetPlan.id;
      sub.status = 'ACTIVE';
      sub.startsAt = now;
      sub.expiresAt = expiresAt;
      sub.ordersToday = 0;
      sub.lastResetDate = new Date().toISOString().slice(0, 10);
    } else {
      sub = {
        id: `sub_${uuidv4().slice(0, 8)}`,
        tenantId: buyerTenantId,
        planId: targetPlan.id,
        status: 'ACTIVE',
        startsAt: now,
        expiresAt,
        ordersToday: 0,
        lastResetDate: new Date().toISOString().slice(0, 10)
      };
      db.subscriptions.push(sub);
    }

    // 3. Reset plan_usage test count so they start fresh in live mode
    let usage = db.planUsage.find(u => u.tenantId === buyerTenantId);
    if (usage) {
      usage.testOrdersUsed = 0;
      usage.updatedAt = now;
    }

    db.save();

    this.logAccess(buyerTenantId, 'PLAN_PURCHASE_ACTIVATED', 'settle', 'SUCCESS', `Activated ${targetPlan.name} plan via Order ${order.orderId}`);
    return true;
  }
}
