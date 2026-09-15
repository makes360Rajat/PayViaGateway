package com.payvia.gateway.payvia_companion

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.PowerManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class PayViaNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "PayViaNotifListener"
        const val ACTION_NOTIFICATION_CAPTURED = "com.payvia.gateway.NOTIFICATION_CAPTURED"
        
        // Comprehensive set of Indian UPI Apps, Merchant Soundboxes, Wallets & Banking Apps
        private val TARGET_PACKAGES = setOf(
            // Primary UPI & Wallets
            "com.google.android.apps.nbu.paisa.user", // Google Pay
            "com.phonepe.app",                       // PhonePe User
            "com.phonepe.app.business",              // PhonePe Business / Merchant
            "net.one97.paytm",                       // Paytm User
            "com.paytm.business",                    // Paytm for Business / Soundbox
            "com.bharatpe.app",                      // BharatPe Merchant
            "com.mobikwik_new",                      // MobiKwik
            "com.mobikwik.merchant",                 // MobiKwik Merchant
            "in.org.npci.upiapp",                    // BHIM NPCI
            "in.amazon.mShop.android.shopping",      // Amazon Pay
            "com.amazon.mpay.merchant.android",      // Amazon Pay for Business
            "com.cred.android",                      // CRED
            "com.dreamplug.androidapp",              // CRED
            "com.freecharge.android",                // Freecharge
            "com.whatsapp",                          // WhatsApp Payments
            "com.whatsapp.w4b",                      // WhatsApp Business Payments
            "com.naviapps.mobile",                   // Navi UPI
            "com.fampay.in",                         // FamPay
            "com.jupiter.money",                     // Jupiter Money UPI
            "com.fi.money",                          // Fi Money UPI
            "com.myairtelapp",                       // Airtel Payments Bank / Thanks
            "com.tatadigital.tcp",                   // Tata Neu UPI

            // Major Indian Bank Mobile Banking & UPI Apps
            "com.hdfcbank.payzapp",                  // HDFC PayZapp
            "com.snapwork.hdfc",                     // HDFC MobileBanking
            "com.icicibank.imobile",                 // ICICI iMobile Pay
            "com.icicibank.pockets",                 // ICICI Pockets
            "com.sbi.upi",                           // SBI BHIM Pay
            "com.sbi.lotusintouch",                  // YONO SBI
            "com.axis.mobile",                       // Axis Mobile
            "com.axis.okaxis",                       // Axis Pay UPI
            "com.msf.kbank.mobile",                  // Kotak 811
            "com.bankofbaroda.mconnect",             // bob World
            "com.pnb.pnbone",                        // PNB ONE
            "com.canarabank.ai1",                    // Canara ai1
            "com.unionbank.augmentedbanking",        // Union Bank Vyom
            "com.indusind.indusmobile",              // IndusInd Mobile
            "com.idfcfirstbank.optimus",             // IDFC FIRST Bank
            "com.rblbank.mobank",                    // RBL MoBank
            "com.yesbank",                           // YES Bank Iris
            "com.aubank.au0101",                     // AU 0101
            "com.federalbank.fedmobile"              // Federal Bank FedMobile
        )
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "🟢 PayVia Notification Listener successfully CONNECTED to Android OS.")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "⚠️ PayVia Notification Listener DISCONNECTED. Requesting rebind...")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            requestRebind(ComponentName(this, PayViaNotificationListener::class.java))
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val rawPackageName = sbn.packageName ?: ""
        val packageName = rawPackageName.lowercase()
        val isPaymentApp = TARGET_PACKAGES.contains(rawPackageName) || 
                          packageName.contains("paisa") || 
                          packageName.contains("pay") || 
                          packageName.contains("upi") ||
                          packageName.contains("bank") ||
                          packageName.contains("wallet") ||
                          packageName.contains("money") ||
                          packageName.contains("merchant")

        if (!isPaymentApp) return

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        // 1. Extract all possible text fields
        val title = extras.getString(Notification.EXTRA_TITLE) 
            ?: extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() 
            ?: extras.getString(Notification.EXTRA_TITLE_BIG)
            ?: extras.getCharSequence(Notification.EXTRA_TITLE_BIG)?.toString()
            ?: ""

        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""
        val infoText = extras.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString() ?: ""
        val summaryText = extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString() ?: ""
        val ticker = notification.tickerText?.toString() ?: ""

        // Extract InboxStyle lines (if any)
        val linesArray = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        val linesText = linesArray?.joinToString(" ") { it.toString() } ?: ""

        // Build comprehensive message body containing all text so NO order ID or note is missed
        val messageParts = mutableListOf<String>()
        if (bigText.isNotEmpty()) messageParts.add(bigText)
        if (text.isNotEmpty() && text != bigText) messageParts.add(text)
        if (linesText.isNotEmpty()) messageParts.add(linesText)
        if (subText.isNotEmpty() && !messageParts.contains(subText)) messageParts.add(subText)
        if (infoText.isNotEmpty() && !messageParts.contains(infoText)) messageParts.add(infoText)
        if (summaryText.isNotEmpty() && !messageParts.contains(summaryText)) messageParts.add(summaryText)
        if (ticker.isNotEmpty() && !messageParts.contains(ticker)) messageParts.add(ticker)

        val combinedMessage = messageParts.joinToString(" ").trim()

        if (title.isEmpty() && combinedMessage.isEmpty()) return

        Log.d(TAG, "Captured Notification from [$rawPackageName]: Title='$title', Message='$combinedMessage'")

        // Acquire temporary WakeLock to guarantee background network dispatch during sleep
        val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PayVia::NotifWakeLock")
        wakeLock?.acquire(10000) // 10 seconds timeout

        thread {
            try {
                sendNotificationToBackend(rawPackageName, title, combinedMessage)
            } finally {
                if (wakeLock?.isHeld == true) {
                    wakeLock.release()
                }
            }
        }
    }

    private fun sendNotificationToBackend(packageName: String, title: String, message: String) {
        try {
            // Read credentials saved by Flutter SharedPreferences
            val flutterPrefs: SharedPreferences = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
            var serverUrl = flutterPrefs.getString("flutter.server_url", "https://payvia360.com") ?: "https://payvia360.com"
            if (serverUrl.isEmpty() || serverUrl.contains("192.168.") || serverUrl.contains("109.106.") || serverUrl.contains("localhost") || serverUrl.startsWith("http://")) {
                serverUrl = "https://payvia360.com"
            }
            
            // Device token fallback ensures payment notifications are NEVER dropped
            var deviceToken = flutterPrefs.getString("flutter.device_token", null)
            if (deviceToken.isNullOrEmpty()) {
                deviceToken = "dev_tok_991823abce1283"
            }

            val endpoint = if (serverUrl.endsWith("/")) "${serverUrl}api/devices/notification-ingest" else "$serverUrl/api/devices/notification-ingest"
            val url = URL(endpoint)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            conn.connectTimeout = 15000
            conn.readTimeout = 15000
            conn.doOutput = true

            val payload = JSONObject().apply {
                put("deviceToken", deviceToken)
                put("packageName", packageName)
                put("title", title)
                put("message", message)
                put("timestamp", System.currentTimeMillis())
            }

            OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val responseCode = conn.responseCode
            val responseBody = if (responseCode in 200..299) {
                conn.inputStream.bufferedReader().use { it.readText() }
            } else {
                conn.errorStream?.bufferedReader()?.use { it.readText() } ?: "Error $responseCode"
            }
            
            Log.i(TAG, "Backend Notification Ingest Response [$responseCode]: $responseBody")
            conn.disconnect()

            // Broadcast to MainActivity / Flutter UI so live activity displays on screen
            var isMatched = false
            var orderId: String? = null
            try {
                val json = JSONObject(responseBody)
                isMatched = json.optBoolean("matched", false)
                orderId = json.optString("orderId", null)
            } catch (_: Exception) {}

            val broadcastIntent = Intent(ACTION_NOTIFICATION_CAPTURED).apply {
                setPackage(this@PayViaNotificationListener.packageName)
                putExtra("packageName", packageName)
                putExtra("title", title)
                putExtra("message", message)
                putExtra("isMatched", isMatched)
                putExtra("orderId", orderId)
                putExtra("timestamp", System.currentTimeMillis())
            }
            sendBroadcast(broadcastIntent)

        } catch (e: Exception) {
            Log.e(TAG, "Error posting notification to backend: ${e.message}", e)
        }
    }
}
