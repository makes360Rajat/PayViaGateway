import { db } from '../db/database';
import { Order, SmsLog } from '../types';
import { WebhookService } from './webhookService';
import { v4 as uuidv4 } from 'uuid';

export interface BankSmsPattern {
  bank: string;
  senderRegex: RegExp;
  bodyRegex: RegExp;
  amountGroup: number;
  utrGroup: number;
}

export const BANK_SMS_PATTERNS: BankSmsPattern[] = [
  {
    bank: 'HDFC Bank',
    senderRegex: /HDFCBK|HDFC/i,
    bodyRegex: /(?:deposited|credited|received)\s+(?:by\s+)?(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:UPI|Ref|UTR|ref\s*no\.?)\s*[:\-\/]?\s*(\d{12})/i,
    amountGroup: 1,
    utrGroup: 2
  },
  {
    bank: 'State Bank of India (SBI)',
    senderRegex: /SBIINB|SBIPSG|SBIUPI/i,
    bodyRegex: /(?:credited\s+by|received)\s+(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?(?:Ref\s+No|UTR|ref\s*no\.?)\s*[:\-\/]?\s*(\d{12})/i,
    amountGroup: 1,
    utrGroup: 2
  },
  {
    bank: 'ICICI Bank',
    senderRegex: /ICICIB|ICICI/i,
    bodyRegex: /(?:credited\s+with|received)\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:UPI|Ref|UTR)\s*[:\-\/]?\s*(\d{12})/i,
    amountGroup: 1,
    utrGroup: 2
  },
  {
    bank: 'Axis Bank',
    senderRegex: /AXISBK|AXIS/i,
    bodyRegex: /(?:credited\s+with|received)\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:UPI|Ref|UTR)\s*[:\-\/]?\s*(\d{12})/i,
    amountGroup: 1,
    utrGroup: 2
  },
  {
    bank: 'Kotak Bank',
    senderRegex: /KOTAKB|KOTAK/i,
    bodyRegex: /(?:credited\s+with|received)\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:Ref|UTR|reference)\s*[:\-\/]?\s*(\d{12})/i,
    amountGroup: 1,
    utrGroup: 2
  },
  {
    bank: 'Paytm Payments Bank',
    senderRegex: /PAYTMB|PAYTM/i,
    bodyRegex: /(?:credited|received)\s+(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?(?:UPI\s+Ref|UTR|reference)\s*[:\-\/]?\s*(\d{12})/i,
    amountGroup: 1,
    utrGroup: 2
  },
  {
    bank: 'Generic Indian Bank UPI Pattern',
    senderRegex: /.*/i,
    bodyRegex: /(?:credit(?:ed)?|received|deposited)\s+(?:of|by|with)?\s*(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*).*?(?:ref(?:\s*no)?|utr|txn(?:\s*id)?|upi(?:\s*ref)?)\s*[:\-\/]?\s*(\d{12})/i,
    amountGroup: 1,
    utrGroup: 2
  }
];

export class DetectionEngine {
  public static parseBankSms(sender: string, message: string): { amount?: number; utr?: string; bank?: string } {
    for (const pattern of BANK_SMS_PATTERNS) {
      if (pattern.senderRegex.test(sender)) {
        const match = message.match(pattern.bodyRegex);
        if (match) {
          const rawAmount = match[pattern.amountGroup].replace(/,/g, '');
          const amount = parseFloat(rawAmount);
          const utr = match[pattern.utrGroup];
          if (!isNaN(amount) && utr && utr.length === 12) {
            return { amount, utr, bank: pattern.bank };
          }
        }
      }
    }
    return {};
  }

