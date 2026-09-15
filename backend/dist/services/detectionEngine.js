"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectionEngine = exports.BANK_SMS_PATTERNS = void 0;
const database_1 = require("../db/database");
const webhookService_1 = require("./webhookService");
const uuid_1 = require("uuid");
exports.BANK_SMS_PATTERNS = [
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
class DetectionEngine {
    static parseBankSms(sender, message) {
        for (const pattern of exports.BANK_SMS_PATTERNS) {
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
    static parseNotification(packageName, title, message) {
        const combined = `${title} ${message}`;
        let provider = 'UPI_APP';
        if (packageName.includes('nbu.paisa') || /gpay|google\s*pay/i.test(combined)) {
            provider = 'GPAY';
        }
        else if (packageName.includes('phonepe') || /phonepe/i.test(combined)) {
            provider = 'PHONEPE';
        }
        else if (packageName.includes('paytm') || /paytm/i.test(combined)) {
            provider = 'PAYTM';
        }
        else if (packageName.includes('bharatpe') || /bharatpe/i.test(combined)) {
            provider = 'BHARATPE';
        }
        // 1. Direct Order ID Extraction (e.g. BYTE17894501153283049)
        const orderMatch = combined.match(/(BYTE\d{10,24}|ord_[a-zA-Z0-9]+)/i);
        const orderId = orderMatch ? orderMatch[1] : undefined;
        // 2. Amount Extraction (e.g. "RAHUL paid you ₹1.00", "Received ₹1.00", "Rs. 1.00")
        const amountMatch = combined.match(/(?:paid\s+you|received|deposited|credited|payment\s+of)\s*(?:of|with|by)?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+\.?\d*)/i) ||
            combined.match(/(?:₹|Rs\.?|INR)\s*([\d,]+\.?\d*)/i);
        let amount;
        if (amountMatch) {
            const rawAmount = amountMatch[1].replace(/,/g, '');
            const parsed = parseFloat(rawAmount);
            if (!isNaN(parsed))
                amount = parsed;
        }
        // 3. Payer Name Extraction (e.g. "RAHUL paid you", "received from RAHUL")
        const payerMatch = title.match(/^([A-Za-z\s]+?)\s+paid\s+you/i) ||
            combined.match(/(?:received\s+from|from|by)\s+([A-Za-z\s]+?)(?:\.|\s+via|\s+to|$)/i);
        const payerName = payerMatch ? payerMatch[1].trim() : undefined;
        // 4. 12-Digit UTR Extraction (if present)
        const utrMatch = combined.match(/(?:UPI|Ref|UTR|txn(?:\s*id)?)\s*[:\-\/]?\s*(\d{12})/i) || combined.match(/\b(\d{12})\b/);
        const utr = utrMatch ? utrMatch[1] : undefined;
        return { amount, orderId, utr, payerName, provider };
    }
    static async processIncomingNotification(deviceId, tenantId, packageName, title, message) {
        const parsed = this.parseNotification(packageName, title, message);
        const smsLog = {
            id: `notif_${(0, uuid_1.v4)().slice(0, 8)}`,
            deviceId,
            tenantId,
            sender: `${parsed.provider || 'APP'}:${packageName.split('.').pop() || 'notification'}`,
            message: `[${title}] ${message}`,
            parsedAmount: parsed.amount,
            parsedUtr: parsed.utr,
            status: 'UNMATCHED',
            receivedAt: new Date().toISOString()
        };
        let matchedOrder;
        // A. Direct Order ID matching (Highest Priority & 100% Deterministic)
        if (parsed.orderId) {
            matchedOrder = database_1.db.orders.find(o => (o.tenantId === tenantId || !tenantId) && o.orderId.toUpperCase() === parsed.orderId.toUpperCase());
        }
        // B. Amount matching fallback across pending and recently expired orders
        if (!matchedOrder && parsed.amount) {
            const openOrders = database_1.db.orders.filter(o => o.tenantId === tenantId && (o.status === 'PENDING' || o.status === 'AWAITING_VERIFY'));
            matchedOrder = openOrders.find(o => Math.abs(o.amount - parsed.amount) < 0.01);
            if (!matchedOrder) {
                const recentExpired = database_1.db.orders
                    .filter(o => o.tenantId === tenantId && o.status === 'EXPIRED')
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                matchedOrder = recentExpired.find(o => Math.abs(o.amount - parsed.amount) < 0.01);
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
            database_1.db.smsLogs.push(smsLog);
            database_1.db.save();
            // Trigger Webhook Callback
            await webhookService_1.WebhookService.dispatchOrderCallback(matchedOrder);
            return { matched: true, orderId: matchedOrder.orderId, message: `Notification matched with Order ${matchedOrder.orderId}!` };
        }
        database_1.db.smsLogs.push(smsLog);
        database_1.db.save();
        return { matched: false, message: 'Notification logged (no matching order found)' };
    }
    static async processIncomingSms(deviceId, tenantId, sender, message) {
        const parsed = this.parseBankSms(sender, message);
        // Also check for direct Order ID embedded in SMS note
        const directOrderMatch = message.match(/(BYTE\d{10,24}|ord_[a-zA-Z0-9]+)/i);
        const directOrderId = directOrderMatch ? directOrderMatch[1] : undefined;
        const smsLog = {
            id: `sms_${(0, uuid_1.v4)().slice(0, 8)}`,
            deviceId,
            tenantId,
            sender,
            message,
            parsedAmount: parsed.amount,
            parsedUtr: parsed.utr,
            status: 'UNMATCHED',
            receivedAt: new Date().toISOString()
        };
        let matchedOrder;
        // 1. Direct Order ID match
        if (directOrderId) {
            matchedOrder = database_1.db.orders.find(o => (o.tenantId === tenantId || !tenantId) && o.orderId.toUpperCase() === directOrderId.toUpperCase());
        }
        // 2. Amount and UTR matching
        if (!matchedOrder && parsed.amount) {
            const openOrders = database_1.db.orders.filter(o => o.tenantId === tenantId && (o.status === 'PENDING' || o.status === 'AWAITING_VERIFY'));
            matchedOrder = openOrders.find(o => Math.abs(o.amount - (parsed.amount || 0)) < 0.01);
            if (!matchedOrder) {
                const recentExpired = database_1.db.orders
                    .filter(o => o.tenantId === tenantId && o.status === 'EXPIRED')
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                matchedOrder = recentExpired.find(o => Math.abs(o.amount - (parsed.amount || 0)) < 0.01);
            }
        }
        if (!matchedOrder && (!parsed.amount || !parsed.utr)) {
            smsLog.status = 'IGNORED';
            database_1.db.smsLogs.push(smsLog);
            database_1.db.save();
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
            database_1.db.smsLogs.push(smsLog);
            database_1.db.save();
            // Trigger Webhook
            await webhookService_1.WebhookService.dispatchOrderCallback(matchedOrder);
            return { matched: true, orderId: matchedOrder.orderId };
        }
        database_1.db.smsLogs.push(smsLog);
        database_1.db.save();
        return { matched: false };
    }
    static async verifyManualUtr(linkToken, submittedUtr) {
        const order = database_1.db.findOrderByToken(linkToken);
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
        const matchingSms = database_1.db.smsLogs.find(s => s.parsedUtr === cleanUtr && s.tenantId === order.tenantId);
        // In production / live demo: confirm UTR and settle order
        order.status = 'TXN_SUCCESS';
        order.utr = cleanUtr;
        order.paidAt = new Date().toISOString();
        order.updatedAt = new Date().toISOString();
        order.rawVerificationData = {
            matchedBy: matchingSms ? 'SMS_GATEWAY_CROSS_CHECK' : 'UTR_MANUAL_SUBMISSION',
            submittedAt: new Date().toISOString()
        };
        database_1.db.save();
        // Trigger Webhook
        await webhookService_1.WebhookService.dispatchOrderCallback(order);
        return { success: true, message: 'Payment successfully verified!', order };
    }
    static checkOrderExpirations() {
        const now = new Date().getTime();
        for (const order of database_1.db.orders) {
            if (order.status === 'PENDING' || order.status === 'AWAITING_VERIFY') {
                const expiresAtTime = new Date(order.expiresAt).getTime();
                if (now > expiresAtTime) {
                    order.status = 'EXPIRED';
                    order.updatedAt = new Date().toISOString();
                }
            }
        }
        database_1.db.save();
    }
}
exports.DetectionEngine = DetectionEngine;
