import mysql, { Pool } from 'mysql2/promise';
import dotenv from 'dotenv';
import { DatabaseSchema } from './database';

dotenv.config();

export class MySQLClient {
  private static pool: Pool | null = null;
  public static isConnected = false;

  public static getPool(): Pool | null {
    if (this.pool) return this.pool;

    const dbName = process.env.DB_NAME || 'u586615155_payvia_db';
    const dbUser = process.env.DB_USER || 'u586615155_payvia_user';
    const dbPassword = process.env.DB_PASSWORD || 'K6b?qnk2L/';
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

    if (!dbName || !dbUser) {
      return null;
    }

    try {
      this.pool = mysql.createPool({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
      });

      return this.pool;
    } catch (e) {
      console.warn('MySQL pool creation skipped or failed:', e);
      return null;
    }
  }

  public static async testConnection(): Promise<boolean> {
    const pool = this.getPool();
    if (!pool) return false;

    try {
      const conn = await pool.getConnection();
      await conn.query('SELECT 1');
      conn.release();
      this.isConnected = true;
      console.log('✅ MySQL Database connected successfully (u586615155_payvia_db)');
      return true;
    } catch (e: any) {
      console.warn('⚠️ MySQL connection check failed, using persistent storage fallback:', e.message);
      this.isConnected = false;
      return false;
    }
  }