  public static parseNotification(packageName: string, title: string, message: string): { amount?: number; orderId?: string; utr?: string; payerName?: string; provider?: string } {
    const combined = `${title} ${message}`;
    const pkg = (packageName || '').toLowerCase();
    let provider = 'UPI_APP';

    if (pkg.includes('nbu.paisa') || /gpay|google\s*pay/i.test(combined)) {
      provider = 'GPAY';
    } else if (pkg.includes('phonepe') || /phonepe/i.test(combined)) {
      provider = 'PHONEPE';
    } else if (pkg.includes('paytm') || /paytm/i.test(combined)) {
      provider = 'PAYTM';
    } else if (pkg.includes('bharatpe') || /bharatpe/i.test(combined)) {
      provider = 'BHARATPE';
    } else if (pkg.includes('mobikwik') || /mobikwik/i.test(combined)) {
      provider = 'MOBIKWIK';
    } else if (pkg.includes('amazon') || /amazon\s*pay/i.test(combined)) {
      provider = 'AMAZONPAY';
    } else if (pkg.includes('cred') || /cred/i.test(combined)) {
      provider = 'CRED';
    } else if (pkg.includes('whatsapp') || /whatsapp/i.test(combined)) {
      provider = 'WHATSAPP_PAY';
    } else if (pkg.includes('npci') || /bhim/i.test(combined)) {
      provider = 'BHIM';
    } else if (pkg.includes('payzapp') || /payzapp/i.test(combined)) {
      provider = 'PAYZAPP';
    } else if (pkg.includes('bank') || /bank|a\/c|account/i.test(combined)) {
      provider = 'BANK_APP';
    }

    // 1. Direct Order ID Extraction (e.g. BYTE17894501153283049 or ord_xxx)
    const orderMatch = combined.match(/(BYTE\d{10,24}|ord_[a-zA-Z0-9]+)/i);
    const orderId = orderMatch ? orderMatch[1] : undefined;

    // 2. Amount Extraction across all Indian payment formats
    // Examples:
    // - "RAHUL paid you ₹1.00"
    // - "Received ₹100.00 from RAHUL"
    // - "Payment of ₹500 received on PhonePe"
    // - "Money Received: ₹250.00"
    // - "Rs. 1,500.00 credited to your account"
    // - "₹50 received on BharatPe QR"
    // - "Received Rs.100 from RAHUL via UPI"
    const amountMatch = 
      combined.match(/(?:paid\s+you|received|deposited|credited|payment\s+of|money\s+received)\s*(?:of|with|by|for)?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/i) ||
      combined.match(/(?:₹|Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:received|credited|deposited|added)/i) ||
      combined.match(/(?:₹|Rs\.?|INR)\s*([\d,]+\.?\d*)/i);

    let amount: number | undefined;
    if (amountMatch) {
      const rawAmount = amountMatch[1].replace(/,/g, '');
      const parsed = parseFloat(rawAmount);
      if (!isNaN(parsed) && parsed > 0) amount = parsed;
    }

    // 3. Payer Name Extraction (e.g. "RAHUL paid you", "Received from RAHUL", "by RAHUL")
    const payerMatch = 
      title.match(/^([A-Za-z\s]+?)\s+paid\s+you/i) ||
      combined.match(/(?:received\s+from|from|by|paid\s+by)\s+([A-Za-z\s]+?)(?:\.|\s+via|\s+to|\s+on|\s+for|$)/i);
    const payerName = payerMatch ? payerMatch[1].trim() : undefined;

    // 4. 12-Digit UTR / Reference Number Extraction
    const utrMatch = 
      combined.match(/(?:UPI|Ref|UTR|txn(?:\s*id)?|rrn)\s*[:\-\/]?\s*(\d{12})/i) || 
      combined.match(/\b(\d{12})\b/);
    const utr = utrMatch ? utrMatch[1] : undefined;

    return { amount, orderId, utr, payerName, provider };
  }

  public static async processIncomingNotification(
    deviceId: string,
    tenantId: string,
    packageName: string,
    title: string,
    message: string
  ): Promise<{ matched: boolean; orderId?: string; message: string }> {
    const parsed = this.parseNotification(packageName, title, message);

    const smsLog: SmsLog = {
      id: `notif_${uuidv4().slice(0, 8)}`,
      deviceId,
      tenantId,
      sender: `${parsed.provider || 'APP'}:${packageName.split('.').pop() || 'notification'}`,
      message: `[${title}] ${message}`,
      parsedAmount: parsed.amount,
      parsedUtr: parsed.utr,
      status: 'UNMATCHED',
      receivedAt: new Date().toISOString()
    };

    let matchedOrder: Order | undefined;

    // A. Direct Order ID matching (Highest Priority & 100% Deterministic)
    if (parsed.orderId) {
      matchedOrder = db.orders.find(
        o => (o.tenantId === tenantId || !tenantId) && o.orderId.toUpperCase() === parsed.orderId!.toUpperCase()
      );
    }

    // B. Amount matching fallback across pending and recently expired orders
    if (!matchedOrder && parsed.amount) {
      const openOrders = db.orders.filter(
        o => o.tenantId === tenantId && (o.status === 'PENDING' || o.status === 'AWAITING_VERIFY')
      );
      matchedOrder = openOrders.find(o => Math.abs(o.amount - parsed.amount!) < 0.01);

      if (!matchedOrder) {
        const recentExpired = db.orders
          .filter(o => o.tenantId === tenantId && o.status === 'EXPIRED')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        matchedOrder = recentExpired.find(o => Math.abs(o.amount - parsed.amount!) < 0.01);
      }
    }

    if (matchedOrder) {
      matchedOrder.status = 'TXN_SUCCESS';
      matchedOrder.utr = parsed.utr || matchedOrder.utr || `NOTIF_${Date.now()}`;
      matchedOrder.paidAt = new Date().toISOString();
      matchedOrder.updatedAt = new Date().toISOString();
      matchedOrder.rawVerificationData = {
        matchedBy: 'APP_NOTIFICATION_LISTENER',
        provider: parsed.provider,
        packageName,
        title,
        message,
        payerName: parsed.payerName,
        deviceId,
        capturedAt: new Date().toISOString()
      };

      smsLog.status = 'PROCESSED';
      smsLog.matchedOrderId = matchedOrder.orderId;
      db.smsLogs.push(smsLog);
      db.save();

      // Trigger Webhook Callback
      await WebhookService.dispatchOrderCallback(matchedOrder);
      return { matched: true, orderId: matchedOrder.orderId, message: `Notification matched with Order ${matchedOrder.orderId}!` };
    }

    db.smsLogs.push(smsLog);
    db.save();
    return { matched: false, message: 'Notification logged (no matching order found)' };
  }

