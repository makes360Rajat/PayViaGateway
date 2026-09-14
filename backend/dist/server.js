"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const merchantRoutes_1 = __importDefault(require("./routes/merchantRoutes"));
const deviceRoutes_1 = __importDefault(require("./routes/deviceRoutes"));
const apiKeyRoutes_1 = __importDefault(require("./routes/apiKeyRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const checkoutRoutes_1 = __importDefault(require("./routes/checkoutRoutes"));
const templateRoutes_1 = __importDefault(require("./routes/templateRoutes"));
const planRoutes_1 = __importDefault(require("./routes/planRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const detectionEngine_1 = require("./services/detectionEngine");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
const PORT = process.env.PORT || 5001;
// Middleware
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-gateway-signature']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static assets
app.use('/public', express_1.default.static(path_1.default.join(__dirname, '../public')));
// API Routes Mounts
app.use('/api/auth', authRoutes_1.default);
app.use('/api/merchants', merchantRoutes_1.default);
app.use('/api/devices', deviceRoutes_1.default);
app.use('/api/keys', apiKeyRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api', orderRoutes_1.default); // for /api/public/v1/order/*
app.use('/api/checkout', checkoutRoutes_1.default);
app.use('/api/templates', templateRoutes_1.default);
app.use('/api/plans', planRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: true,
        service: 'PayVia Gateway & Verification Core',
        domain: 'payvia360.com',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});
// Production React Frontend SPA Static Serving
const possibleFrontendPaths = [
    path_1.default.join(__dirname, '../../frontend/dist'),
    path_1.default.join(__dirname, '../frontend/dist'),
    path_1.default.join(__dirname, './public_html'),
    path_1.default.join(__dirname, '../dist_web')
];
let activeFrontendDist = '';
for (const p of possibleFrontendPaths) {
    if (fs_1.default.existsSync(p)) {
        activeFrontendDist = p;
        break;
    }
}
if (activeFrontendDist) {
    app.use(express_1.default.static(activeFrontendDist));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/public') || req.path.startsWith('/ws')) {
            return next();
        }
        res.sendFile(path_1.default.join(activeFrontendDist, 'index.html'));
    });
}
// WebSocket real-time connection for checkout pages & dashboard firehose
wss.on('connection', (ws, req) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.type === 'subscribe_order' && data.linkToken) {
                ws.subscribedToken = data.linkToken;
                ws.send(JSON.stringify({ type: 'subscribed', linkToken: data.linkToken }));
            }
        }
        catch (e) { }
    });
    ws.send(JSON.stringify({ type: 'connected', time: new Date().toISOString() }));
});
// Background Order Expiration Worker (runs every 10 seconds)
setInterval(() => {
    try {
        detectionEngine_1.DetectionEngine.checkOrderExpirations();
    }
    catch (e) {
        console.error('Error in expiration checker', e);
    }
}, 10000);
server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 PayVia Payment Gateway Server running on port ${PORT}`);
    console.log(`📡 Health: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
});
exports.default = app;