  public static async loadFromMySQL(): Promise<Partial<DatabaseSchema> | null> {
    const pool = this.getPool();
    if (!pool) return null;

    try {
      const [tenantsRows]: any = await pool.query('SELECT * FROM tenants');
      const [plansRows]: any = await pool.query('SELECT * FROM plans');
      const [subsRows]: any = await pool.query('SELECT * FROM subscriptions');
      const [merchantsRows]: any = await pool.query('SELECT * FROM merchants');
      const [devicesRows]: any = await pool.query('SELECT * FROM devices');
      const [apiKeysRows]: any = await pool.query('SELECT * FROM api_keys');
      const [ordersRows]: any = await pool.query('SELECT * FROM orders');
      const [webhookLogsRows]: any = await pool.query('SELECT * FROM webhook_logs');
      const [smsLogsRows]: any = await pool.query('SELECT * FROM sms_logs');
      const [templateSettingsRows]: any = await pool.query('SELECT * FROM template_settings');

      if (tenantsRows.length === 0) {
        return null; // empty database, allow initial seeding
      }

      return {
        tenants: tenantsRows.map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          passwordHash: r.password_hash,
          role: r.role,
          businessName: r.business_name,
          phone: r.phone,
          planId: r.plan_id,
          isActive: Boolean(r.is_active),
          createdAt: r.created_at,
          updatedAt: r.updated_at
        })),
        plans: plansRows.map((r: any) => ({
          id: r.id,
          name: r.name,
          price: parseFloat(r.price),
          validityDays: r.validity_days,
          maxMerchantAccounts: r.max_merchant_accounts,
          maxOrdersPerDay: r.max_orders_per_day,
          maxApiKeys: r.max_api_keys,
          features: JSON.parse(r.features_json || '{}'),
          isActive: Boolean(r.is_active)
        })),
        subscriptions: subsRows.map((r: any) => ({
          id: r.id,
          tenantId: r.tenant_id,
          planId: r.plan_id,
          status: r.status,
          startsAt: r.starts_at,
          expiresAt: r.expires_at,
          ordersToday: r.orders_today,
          lastResetDate: r.last_reset_date
        })),
        merchants: merchantsRows.map((r: any) => ({
          id: r.id,
          tenantId: r.tenant_id,
          provider: r.provider,
          label: r.label,
          upiId: r.upi_id,
          displayName: r.display_name,
          weight: r.weight,
          status: r.status,
          intentEnabled: Boolean(r.intent_enabled),
          gmailConnected: Boolean(r.gmail_connected),
          gmailEmail: r.gmail_email,
          credentials: JSON.parse(r.credentials_json || '{}'),
          smsCount: r.sms_count,
          lastUsedAt: r.last_used_at,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        })),
        devices: devicesRows.map((r: any) => ({
          id: r.id,
          tenantId: r.tenant_id,
          deviceName: r.device_name,
          deviceToken: r.device_token,
          pairingCode: r.pairing_code,
          simSlots: JSON.parse(r.sim_slots_json || '[]'),
          batteryLevel: r.battery_level,
          isOnline: Boolean(r.is_online),
          lastHeartbeatAt: r.last_heartbeat_at,
          smsCapturedCount: r.sms_captured_count,
          createdAt: r.created_at
        })),
        apiKeys: apiKeysRows.map((r: any) => ({
          id: r.id,
          tenantId: r.tenant_id,
          name: r.name,
          keyPrefix: r.key_prefix,
          rawKey: r.raw_key,
          isActive: Boolean(r.is_active),
          createdAt: r.created_at,
          lastUsedAt: r.last_used_at
        })),
        orders: ordersRows.map((r: any) => ({
          id: r.id,
          orderId: r.order_id,
          tenantId: r.tenant_id,
          apiKeyId: r.api_key_id,
          merchantAccountId: r.merchant_account_id,
          merchantAccountLabel: r.merchant_account_label,
          provider: r.provider,
          amount: parseFloat(r.amount),
          currency: r.currency,
          status: r.status,
          utr: r.utr,
          gatewayTxnId: r.gateway_txn_id,
          customerMobile: r.customer_mobile,
          customerName: r.customer_name,
          customerEmail: r.customer_email,
          remark1: r.remark1,
          remark2: r.remark2,
          returnUrl: r.return_url,
          callbackUrl: r.callback_url,
          template: r.template,
          linkToken: r.link_token,
          paymentUrl: r.payment_url,
          paidAt: r.paid_at,
          expiresAt: r.expires_at,
          rawVerificationData: JSON.parse(r.raw_verification_data_json || '{}'),
          createdAt: r.created_at,
          updatedAt: r.updated_at
        })),
        webhookLogs: webhookLogsRows.map((r: any) => ({
          id: r.id,
          orderId: r.order_id,
          tenantId: r.tenant_id,
          url: r.url,
          event: r.event,
          payload: JSON.parse(r.payload_json || '{}'),
          responseStatus: r.response_status,
          responseBody: r.response_body,
          success: Boolean(r.success),
          attemptCount: r.attempt_count,
          createdAt: r.created_at
        })),
        smsLogs: smsLogsRows.map((r: any) => ({
          id: r.id,
          deviceId: r.device_id,
          tenantId: r.tenant_id,
          sender: r.sender,
          message: r.message,
          parsedAmount: r.parsed_amount ? parseFloat(r.parsed_amount) : undefined,
          parsedUtr: r.parsed_utr,
          status: r.status,
          matchedOrderId: r.matched_order_id,
          receivedAt: r.received_at
        })),
        templateSettings: templateSettingsRows.map((r: any) => ({
          id: r.id,
          tenantId: r.tenant_id,
          templateName: r.template_name,
          brandName: r.brand_name,
          primaryColor: r.primary_color,
          logoUrl: r.logo_url,
          customCss: r.custom_css,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }))
      };
    } catch (e: any) {
      console.error('Error loading data from MySQL:', e.message);
      return null;
    }
  }

  public static async syncToMySQL(data: DatabaseSchema): Promise<void> {
    const pool = this.getPool();
    if (!pool) return;

    try {
      // Sync Tenants
      for (const t of data.tenants) {
        await pool.query(
          `INSERT INTO tenants (id, name, email, password_hash, role, business_name, phone, plan_id, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), password_hash=VALUES(password_hash), role=VALUES(role), business_name=VALUES(business_name), phone=VALUES(phone), plan_id=VALUES(plan_id), is_active=VALUES(is_active), updated_at=VALUES(updated_at)`,
          [t.id, t.name, t.email, t.passwordHash, t.role, t.businessName || null, t.phone || null, t.planId, t.isActive ? 1 : 0, t.createdAt, t.updatedAt]
        );
      }

      // Sync Plans
      for (const p of data.plans) {
        await pool.query(
          `INSERT INTO plans (id, name, price, validity_days, max_merchant_accounts, max_orders_per_day, max_api_keys, features_json, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), validity_days=VALUES(validity_days), max_merchant_accounts=VALUES(max_merchant_accounts), max_orders_per_day=VALUES(max_orders_per_day), max_api_keys=VALUES(max_api_keys), features_json=VALUES(features_json), is_active=VALUES(is_active)`,
          [p.id, p.name, p.price, p.validityDays, p.maxMerchantAccounts, p.maxOrdersPerDay, p.maxApiKeys, JSON.stringify(p.features), p.isActive ? 1 : 0]
        );
      }

      // Sync Subscriptions
      for (const s of data.subscriptions) {
        await pool.query(
          `INSERT INTO subscriptions (id, tenant_id, plan_id, status, starts_at, expires_at, orders_today, last_reset_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status=VALUES(status), starts_at=VALUES(starts_at), expires_at=VALUES(expires_at), orders_today=VALUES(orders_today), last_reset_date=VALUES(last_reset_date)`,
          [s.id, s.tenantId, s.planId, s.status, s.startsAt, s.expiresAt, s.ordersToday, s.lastResetDate]
        );
      }

      // Sync Merchants
      for (const m of data.merchants) {
        await pool.query(
          `INSERT INTO merchants (id, tenant_id, provider, label, upi_id, display_name, weight, status, intent_enabled, gmail_connected, gmail_email, credentials_json, sms_count, last_used_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE label=VALUES(label), upi_id=VALUES(upi_id), display_name=VALUES(display_name), weight=VALUES(weight), status=VALUES(status), intent_enabled=VALUES(intent_enabled), gmail_connected=VALUES(gmail_connected), gmail_email=VALUES(gmail_email), credentials_json=VALUES(credentials_json), sms_count=VALUES(sms_count), last_used_at=VALUES(last_used_at), updated_at=VALUES(updated_at)`,
          [m.id, m.tenantId, m.provider, m.label, m.upiId, m.displayName, m.weight, m.status, m.intentEnabled ? 1 : 0, m.gmailConnected ? 1 : 0, m.gmailEmail || null, JSON.stringify(m.credentials || {}), m.smsCount || 0, m.lastUsedAt || null, m.createdAt, m.updatedAt]
        );
      }

      // Sync Devices
      for (const d of data.devices) {
        await pool.query(
          `INSERT INTO devices (id, tenant_id, device_name, device_token, pairing_code, sim_slots_json, battery_level, is_online, last_heartbeat_at, sms_captured_count, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE device_name=VALUES(device_name), device_token=VALUES(device_token), pairing_code=VALUES(pairing_code), sim_slots_json=VALUES(sim_slots_json), battery_level=VALUES(battery_level), is_online=VALUES(is_online), last_heartbeat_at=VALUES(last_heartbeat_at), sms_captured_count=VALUES(sms_captured_count)`,
          [d.id, d.tenantId, d.deviceName, d.deviceToken, d.pairingCode || null, JSON.stringify(d.simSlots || []), d.batteryLevel, d.isOnline ? 1 : 0, d.lastHeartbeatAt, d.smsCapturedCount || 0, d.createdAt]
        );
      }

      // Sync API Keys
      for (const k of data.apiKeys) {
        await pool.query(
          `INSERT INTO api_keys (id, tenant_id, name, key_prefix, raw_key, is_active, created_at, last_used_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), key_prefix=VALUES(key_prefix), is_active=VALUES(is_active), last_used_at=VALUES(last_used_at)`,
          [k.id, k.tenantId, k.name, k.keyPrefix, k.rawKey, k.isActive ? 1 : 0, k.createdAt, k.lastUsedAt || null]
        );
      }

      // Sync Orders
      for (const o of data.orders) {
        await pool.query(
          `INSERT INTO orders (id, order_id, tenant_id, api_key_id, merchant_account_id, merchant_account_label, provider, amount, currency, status, utr, gateway_txn_id, customer_mobile, customer_name, customer_email, remark1, remark2, return_url, callback_url, template, link_token, payment_url, paid_at, expires_at, raw_verification_data_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status=VALUES(status), utr=VALUES(utr), gateway_txn_id=VALUES(gateway_txn_id), customer_mobile=VALUES(customer_mobile), customer_name=VALUES(customer_name), customer_email=VALUES(customer_email), paid_at=VALUES(paid_at), expires_at=VALUES(expires_at), raw_verification_data_json=VALUES(raw_verification_data_json), updated_at=VALUES(updated_at)`,
          [o.id, o.orderId, o.tenantId, o.apiKeyId || null, o.merchantAccountId, o.merchantAccountLabel, o.provider, o.amount, o.currency || 'INR', o.status, o.utr || null, o.gatewayTxnId || null, o.customerMobile || null, o.customerName || null, o.customerEmail || null, o.remark1 || null, o.remark2 || null, o.returnUrl || null, o.callbackUrl || null, o.template, o.linkToken, o.paymentUrl, o.paidAt || null, o.expiresAt, JSON.stringify(o.rawVerificationData || {}), o.createdAt, o.updatedAt]
        );
      }
    } catch (e: any) {
      console.error('Error syncing data to MySQL:', e.message);
    }
  }
}
