"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanService = void 0;
const database_1 = require("../db/database");
const uuid_1 = require("uuid");
class PlanService {
    static logAccess(tenantId, action, endpoint, result, reason) {
        console.log(`[PLAN_AUDIT] Tenant: ${tenantId} | Action: ${action} | Endpoint: ${endpoint} | Result: ${result} | Reason: ${reason || 'N/A'}`);
    }
    static getSubscription(tenantId) {
        const subs = database_1.db.subscriptions
            .filter(s => s.tenantId === tenantId)
            .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
        return subs[0] || null;
    }
    static isPlanActive(tenantId) {
        const tenant = database_1.db.findTenantById(tenantId);
        if (tenant?.role === 'SUPER_ADMIN')
            return true;
        const sub = this.getSubscription(tenantId);
        if (!sub)
            return false;
        if (sub.status !== 'ACTIVE')
            return false;
        if (sub.expiresAt) {
            const exp = new Date(sub.expiresAt).getTime();
            if (!isNaN(exp) && exp < Date.now()) {
                return false;
            }
        }
        return true;
    }
    static getTestUsage(tenantId) {
        let usage = database_1.db.planUsage.find(u => u.tenantId === tenantId);
        if (!usage) {
            usage = {
                id: `pusg_${(0, uuid_1.v4)().slice(0, 8)}`,
                tenantId,
                testOrdersUsed: 0,
                testOrdersLimit: 5,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            database_1.db.planUsage.push(usage);
        }
        const used = usage.testOrdersUsed || 0;
        const limit = usage.testOrdersLimit || 5;
        return {
            used,
            limit,
            remaining: Math.max(0, limit - used)
        };
    }
    static getEntitlements(tenantId) {
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
    static consumeTestOrderQuota(tenantId) {
        let usage = database_1.db.planUsage.find(u => u.tenantId === tenantId);
        if (!usage) {
            usage = {
                id: `pusg_${(0, uuid_1.v4)().slice(0, 8)}`,
                tenantId,
                testOrdersUsed: 0,
                testOrdersLimit: 5,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            database_1.db.planUsage.push(usage);
        }
        if (usage.testOrdersUsed >= usage.testOrdersLimit) {
            return false;
        }
        usage.testOrdersUsed += 1;
        usage.updatedAt = new Date().toISOString();
        return true;
    }
}
exports.PlanService = PlanService;
