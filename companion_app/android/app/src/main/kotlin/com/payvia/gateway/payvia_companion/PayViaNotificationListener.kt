package com.payvia.gateway.payvia_companion

import android.app.Notification
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
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

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName?.lowercase() ?: ""
        val isPaymentApp = TARGET_PACKAGES.contains(sbn.packageName) || 
                          packageName.contains("paisa") || 
                          packageName.contains("pay") || 
                          packageName.contains("upi") ||
                          packageName.contains("bank") ||
                          packageName.contains("wallet") ||
                          packageName.contains("money") ||
                          packageName.contains("merchant")

        if (!isPaymentApp) return

        val extras = sbn.notification?.extras ?: return
        val title = extras.getString(Notification.EXTRA_TITLE) ?: extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""

        val combinedMessage = when {
            bigText.isNotEmpty() -> bigText
            text.isNotEmpty() -> text
            else -> subText
        }

        if (title.isEmpty() && combinedMessage.isEmpty()) return

        Log.d(TAG, "Captured Notification from [$packageName]: Title='$title', Message='$combinedMessage'")

        // Forward in background thread to PayVia backend
        thread {
            sendNotificationToBackend(packageName, title, combinedMessage)
        }
    }

    private fun sendNotificationToBackend(packageName: String, title: String, message: String) {
        try {
            // Read credentials saved by Flutter SharedPreferences
            val flutterPrefs: SharedPreferences = getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
            val serverUrl = flutterPrefs.getString("flutter.server_url", "https://payvia360.com") ?: "https://payvia360.com"
            val deviceToken = flutterPrefs.getString("flutter.device_token", null)

            if (deviceToken.isNullOrEmpty()) {
                Log.w(TAG, "Device token not configured in SharedPreferences. Skipping forwarding.")
                return
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
            val responseBody = conn.inputStream.bufferedReader().use { it.readText() }
            Log.i(TAG, "Backend Notification Ingest Response [$responseCode]: $responseBody")
            conn.disconnect()
        } catch (e: Exception) {
            Log.e(TAG, "Error posting notification to backend: ${e.message}", e)
        }
    }
}
