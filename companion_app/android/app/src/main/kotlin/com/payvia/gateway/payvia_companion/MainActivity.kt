package com.payvia.gateway.payvia_companion

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.service.notification.NotificationListenerService
import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val METHOD_CHANNEL = "com.payvia.gateway/notifications"
    private val EVENT_CHANNEL = "com.payvia.gateway/live_stream"

    private var eventSink: EventChannel.EventSink? = null
    private var notifReceiver: BroadcastReceiver? = null

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // 1. MethodChannel for Permissions & Service Control
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, METHOD_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "isNotificationAccessGranted" -> {
                    val packageName = packageName
                    val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
                    val isGranted = flat != null && flat.contains(packageName)
                    result.success(isGranted)
                }
                "openNotificationAccessSettings" -> {
                    try {
                        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("UNAVAILABLE", "Cannot open notification settings", e.message)
                    }
                }
                "isBatteryOptimizationIgnored" -> {
                    val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
                    val isIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        powerManager?.isIgnoringBatteryOptimizations(packageName) ?: false
                    } else {
                        true
                    }
                    result.success(isIgnored)
                }
                "requestIgnoreBatteryOptimization" -> {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                                data = Uri.parse("package:$packageName")
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            startActivity(intent)
                        }
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("UNAVAILABLE", "Cannot request battery optimization ignore", e.message)
                    }
                }
                "rebindNotificationListener" -> {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                            val componentName = ComponentName(this, PayViaNotificationListener::class.java)
                            NotificationListenerService.requestRebind(componentName)
                        }
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("REBIND_FAILED", e.message, null)
                    }
                }
                else -> {
                    result.notImplemented()
                }
            }
        }

        // 2. EventChannel for Live Notification Feed in UI
        EventChannel(flutterEngine.dartExecutor.binaryMessenger, EVENT_CHANNEL).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                    eventSink = events
                    registerLiveNotifReceiver()
                }

                override fun onCancel(arguments: Any?) {
                    eventSink = null
                    unregisterLiveNotifReceiver()
                }
            }
        )
    }

    private fun registerLiveNotifReceiver() {
        if (notifReceiver == null) {
            notifReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    if (intent?.action == PayViaNotificationListener.ACTION_NOTIFICATION_CAPTURED) {
                        val data = mapOf(
                            "packageName" to (intent.getStringExtra("packageName") ?: ""),
                            "title" to (intent.getStringExtra("title") ?: ""),
                            "message" to (intent.getStringExtra("message") ?: ""),
                            "isMatched" to intent.getBooleanExtra("isMatched", false),
                            "orderId" to intent.getStringExtra("orderId"),
                            "timestamp" to intent.getLongExtra("timestamp", System.currentTimeMillis())
                        )
                        runOnUiThread {
                            eventSink?.success(data)
                        }
                    }
                }
            }
            val filter = IntentFilter(PayViaNotificationListener.ACTION_NOTIFICATION_CAPTURED)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(notifReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                registerReceiver(notifReceiver, filter)
            }
        }
    }

    private fun unregisterLiveNotifReceiver() {
        notifReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (_: Exception) {}
            notifReceiver = null
        }
    }

    override fun onDestroy() {
        unregisterLiveNotifReceiver()
        super.onDestroy()
    }
}
