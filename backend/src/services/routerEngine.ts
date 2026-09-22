import { db } from '../db/database';
import { ApiKey, MerchantAccount, TenantTemplateSettings, AccountDailyStats } from '../types';

export interface RoutingResult {
  merchantAccount: MerchantAccount;
  resolvedTemplate: string;
}

export class RouterEngine {
  /**
   * Returns current calendar date in Indian Standard Time (UTC+5:30) as "YYYY-MM-DD"
   */
  public static getTodayISTDateString(date: Date = new Date()): string {
    const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return istTime.toISOString().slice(0, 10);
  }

  /**
   * Calculates live daily usage for a merchant account for the current IST day
   */
  public static getAccountDailyStats(account: MerchantAccount): AccountDailyStats {
    const todayIST = this.getTodayISTDateString();
    const limits = account.dailyLimits || account.credentials?.dailyLimits || {};

    const todayOrders = db.orders.filter(o => {
      if (o.merchantAccountId !== account.id) return false;
      if (o.status !== 'TXN_SUCCESS') return false;
      if (!o.createdAt) return false;
      try {
        const orderDateIST = this.getTodayISTDateString(new Date(o.createdAt));
        return orderDateIST === todayIST;
      } catch {
        return false;
      }
    });

    const usedAmount = todayOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const usedCount = todayOrders.length;

    let isExhausted = false;
    let exhaustedReason: string | undefined;

    if (limits.dailyAmountLimit && limits.dailyAmountLimit > 0 && usedAmount >= limits.dailyAmountLimit) {
      isExhausted = true;
      exhaustedReason = `Daily amount limit reached (₹${usedAmount.toLocaleString('en-IN')} / ₹${limits.dailyAmountLimit.toLocaleString('en-IN')})`;
    } else if (limits.dailyCountLimit && limits.dailyCountLimit > 0 && usedCount >= limits.dailyCountLimit) {
      isExhausted = true;
      exhaustedReason = `Daily transaction limit reached (${usedCount} / ${limits.dailyCountLimit} txns)`;
    }

    const remainingAmount = limits.dailyAmountLimit && limits.dailyAmountLimit > 0
      ? Math.max(0, limits.dailyAmountLimit - usedAmount)
      : undefined;

    const remainingCount = limits.dailyCountLimit && limits.dailyCountLimit > 0
      ? Math.max(0, limits.dailyCountLimit - usedCount)
      : undefined;

    return {
      usedAmount,
      usedCount,
      dailyAmountLimit: limits.dailyAmountLimit,
      dailyCountLimit: limits.dailyCountLimit,
      isExhausted,
      exhaustedReason,
      remainingAmount,
      remainingCount,
      dateIST: todayIST
    };
  }

  public static selectMerchantAccount(tenantId: string, amount: number = 0, apiKey?: ApiKey): MerchantAccount {
    let candidateAccounts = db.merchants.filter(
      m => m.tenantId === tenantId && m.status === 'ACTIVE'
    );

    if (candidateAccounts.length === 0) {
      throw new Error('No active merchant accounts connected. Please connect or resume an account in your dashboard.');
    }

    // 1. Account-scoped key
    if (apiKey && apiKey.scope === 'ACCOUNT' && apiKey.merchantAccountId) {
      const fixedAccount = candidateAccounts.find(m => m.id === apiKey.merchantAccountId);
      if (fixedAccount) {
        const stats = this.getAccountDailyStats(fixedAccount);
        const limits = fixedAccount.dailyLimits || fixedAccount.credentials?.dailyLimits || {};
        if (limits.dailyAmountLimit && limits.dailyAmountLimit > 0 && (stats.usedAmount + amount) > limits.dailyAmountLimit) {
          throw new Error(`The pinned merchant account ${fixedAccount.label} has reached its daily limit of ₹${limits.dailyAmountLimit.toLocaleString('en-IN')} (used: ₹${stats.usedAmount.toLocaleString('en-IN')}).`);
        }
        if (limits.dailyCountLimit && limits.dailyCountLimit > 0 && stats.usedCount >= limits.dailyCountLimit) {
          throw new Error(`The pinned merchant account ${fixedAccount.label} has reached its daily count limit of ${limits.dailyCountLimit} transactions.`);
        }
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
    let validCandidates = candidateAccounts.filter(m => {
      if (m.provider === 'FAMPAY' && !m.gmailConnected) {
        return false;
      }
      return true;
    });

    if (validCandidates.length === 0) {
      throw new Error('All matching merchant accounts are paused or require setup.');
    }

    // 4. Filter candidates based on Daily Limits & Per-Transaction Bounds
    const eligibleCandidates = validCandidates.filter(acc => {
      const limits = acc.dailyLimits || acc.credentials?.dailyLimits || {};
      
      // Single transaction min/max checks
      if (limits.minAmountPerTxn && limits.minAmountPerTxn > 0 && amount > 0 && amount < limits.minAmountPerTxn) {
        return false;
      }
      if (limits.maxAmountPerTxn && limits.maxAmountPerTxn > 0 && amount > 0 && amount > limits.maxAmountPerTxn) {
        return false;
      }

      // Live Daily usage check
      const stats = this.getAccountDailyStats(acc);
      if (limits.dailyAmountLimit && limits.dailyAmountLimit > 0 && amount > 0) {
        if ((stats.usedAmount + amount) > limits.dailyAmountLimit) {
          return false; // Rotates away!
        }
      }

      if (limits.dailyCountLimit && limits.dailyCountLimit > 0) {
        if (stats.usedCount >= limits.dailyCountLimit) {
          return false; // Rotates away!
        }
      }

      return true;
    });

    if (eligibleCandidates.length === 0) {
      throw new Error('All connected UPI accounts have reached their daily processing limit for today. Limits automatically reset at 00:00 IST.');
    }

    // 5. Weighted Random Selection among eligible non-exhausted accounts
    return this.pickWeightedAccount(eligibleCandidates);
  }

  private static pickWeightedAccount(accounts: MerchantAccount[]): MerchantAccount {
    if (accounts.length === 1) return accounts[0];

    const totalWeight = accounts.reduce((sum, acc) => sum + Math.max(1, acc.weight || 1), 0);
    let randomVal = Math.random() * totalWeight;

    for (const account of accounts) {
      const weight = Math.max(1, account.weight || 1);
      if (randomVal < weight) {
        account.lastUsedAt = new Date().toISOString();
        db.save();
        return account;
      }
      randomVal -= weight;
    }

    const fallback = accounts[0];
    fallback.lastUsedAt = new Date().toISOString();
    db.save();
    return fallback;
  }

  public static resolveTemplate(tenantId: string, apiKey?: ApiKey): string {
    // 1. Check if pinned on API key
    if (apiKey && apiKey.pinnedTemplate) {
      if (apiKey.pinnedTemplate !== 'random' && apiKey.pinnedTemplate !== 'rotate') {
        return apiKey.pinnedTemplate;
      }
    }

    // 2. Tenant settings
    const settings = db.templateSettings.find(s => s.tenantId === tenantId) || {
      tenantId,
      templateMode: 'rotate',
      defaultTemplate: 'template_1',
      enabledTemplates: [
        'template_1', 'template_2', 'template_3', 'template_4', 'template_5',
        'template_6', 'template_7', 'template_8', 'template_9', 'template_10', 'template_11'
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
    const tenantOrdersCount = db.orders.filter(o => o.tenantId === tenantId).length;
    const rotateIndex = tenantOrdersCount % enabled.length;
    return enabled[rotateIndex];
  }
}
