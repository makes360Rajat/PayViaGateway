"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterEngine = void 0;
const database_1 = require("../db/database");
class RouterEngine {
    static selectMerchantAccount(tenantId, apiKey) {
        let candidateAccounts = database_1.db.merchants.filter(m => m.tenantId === tenantId && m.status === 'ACTIVE');
        if (candidateAccounts.length === 0) {
            throw new Error('No active merchant accounts connected. Please connect or resume an account in your dashboard.');
        }
        // 1. Account-scoped key
        if (apiKey && apiKey.scope === 'ACCOUNT' && apiKey.merchantAccountId) {
            const fixedAccount = candidateAccounts.find(m => m.id === apiKey.merchantAccountId);
            if (fixedAccount) {
                return fixedAccount;
            }
            throw new Error(`The specific merchant account pinned to this API key is inactive or deleted.`);
        }
        // 2. Provider-scoped key
        if (apiKey && apiKey.scope === 'PROVIDER' && apiKey.providerFilter) {
            candidateAccounts = candidateAccounts.filter(m => m.provider === apiKey.providerFilter);
            if (candidateAccounts.length === 0) {
                throw new Error(`No active merchant accounts found for provider: ${apiKey.providerFilter}`);
            }
        }
        // 3. FamPay specific rule: must have Gmail connected
        const validCandidates = candidateAccounts.filter(m => {
            if (m.provider === 'FAMPAY' && !m.gmailConnected) {
                return false;
            }
            return true;
        });
        if (validCandidates.length === 0) {
            throw new Error('All matching merchant accounts are paused or require setup.');
        }
        // 4. Weighted Random Selection
        return this.pickWeightedAccount(validCandidates);
    }
    static pickWeightedAccount(accounts) {
        if (accounts.length === 1)
            return accounts[0];
        const totalWeight = accounts.reduce((sum, acc) => sum + Math.max(1, acc.weight || 1), 0);
        let randomVal = Math.random() * totalWeight;
        for (const account of accounts) {
            const weight = Math.max(1, account.weight || 1);
            if (randomVal < weight) {
                account.lastUsedAt = new Date().toISOString();
                database_1.db.save();
                return account;
            }
            randomVal -= weight;
        }
        const fallback = accounts[0];
        fallback.lastUsedAt = new Date().toISOString();
        database_1.db.save();
        return fallback;
    }
    static resolveTemplate(tenantId, apiKey) {
        // 1. Check if pinned on API key
        if (apiKey && apiKey.pinnedTemplate) {
            if (apiKey.pinnedTemplate !== 'random' && apiKey.pinnedTemplate !== 'rotate') {
                return apiKey.pinnedTemplate;
            }
        }
        // 2. Tenant settings
        const settings = database_1.db.templateSettings.find(s => s.tenantId === tenantId) || {
            tenantId,
            templateMode: 'rotate',
            defaultTemplate: 'template_1',
            enabledTemplates: [
                'template_1', 'template_2', 'template_3', 'template_4', 'template_5',
                'template_6', 'template_7', 'template_8', 'template_9', 'template_10'
            ]
        };
        const enabled = settings.enabledTemplates && settings.enabledTemplates.length > 0
            ? settings.enabledTemplates
            : ['template_1', 'template_2', 'template_3', 'template_4'];
        if (settings.templateMode === 'fixed') {
            return settings.defaultTemplate || 'template_1';
        }
        if (settings.templateMode === 'random' || (apiKey && apiKey.pinnedTemplate === 'random')) {
            const randomIndex = Math.floor(Math.random() * enabled.length);
            return enabled[randomIndex];
        }
        // Auto rotate mode: pick next based on order count
        const tenantOrdersCount = database_1.db.orders.filter(o => o.tenantId === tenantId).length;
        const rotateIndex = tenantOrdersCount % enabled.length;
        return enabled[rotateIndex];
    }
}
exports.RouterEngine = RouterEngine;
