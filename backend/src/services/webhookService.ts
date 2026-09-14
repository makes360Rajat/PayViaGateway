import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { db } from '../db/database';
import { Order, WebhookLog } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class WebhookService {
  public static signPayload(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  public static async dispatchOrderCallback(order: Order): Promise<void> {
    const apiKey = order.apiKeyId ? db.apiKeys.find(k => k.id === order.apiKeyId) : undefined;
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

    const log: WebhookLog = {
      id: `wh_${uuidv4().slice(0, 8)}`,
      orderId: order.id,
      tenantId: order.tenantId,
      targetUrl,
      payload: payloadObj,
      attemptCount: 1,
      status: 'RETRYING',
      createdAt: new Date().toISOString()
    };

    db.webhookLogs.push(log);
    db.save();

    // Async dispatch
    this.sendWebhookHttp(targetUrl, payloadString, signature, log);
  }

  private static sendWebhookHttp(url: string, payload: string, signature: string, log: WebhookLog) {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

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
          db.save();
        });
      });

      req.on('error', (err) => {
        log.responseCode = 0;
        log.responseBody = err.message;
        log.status = 'FAILED';
        db.save();
      });

      req.on('timeout', () => {
        req.destroy();
        log.responseCode = 408;
        log.responseBody = 'Timeout waiting for merchant response';
        log.status = 'FAILED';
        db.save();
      });

      req.write(payload);
      req.end();
    } catch (e: any) {
      log.responseCode = 500;
      log.responseBody = e.message;
      log.status = 'FAILED';
      db.save();
    }
  }
}
