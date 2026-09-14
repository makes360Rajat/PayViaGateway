import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import merchantRoutes from './routes/merchantRoutes';
import deviceRoutes from './routes/deviceRoutes';
import apiKeyRoutes from './routes/apiKeyRoutes';
import orderRoutes from './routes/orderRoutes';
import checkoutRoutes from './routes/checkoutRoutes';
import templateRoutes from './routes/templateRoutes';
import planRoutes from './routes/planRoutes';
import adminRoutes from './routes/adminRoutes';
import { DetectionEngine } from './services/detectionEngine';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-gateway-signature']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static assets if needed
app.use('/public', express.static(path.join(__dirname, '../public')));

// API Routes Mounts
app.use('/api/auth', authRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', orderRoutes); // for /api/public/v1/order/*
app.use('/api/checkout', checkoutRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: true,
    service: 'PayVia Gateway & Verification Core',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// WebSocket real-time connection for checkout pages & dashboard firehose
wss.on('connection', (ws: WebSocket, req) => {
  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'subscribe_order' && data.linkToken) {
        (ws as any).subscribedToken = data.linkToken;
        ws.send(JSON.stringify({ type: 'subscribed', linkToken: data.linkToken }));
      }
    } catch (e) {}
  });

  ws.send(JSON.stringify({ type: 'connected', time: new Date().toISOString() }));
});

// Background Order Expiration Worker (runs every 10 seconds)
setInterval(() => {
  try {
    DetectionEngine.checkOrderExpirations();
  } catch (e) {
    console.error('Error in expiration checker', e);
  }
}, 10000);

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 PayVia Payment Gateway Server running on port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

export default app;
