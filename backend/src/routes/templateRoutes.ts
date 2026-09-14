import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { db } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { PaymentTemplateConfig } from '../types';

const router = Router();

export const TEMPLATE_REGISTRY: PaymentTemplateConfig[] = [
  {
    id: 'template_1',
    name: 'Cyberpunk Dark Glass',
    description: 'Modern high-converting dark theme with glowing gradients and glassmorphism',
    category: 'Dark Mode',
    badge: 'Popular'
  },
  {
    id: 'template_2',
    name: 'Minimalist Clean White',
    description: 'Crisp, professional light layout with high contrast typography and clean lines',
    category: 'Minimal'
  },
  {
    id: 'template_3',
    name: 'Neumorphic Soft 3D',
    description: 'Tactile card depth with subtle embossed shadows and smooth interactive micro-states',
    category: 'Modern'
  },
  {
    id: 'template_4',
    name: 'Trust-Badge Corporate',
    description: 'Bank-grade security badges, ISO compliance markers, and verified merchant indicators',
    category: 'Enterprise',
    badge: 'High Conversion'
  },
  {
    id: 'template_5',
    name: 'Aurora Gradient Mesh',
    description: 'Vibrant animated gradient background with dynamic lighting and frosted glass card',
    category: 'Creative'
  },
  {
    id: 'template_6',
    name: 'Mobile-First Bottom Sheet',
    description: 'Ultra-fast thumb-friendly slide-up bottom drawer designed for mobile browsers',
    category: 'Mobile First'
  },
  {
    id: 'template_7',
    name: 'Fintech Indigo Pro',
    description: 'Sleek Stripe & Razorpay inspired interface with dual-pane layout on desktop',
    category: 'Fintech'
  },
  {
    id: 'template_8',
    name: 'Cyber Neon HUD',
    description: 'Futuristic HUD elements with glowing animated border pulse and tech counters',
    category: 'Futuristic'
  },
  {
    id: 'template_9',
    name: 'Floating Card Stack',
    description: 'Layered 3D floating perspective cards with dynamic lighting reflections',
    category: '3D UI'
  },
  {
    id: 'template_10',
    name: 'Live Pulse & Heartbeat',
    description: 'Real-time countdown dial with animated status waves and instant verification spinner',
    category: 'Live Status',
    badge: 'Realtime'
  }
];

// List all 10 templates
router.get('/', (req: Request, res: Response) => {
  return res.json({ status: true, data: TEMPLATE_REGISTRY });
});

// Get Merchant Template Settings
router.get('/settings', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  let settings = db.templateSettings.find(s => s.tenantId === tenantId);

  if (!settings) {
    settings = {
      tenantId,
      templateMode: 'rotate',
      defaultTemplate: 'template_1',
      enabledTemplates: TEMPLATE_REGISTRY.map(t => t.id),
      brandName: req.tenant!.businessName,
      brandColor: '#6366f1'
    };
    db.templateSettings.push(settings);
    db.save();
  }

  return res.json({ status: true, data: settings });
});

// Update Merchant Template Settings
router.put('/settings', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const { templateMode, defaultTemplate, enabledTemplates, brandName, brandColor, brandLogoUrl, supportEmail } = req.body;

  let settings = db.templateSettings.find(s => s.tenantId === tenantId);
  if (!settings) {
    settings = {
      tenantId,
      templateMode: templateMode || 'rotate',
      defaultTemplate: defaultTemplate || 'template_1',
      enabledTemplates: enabledTemplates || TEMPLATE_REGISTRY.map(t => t.id),
      brandName,
      brandColor,
      brandLogoUrl,
      supportEmail
    };
    db.templateSettings.push(settings);
  } else {
    if (templateMode !== undefined) settings.templateMode = templateMode;
    if (defaultTemplate !== undefined) settings.defaultTemplate = defaultTemplate;
    if (enabledTemplates !== undefined) settings.enabledTemplates = enabledTemplates;
    if (brandName !== undefined) settings.brandName = brandName;
    if (brandColor !== undefined) settings.brandColor = brandColor;
    if (brandLogoUrl !== undefined) settings.brandLogoUrl = brandLogoUrl;
    if (supportEmail !== undefined) settings.supportEmail = supportEmail;
  }

  db.save();
  return res.json({ status: true, message: 'Payment page settings saved successfully', data: settings });
});

// Live Preview endpoint for any template ID
router.get('/preview/:templateId', async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const upiId = 'demostore@paytm';
  const amount = 499.00;
  const orderId = 'DEMO_ORDER_991823';
  const merchantName = 'Demo Store';

  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(orderId)}&cu=INR`;
  
  let qrCodeBase64 = '';
  try {
    qrCodeBase64 = await QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 380
    });
  } catch (e) {}

  return res.json({
    status: true,
    data: {
      order_id: orderId,
      amount,
      currency: 'INR',
      status: 'PENDING',
      provider: 'PAYTM',
      template: templateId,
      customer_name: 'Alex Johnson',
      customer_mobile: '9876543210',
      remark1: 'Sample Preview Order',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      branding: {
        brand_name: 'Demo Enterprise Store',
        brand_color: '#6366f1',
        support_email: 'support@demostore.com'
      },
      payment_details: {
        upi_id: upiId,
        display_name: merchantName,
        upi_uri: upiUri,
        qr_code_base64: qrCodeBase64,
        intents: {
          generic: upiUri,
          gpay: `tez://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(orderId)}&cu=INR`,
          phonepe: `phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(orderId)}&cu=INR`,
          paytm: `paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(orderId)}&cu=INR`,
          cred: `credpay://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(orderId)}&cu=INR`,
          bhim: `bhim://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(orderId)}&cu=INR`
        }
      }
    }
  });
});

export default router;
