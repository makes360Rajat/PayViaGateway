"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const qrcode_1 = __importDefault(require("qrcode"));
const database_1 = require("../db/database");
const router = (0, express_1.Router)();
// Public Checkout Data Endpoint: GET /api/checkout/:token
router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const order = database_1.db.findOrderByToken(token);
        if (!order) {
            return res.status(404).json({ status: false, error: 'Payment link is invalid or expired' });
        }
        // Check expiration
        const now = Date.now();
        const expiresAtTime = new Date(order.expiresAt).getTime();
        if (now > expiresAtTime && order.status === 'PENDING') {
            order.status = 'EXPIRED';
            order.updatedAt = new Date().toISOString();
            database_1.db.save();
        }
        // Tenant info & branding
        const tenant = database_1.db.findTenantById(order.tenantId);
        const templateSettings = database_1.db.templateSettings.find(s => s.tenantId === order.tenantId);
        // Merchant Account info
        const merchantAccount = order.merchantAccountId
            ? database_1.db.merchants.find(m => m.id === order.merchantAccountId)
            : undefined;
        const upiId = merchantAccount?.upiId || 'merchant@paytm';
        const merchantName = templateSettings?.brandName || merchantAccount?.displayName || tenant?.businessName || 'Merchant Checkout';
        // Construct Standard UPI Intent Payload
        // Format: upi://pay?pa=...&pn=...&am=...&tn=...&cu=INR
        const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${order.amount.toFixed(2)}&tn=${encodeURIComponent(order.orderId)}&cu=INR`;
        // Specific UPI Intent App Schemes
        const intents = {
            generic: upiUri,
            gpay: `tez://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${order.amount.toFixed(2)}&tn=${encodeURIComponent(order.orderId)}&cu=INR`,
            phonepe: `phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${order.amount.toFixed(2)}&tn=${encodeURIComponent(order.orderId)}&cu=INR`,
            paytm: `paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${order.amount.toFixed(2)}&tn=${encodeURIComponent(order.orderId)}&cu=INR`,
            cred: `credpay://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${order.amount.toFixed(2)}&tn=${encodeURIComponent(order.orderId)}&cu=INR`,
            bhim: `bhim://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${order.amount.toFixed(2)}&tn=${encodeURIComponent(order.orderId)}&cu=INR`
        };
        // Generate high-res QR Code Base64
        let qrCodeBase64 = '';
        try {
            qrCodeBase64 = await qrcode_1.default.toDataURL(upiUri, {
                errorCorrectionLevel: 'H',
                margin: 2,
                width: 380,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
        }
        catch (qrErr) {
            console.error('QR code generation error', qrErr);
        }
        return res.json({
            status: true,
            data: {
                order_id: order.orderId,
                amount: order.amount,
                currency: order.currency,
                status: order.status,
                provider: order.provider,
                template: order.template || 'template_1',
                customer_name: order.customerName,
                customer_mobile: order.customerMobile,
                remark1: order.remark1,
                return_url: order.returnUrl,
                expires_at: order.expiresAt,
                paid_at: order.paidAt,
                utr: order.utr,
                branding: {
                    brand_name: templateSettings?.brandName || tenant?.businessName || 'Secure Checkout',
                    brand_color: templateSettings?.brandColor || '#6366f1',
                    brand_logo: templateSettings?.brandLogoUrl || null,
                    support_email: templateSettings?.supportEmail || tenant?.email
                },
                payment_details: {
                    upi_id: upiId,
                    display_name: merchantName,
                    upi_uri: upiUri,
                    qr_code_base64: qrCodeBase64,
                    intents,
                    crypto_networks: order.provider === 'CRYPTO' ? merchantAccount?.credentials?.networks || [] : []
                }
            }
        });
    }
    catch (e) {
        return res.status(500).json({ status: false, error: e.message });
    }
});
exports.default = router;
