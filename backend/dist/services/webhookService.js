"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const database_1 = require("../db/database");
const uuid_1 = require("uuid");
class WebhookService {
    static signPayload(payload, secret) {
        return crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex');
    }
    static async dispatchOrderCallback(order) {
        const apiKey = order.apiKeyId ? database_1.db.apiKeys.find(k => k.id === order.apiKeyId) : undefined;
        const targetUrl = order.callbackUrl || apiKey?.webhookUrl;
        const webhookSecret = apiKey?.webhookSecret || 'whsec_default_secret_2026';
        if (!targetUrl) {
            return;
        }
        const payloadObj = {
            event: order.status === 'TXN_SUCCESS' ? 'payment.success' : `payment.${order.status.toLowerCase()}`,
            order_id: order.orderId,
            amount: order.amount,
            currency: order.currency,
            status: order.status,
            utr: order.utr || null,
            gateway_txn: order.gatewayTxnId || null,
            provider: order.provider,
            paid_at: order.paidAt || null,
            remark1: order.remark1 || null,
            created_at: order.createdAt
        };
        const payloadString = JSON.stringify(payloadObj);
        const signature = this.signPayload(payloadString, webhookSecret);
        const log = {
            id: `wh_${(0, uuid_1.v4)().slice(0, 8)}`,
            orderId: order.id,
            tenantId: order.tenantId,
            targetUrl,
            payload: payloadObj,
            attemptCount: 1,
            status: 'RETRYING',
            createdAt: new Date().toISOString()
        };
        database_1.db.webhookLogs.push(log);
        database_1.db.save();
        // Async dispatch
        this.sendWebhookHttp(targetUrl, payloadString, signature, log);
    }
    static sendWebhookHttp(url, payload, signature, log) {
        try {
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const client = isHttps ? https_1.default : http_1.default;
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                    'x-gateway-signature': `sha256=${signature}`,
                    'User-Agent': 'PayVia-Webhook-Dispatcher/1.0'
                },
                timeout: 5000
            };
            const req = client.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    log.responseCode = res.statusCode;
                    log.responseBody = body.slice(0, 500);
                    log.status = (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) ? 'DELIVERED' : 'FAILED';
                    database_1.db.save();
                });
            });
            req.on('error', (err) => {
                log.responseCode = 0;
                log.responseBody = err.message;
                log.status = 'FAILED';
                database_1.db.save();
            });
            req.on('timeout', () => {
                req.destroy();
                log.responseCode = 408;
                log.responseBody = 'Timeout waiting for merchant response';
                log.status = 'FAILED';
                database_1.db.save();
            });
            req.write(payload);
            req.end();
        }
        catch (e) {
            log.responseCode = 500;
            log.responseBody = e.message;
            log.status = 'FAILED';
            database_1.db.save();
        }
    }
}
exports.WebhookService = WebhookService;
