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
  ExternalLink
} from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'curl' | 'node' | 'php'>('curl');

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
      <div className="glass-panel p-8 rounded-3xl border border-white/5 space-y-3">
        <div className="flex items-center gap-2 font-mono text-xs text-indigo-400 font-bold">
          <FileCode2 className="h-4 w-4" />
          <span>DEVELOPER REST API REFERENCE</span>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-white">
          Integration Guide & API Endpoints
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
          Integrate PayVia with any backend application using standard JSON REST requests. All payment links are generated server-side using your scoped API key.
        </p>

        <div className="pt-2">
          <a
            href="/packages/php-kit/payvia-php-kit.zip"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-xs font-bold text-white shadow-glow hover:brightness-110 transition"
          >
            <Download className="h-4 w-4" />
            <span>Download PHP Integration Kit (.zip)</span>
          </a>
        </div>
      </div>

      {/* Authentication Section */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-purple-400" />
          <h2 className="font-bold text-base text-white">Authentication</h2>
        </div>
        <p className="text-xs text-slate-300">
          Every API request must be authenticated with your private API key passed in the <code className="bg-slate-900 px-2 py-0.5 rounded text-indigo-300 font-mono">x-api-key</code> header.
        </p>
        <div className="rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-300 border border-white/10">
          <span className="text-purple-400">Header:</span> x-api-key: pv_live_8f91a2b3c4d5e6f7a8b9c0d1e2f3a4b5
        </div>
      </div>

      {/* Create Order Endpoint */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 text-[11px] font-bold font-mono">
              POST
            </span>
            <h2 className="font-bold text-sm text-white font-mono">/api/public/v1/order/create</h2>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/5 text-xs">
            {(['curl', 'node', 'php'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`rounded-lg px-2.5 py-1 uppercase font-mono font-bold transition ${
                  activeLang === lang ? 'bg-indigo-600 text-white shadow-glow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-300">
          Creates a payment request and returns a shareable UPI pay link valid for 10 minutes with QR code and deep intent buttons.
        </p>

        {/* Code Snippet Box */}
        <div className="relative rounded-2xl bg-slate-950 p-4 border border-white/10 font-mono text-xs text-slate-200 overflow-x-auto">
          <button
            onClick={() => copySnippet('create', activeLang === 'curl' ? curlCreateSnippet : activeLang === 'node' ? nodeCreateSnippet : phpCreateSnippet)}
            className="absolute top-3 right-3 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-300 flex items-center gap-1"
          >
            {copiedCode === 'create' ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copiedCode === 'create' ? 'Copied!' : 'Copy'}</span>
          </button>
          <pre>
            {activeLang === 'curl' && curlCreateSnippet}
            {activeLang === 'node' && nodeCreateSnippet}
            {activeLang === 'php' && phpCreateSnippet}
          </pre>
        </div>

        {/* Response JSON preview */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono block mb-2">Sample Response (200 OK):</span>
          <pre className="rounded-2xl bg-slate-950 p-4 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto">
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

      {/* Webhook Signature Verification */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-pink-400" />
          <h2 className="font-bold text-base text-white">HMAC-SHA256 Signed Webhooks</h2>
        </div>
        <p className="text-xs text-slate-300">
          When an order is successfully detected and matched by the gateway, a signed HTTP POST request is dispatched to your configured Webhook URL with the header <code className="bg-slate-900 px-2 py-0.5 rounded text-indigo-300 font-mono">x-gateway-signature</code>.
        </p>

        <div className="rounded-2xl bg-slate-950 p-4 border border-white/10 font-mono text-xs text-slate-200 overflow-x-auto">
          <pre>{webhookVerifyPhp}</pre>
        </div>
      </div>
    </div>
  );
};
