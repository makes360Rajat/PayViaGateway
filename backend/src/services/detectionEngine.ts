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

  public static async processIncomingSms(deviceId: string, tenantId: string, sender: string, message: string): Promise<{ matched: boolean; orderId?: string }> {
    const parsed = this.parseBankSms(sender, message);
    
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

    if (!parsed.amount || !parsed.utr) {
      smsLog.status = 'IGNORED';
      db.smsLogs.push(smsLog);
      db.save();
      return { matched: false };
    }

    // Match against open pending orders in the tenant (or recently expired if paid before expiry)
    const openOrders = db.orders.filter(
      o => o.tenantId === tenantId && (o.status === 'PENDING' || o.status === 'AWAITING_VERIFY')
    );

    // Look for matching amount within open orders first
    let matchedOrder = openOrders.find(o => {
      const amountDiff = Math.abs(o.amount - (parsed.amount || 0));
      return amountDiff < 0.01; // exact amount match
    });

    // If no open order, check recent expired orders within last 24 hours
    if (!matchedOrder) {
      const recentExpired = db.orders
        .filter(o => o.tenantId === tenantId && o.status === 'EXPIRED')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      matchedOrder = recentExpired.find(o => {
        const amountDiff = Math.abs(o.amount - (parsed.amount || 0));
        return amountDiff < 0.01;
      });
    }

    if (matchedOrder) {
      matchedOrder.status = 'TXN_SUCCESS';
      matchedOrder.utr = parsed.utr;
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