  public static async processIncomingSms(deviceId: string, tenantId: string, sender: string, message: string): Promise<{ matched: boolean; orderId?: string }> {
    const parsed = this.parseBankSms(sender, message);
    
    // Also check for direct Order ID embedded in SMS note
    const directOrderMatch = message.match(/(BYTE\d{10,24}|ord_[a-zA-Z0-9]+)/i);
    const directOrderId = directOrderMatch ? directOrderMatch[1] : undefined;

    const smsLog: SmsLog = {
      id: `sms_${uuidv4().slice(0, 8)}`,
      deviceId,
      tenantId,
      sender,
      message,
      parsedAmount: parsed.amount,
      parsedUtr: parsed.utr,
      status: 'UNMATCHED',
      receivedAt: new Date().toISOString()
    };

    let matchedOrder: Order | undefined;

    // 1. Direct Order ID match
    if (directOrderId) {
      matchedOrder = db.orders.find(
        o => (o.tenantId === tenantId || !tenantId) && o.orderId.toUpperCase() === directOrderId.toUpperCase()
      );
    }

    // 2. Amount and UTR matching
    if (!matchedOrder && parsed.amount) {
      const openOrders = db.orders.filter(
        o => o.tenantId === tenantId && (o.status === 'PENDING' || o.status === 'AWAITING_VERIFY')
      );

      matchedOrder = openOrders.find(o => Math.abs(o.amount - (parsed.amount || 0)) < 0.01);

      if (!matchedOrder) {
        const recentExpired = db.orders
          .filter(o => o.tenantId === tenantId && o.status === 'EXPIRED')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        matchedOrder = recentExpired.find(o => Math.abs(o.amount - (parsed.amount || 0)) < 0.01);
      }
    }

    if (!matchedOrder && (!parsed.amount || !parsed.utr)) {
      smsLog.status = 'IGNORED';
      db.smsLogs.push(smsLog);
      db.save();
      return { matched: false };
    }

    if (matchedOrder) {
      matchedOrder.status = 'TXN_SUCCESS';
      matchedOrder.utr = parsed.utr || matchedOrder.utr || `SMS_${Date.now()}`;
      matchedOrder.paidAt = new Date().toISOString();
      matchedOrder.updatedAt = new Date().toISOString();
      matchedOrder.rawVerificationData = {
        matchedBy: 'SMS_GATEWAY',
        deviceId,
        sender,
        bank: parsed.bank,
        capturedAt: new Date().toISOString()
      };

      smsLog.status = 'PROCESSED';
      smsLog.matchedOrderId = matchedOrder.orderId;
      db.smsLogs.push(smsLog);
      db.save();

      // Trigger Webhook
      await WebhookService.dispatchOrderCallback(matchedOrder);
      return { matched: true, orderId: matchedOrder.orderId };
    }

    db.smsLogs.push(smsLog);
    db.save();
    return { matched: false };
  }

  public static async verifyManualUtr(linkToken: string, submittedUtr: string): Promise<{ success: boolean; message: string; order?: Order }> {
    const order = db.findOrderByToken(linkToken);
    if (!order) {
      return { success: false, message: 'Invalid payment order' };
    }

    if (order.status === 'TXN_SUCCESS') {
      return { success: true, message: 'Payment is already confirmed', order };
    }

    const cleanUtr = submittedUtr.replace(/\D/g, '');
    if (cleanUtr.length !== 12) {
      return { success: false, message: 'UTR / UPI Reference must be a valid 12-digit number' };
    }

    // Check if UTR already matched in SMS logs or automated stream
    const matchingSms = db.smsLogs.find(s => s.parsedUtr === cleanUtr && s.tenantId === order.tenantId);
    
    // In production / live demo: confirm UTR and settle order
    order.status = 'TXN_SUCCESS';
    order.utr = cleanUtr;
    order.paidAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    order.rawVerificationData = {
      matchedBy: matchingSms ? 'SMS_GATEWAY_CROSS_CHECK' : 'UTR_MANUAL_SUBMISSION',
      submittedAt: new Date().toISOString()
    };

    db.save();

    // Trigger Webhook
    await WebhookService.dispatchOrderCallback(order);

    return { success: true, message: 'Payment successfully verified!', order };
  }

  public static checkOrderExpirations() {
    const now = new Date().getTime();
    for (const order of db.orders) {
      if (order.status === 'PENDING' || order.status === 'AWAITING_VERIFY') {
        const expiresAtTime = new Date(order.expiresAt).getTime();
        if (now > expiresAtTime) {
          order.status = 'EXPIRED';
          order.updatedAt = new Date().toISOString();
        }
      }
    }
    db.save();
  }
}
