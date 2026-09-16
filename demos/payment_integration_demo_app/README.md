# ⚡ PayVia360 — Payment Gateway Flutter Integration Demo App

An end-to-end Flutter application demonstrating real-time UPI payment integration with **PayVia360 Payment Gateway** (`https://payvia360.com`).

---

## 🌟 Key Features

1. **Merchant Hub & Order Generator (`MerchantOrderScreen`)**:
   - Create dynamic UPI 2.0 payment links and orders with instant server synchronization.
   - Quick preset amounts (₹100, ₹250, ₹500, ₹1000, ₹2500, ₹4999) or custom amounts.
   - Live zero-fee (0%) payment processing indicator.
   - Real-time transaction history.

2. **Hosted Dynamic QR & Checkout Screen (`PaymentCheckoutScreen`)**:
   - Dynamic UPI QR Code rendered in real-time with merchant VPA and order reference parameters.
   - 15-minute live expiry countdown timer.
   - **📸 Take & Save QR Screenshot**: Captures high-res QR code image directly to app simulation memory via `RepaintBoundary`.
   - **📲 Instant UPI App Launchers**: One-tap simulators for Google Pay, PhonePe, Paytm, and BHIM.
   - Real-time gateway polling: automatically transitions to the success screen when payment is settled on the server!

3. **Futuristic QR Scanner & Payment Completer (`QRScannerScreen`)**:
   - **Live Scanner Viewfinder**: Cyberpunk HUD with animated green laser scan line.
   - **📸 Saved Screenshots Gallery**: Automatically detects screenshots taken from the checkout screen and decodes the order details (Order ID, Amount, Merchant UPI).
   - **Simulated Bank Payment & UTR Generator**: Generates authentic 12-digit bank reference numbers (UTR) and submits instant settlement notifications to `https://payvia360.com/api/devices/notification-ingest`.

4. **Celebratory Receipt & Invoice Screen (`PaymentSuccessScreen`)**:
   - Animated emerald checkmark and sound/haptic cues.
   - Verified Gateway tick, breakdown of Order ID, UTR Reference, timestamp, and instant return to merchant hub.

---

## 🚀 Running the Demo App

### On Android / iOS / macOS / Web:
```bash
cd "demos/payment_integration_demo_app"

# Get dependencies
flutter pub get

# Run on macOS / Chrome / Connected Device
flutter run -d chrome
# or
flutter run -d macos
# or
flutter run -d android
```

---

## 🔗 Architecture & API Reference

- **Create Order**: `POST https://payvia360.com/api/orders`
- **Fetch Checkout Details**: `GET https://payvia360.com/api/checkout/:linkToken`
- **Instant SMS/UPI Notification Settlement**: `POST https://payvia360.com/api/devices/notification-ingest`
