import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';
import { Tenant, ApiKey } from '../types';

export const JWT_SECRET = process.env.JWT_SECRET || 'payvia_super_secure_jwt_secret_key_2026';

export interface AuthenticatedRequest extends Request {
  tenant?: Tenant;
  apiKey?: ApiKey;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ status: false, error: 'Authentication token missing or invalid' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { tenantId: string; email: string; role: string };
    const tenant = db.findTenantById(decoded.tenantId);

    if (!tenant || !tenant.isActive) {
      return res.status(401).json({ status: false, error: 'Account inactive or not found' });
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    return res.status(401).json({ status: false, error: 'Invalid or expired session token' });
  }
};

export const authenticateApiKey = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const apiKeyHeader = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const apiKeyFromBody = req.body?.user_token;
  const rawKey = (apiKeyHeader || apiKeyFromBody) as string;

  if (!rawKey) {
    return res.status(401).json({ status: false, error: 'API key is required in x-api-key header or Authorization: Bearer' });
  }

  const apiKey = db.findApiKeyByKey(rawKey);

  if (!apiKey) {
    return res.status(401).json({ status: false, error: 'Invalid or revoked API key' });
  }

  const tenant = db.findTenantById(apiKey.tenantId);
  if (!tenant || !tenant.isActive) {
    return res.status(401).json({ status: false, error: 'Tenant account is inactive or suspended' });
  }

  // Check IP Whitelist if configured
  if (apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0) {
    const clientIp = req.ip || req.socket.remoteAddress || '';
    const isAllowed = apiKey.ipWhitelist.some(allowed => clientIp.includes(allowed));
    if (!isAllowed) {
      return res.status(403).json({ status: false, error: `Unauthorized IP address: ${clientIp}` });
    }
  }

  // Update last used timestamp
  apiKey.lastUsedAt = new Date().toISOString();
  db.save();

  req.tenant = tenant;
  req.apiKey = apiKey;
  next();
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.tenant || req.tenant.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ status: false, error: 'Super Admin privileges required' });
  }
  next();
};
