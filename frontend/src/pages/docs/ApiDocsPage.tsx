import React, { useState } from 'react';
import { 
  FileCode2, 
  Terminal, 
  Copy, 
  CheckCircle2, 
  Download, 
  ShieldCheck, 
  KeyRound, 
  Webhook, 
  Sparkles,
  ExternalLink,
  Smartphone,
  Cpu,
  Layers
} from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'curl' | 'node' | 'php' | 'dart'>('curl');

  const copySnippet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const curlCreateSnippet = `curl -X POST https://yourdomain.com/api/public/v1/order/create \\
  -H "x-api-key: $YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 499.00,
    "customer_mobile": "9876543210",
    "customer_name": "Rahul Sharma",
    "remark1": "Invoice #1042",
    "return_url": "https://yourstore.com/success"
  }'`;

  const nodeCreateSnippet = `const axios = require('axios');

async function createPayOrder() {
  const response = await axios.post('https://yourdomain.com/api/public/v1/order/create', {
    amount: 499.00,
    customer_mobile: '9876543210',
    customer_name: 'Rahul Sharma',
    remark1: 'Invoice #1042',
    return_url: 'https://yourstore.com/success'
  }, {
    headers: {
      'x-api-key': 'pv_live_your_secret_key_here',
      'Content-Type': 'application/json'
    }
  });

  console.log('Payment URL:', response.data.data.payment_url);
  console.log('Order ID:', response.data.data.order_id);
}

createPayOrder();`;

  const phpCreateSnippet = `<?php
require_once 'PayVia.php';

$gateway = new PayVia('https://yourdomain.com', 'pv_live_your_secret_key_here');

$order = $gateway->createOrder([
    'amount' => 499.00,
    'customer_mobile' => '9876543210',
    'customer_name' => 'Rahul Sharma',
    'remark1' => 'Invoice #1042',
    'return_url' => 'https://yourstore.com/success.php'
]);

// Redirect customer to hosted checkout
header('Location: ' . $order['payment_url']);
exit;
?>`;

  const dartCreateSnippet = `import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> createOrderInDart() async {
  final url = Uri.parse('https://yourdomain.com/api/public/v1/order/create');

  final response = await http.post(
    url,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'pv_live_your_secret_key_here',
    },
    body: jsonEncode({
      'amount': 999.00,
      'customer_name': 'Amit Patel',
      'customer_mobile': '9876543210',
      'remark1': 'Order #9921',
      'return_url': 'https://mystore.com/success',
    }),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    print('Payment URL: \${data['data']['payment_url']}');
  }
}`;

  const webhookVerifyPhp = `<?php
$payload = file_get_contents('php://input');
$signatureHeader = $_SERVER['HTTP_X_GATEWAY_SIGNATURE'] ?? '';

$expectedSignature = 'sha256=' . hash_hmac('sha256', $payload, 'YOUR_WEBHOOK_SECRET');

if (hash_equals($expectedSignature, $signatureHeader)) {
    $data = json_decode($payload, true);
    if ($data['status'] === 'TXN_SUCCESS') {
        // Payment is genuine and verified!
        $orderId = $data['order_id'];
        $utr = $data['utr'];
        // Update database and deliver order
    }
    http_response_code(200);
} else {
    http_response_code(400); // Invalid signature
}
?>`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="glass-panel p-8 rounded-3xl border border-emerald-500/25 space-y-3 shadow-glow">
        <div className="flex items-center gap-2 font-mono text-xs text-amber-400 font-bold">
          <FileCode2 className="h-4 w-4" />
          <span>A-TO-Z DEVELOPER REST API & SDK DOCUMENTATION</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-white">
          PayVia Gateway Integration Reference
        </h1>
        <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed max-w-3xl">
          Complete end-to-end integration guide for integrating PayVia Gateway into web applications, e-commerce stores, mobile apps (Flutter/Dart), and automated verification engines.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <a
            href="/packages/php-kit/payvia-php-kit.zip"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-xs font-bold text-black shadow-glow hover:brightness-110 transition"
          >
            <Download className="h-4 w-4" />
            <span>Download PHP Integration Kit (.zip)</span>
          </a>
          <a
            href="/demos/pay_via_gateway_client_demo.dart"
            download
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-[#0b1f18] px-5 py-2.5 text-xs font-bold text-emerald-300 hover:bg-[#11382b] transition shadow-glow-amber"
          >
            <Smartphone className="h-4 w-4 text-amber-400" />
            <span>Download Demo Dart Client (.dart)</span>
          </a>
        </div>
      </div>

      {/* Authentication Section */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-amber-400" />
          <h2 className="font-bold text-base text-white">1. Authentication</h2>
        </div>
        <p className="text-xs text-emerald-200/80 leading-relaxed">
          Every API request must be authenticated with your private API key passed in the <code className="bg-emerald-950 px-2 py-0.5 rounded text-amber-300 font-mono border border-emerald-500/30">x-api-key</code> header. You can generate and rotate API keys anytime from the API Keys manager tab.
        </p>
        <div className="rounded-xl bg-emerald-950 p-3 font-mono text-xs text-emerald-300 border border-emerald-500/30">
          <span className="text-amber-400">Header:</span> x-api-key: pv_live_8f91a2b3c4d5e6f7a8b9c0d1e2f3a4b5
        </div>
      </div>

      {/* Create Order Endpoint */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold font-mono">
              POST
            </span>
            <h2 className="font-bold text-sm text-white font-mono">/api/public/v1/order/create</h2>
          </div>

          <div className="flex items-center gap-1 bg-[#0b1f18] p-1 rounded-xl border border-emerald-500/25 text-xs">
            {(['curl', 'node', 'php', 'dart'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`rounded-lg px-2.5 py-1 uppercase font-mono font-bold transition ${
                  activeLang === lang ? 'bg-gradient-primary text-black shadow-glow' : 'text-emerald-300/70 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-emerald-200/80">
          Creates a payment request and returns a shareable UPI pay link valid for 10 minutes with QR code and deep intent buttons.
        </p>

        {/* Code Snippet Box */}
        <div className="relative rounded-2xl bg-emerald-950 p-4 border border-emerald-500/30 font-mono text-xs text-emerald-200 overflow-x-auto">
          <button
            onClick={() => copySnippet('create', activeLang === 'curl' ? curlCreateSnippet : activeLang === 'node' ? nodeCreateSnippet : activeLang === 'php' ? phpCreateSnippet : dartCreateSnippet)}
            className="absolute top-3 right-3 rounded-lg bg-emerald-900 hover:bg-emerald-800 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 flex items-center gap-1 border border-emerald-500/40"
          >
            {copiedCode === 'create' ? <CheckCircle2 className="h-3 w-3 text-amber-400" /> : <Copy className="h-3 w-3" />}
            <span>{copiedCode === 'create' ? 'Copied!' : 'Copy'}</span>
          </button>
          <pre>
            {activeLang === 'curl' && curlCreateSnippet}
            {activeLang === 'node' && nodeCreateSnippet}
            {activeLang === 'php' && phpCreateSnippet}
            {activeLang === 'dart' && dartCreateSnippet}
          </pre>
        </div>

        {/* Response JSON preview */}
        <div>
          <span className="text-[11px] font-semibold text-amber-400 uppercase font-mono block mb-2">Sample Response (200 OK):</span>
          <pre className="rounded-2xl bg-emerald-950 p-4 border border-emerald-500/30 font-mono text-xs text-emerald-300 overflow-x-auto">
{`{
  "status": true,
  "data": {
    "order_id": "BYTE17891226576904209",
    "provider": "PAYTM",
    "merchant_account_id": "m_paytm_01",
    "account_label": "Main Store Paytm",
    "amount": 499.00,
    "template": "template_1",
    "payment_url": "https://yourdomain.com/pay/709fe1de7a234a74",
    "link_token": "709fe1de7a234a74",
    "expires_at": "2026-09-11T10:40:57.690Z"
  }
}`}
          </pre>
        </div>
      </div>

      {/* Check Order Status Endpoint */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 space-y-4">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 text-[11px] font-bold font-mono">
            GET
          </span>
          <h2 className="font-bold text-sm text-white font-mono">/api/public/v1/order/status/:orderId</h2>
        </div>
        <p className="text-xs text-emerald-200/80">
          Poll or fetch real-time transaction settlement status for any order. Returns <code className="text-amber-300 font-mono">PENDING_QR</code>, <code className="text-amber-300 font-mono">AWAITING_VERIFY</code>, or <code className="text-emerald-400 font-mono">TXN_SUCCESS</code> with UTR and timestamp.
        </p>
      </div>

      {/* Android Companion App & SMS Integration */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-amber-400" />
          <h2 className="font-bold text-base text-white">3. Android SMS Companion App Integration</h2>
        </div>
        <p className="text-xs text-emerald-200/80 leading-relaxed">
          The automated verification engine relies on our open-source Flutter/Dart Android companion app. The companion app pairs with your gateway server, listens to incoming bank credit SMS (from Paytm, BharatPe, HDFC, SBI, ICICI, etc.), and automatically ingests SMS packets to settle orders in sub-seconds.
        </p>
        <div className="rounded-2xl bg-emerald-950 p-4 border border-emerald-500/30 font-mono text-xs text-emerald-300">
          <span className="text-amber-400">// Ingest SMS endpoint (used by Companion App):</span><br />
          POST /api/devices/sms-ingest<br />
          Body: &#123; "deviceToken": "...", "sender": "VM-HDFCBK", "message": "Rs 499.00 credited via UPI Ref 623910238491", "timestamp": "..." &#125;
        </div>
      </div>

      {/* Webhook Signature Verification */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-amber-400" />
          <h2 className="font-bold text-base text-white">4. HMAC-SHA256 Signed Webhooks</h2>
        </div>
        <p className="text-xs text-emerald-200/80 leading-relaxed">
          When an order is successfully detected and matched by the gateway, a signed HTTP POST request is dispatched to your configured Webhook URL with the header <code className="bg-emerald-950 px-2 py-0.5 rounded text-amber-300 font-mono border border-emerald-500/30">x-gateway-signature</code>.
        </p>

        <div className="rounded-2xl bg-emerald-950 p-4 border border-emerald-500/30 font-mono text-xs text-emerald-200 overflow-x-auto">
          <pre>{webhookVerifyPhp}</pre>
        </div>
      </div>
    </div>
  );
};
