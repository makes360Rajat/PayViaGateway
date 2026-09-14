<?php
require_once 'config.php';
require_once 'PayVia.php';

$gateway = new PayVia(PAYVIA_BASE_URL, PAYVIA_API_KEY);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $amount = floatval($_POST['amount'] ?? 499.00);
    $mobile = $_POST['customer_mobile'] ?? '9876543210';
    $name = $_POST['customer_name'] ?? 'Rahul Sharma';

    try {
        $order = $gateway->createOrder([
            'amount' => $amount,
            'customer_mobile' => $mobile,
            'customer_name' => $name,
            'remark1' => 'PHP Kit Demo Checkout',
            'return_url' => PAYVIA_RETURN_URL
        ]);

        // Redirect directly to hosted checkout
        header('Location: ' . $order['payment_url']);
        exit;
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>PayVia PHP Checkout Demo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white flex items-center justify-center min-h-screen p-4">
    <div class="max-w-md w-full bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl">
        <h1 class="text-xl font-bold mb-2">PayVia PHP Checkout</h1>
        <p class="text-xs text-slate-400 mb-6">Test standard redirect checkout with PayVia Gateway.</p>

        <?php if (!empty($error)): ?>
            <div class="bg-red-500/10 border border-red-500 text-red-300 p-3 rounded-xl text-xs mb-4">
                <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <form method="POST" class="space-y-4 text-xs">
            <div>
                <label class="block uppercase font-bold text-slate-400 mb-1">Amount (INR)</label>
                <input type="number" step="0.01" name="amount" value="499.00" class="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-white font-mono text-base font-bold" required>
            </div>
            <div>
                <label class="block uppercase font-bold text-slate-400 mb-1">Customer Mobile</label>
                <input type="text" name="customer_mobile" value="9876543210" class="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-white">
            </div>
            <div>
                <label class="block uppercase font-bold text-slate-400 mb-1">Customer Name</label>
                <input type="text" name="customer_name" value="Rahul Sharma" class="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-white">
            </div>
            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 p-3 rounded-lg font-bold text-white transition">
                Proceed to UPI Payment →
            </button>
        </form>
    </div>
</body>
</html>
