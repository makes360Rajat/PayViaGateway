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
        
        // Known UPI and Payment App Package Names
        private val TARGET_PACKAGES = setOf(
            "com.google.android.apps.nbu.paisa.user", // Google Pay
            "com.phonepe.app",                       // PhonePe
            "net.one97.paytm",                       // Paytm
            "com.bharatpe.app",                      // BharatPe
            "in.org.npci.upiapp",                    // BHIM UPI
            "com.freecharge.android",                // Freecharge
            "com.cred.android",                      // CRED
            "com.mobikwik_new",                      // MobiKwik
            "com.msf.kbank.mobile",                  // Kotak
            "com.icicibank.imobile",                 // iMobile ICICI
            "com.sbi.upi",                           // SBI Pay
            "com.axis.mobile"                        // Axis Mobile
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName ?: ""
        val isPaymentApp = TARGET_PACKAGES.contains(packageName) || 
                          packageName.contains("paisa") || 
                          packageName.contains("pay") || 
                          packageName.contains("upi")

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
