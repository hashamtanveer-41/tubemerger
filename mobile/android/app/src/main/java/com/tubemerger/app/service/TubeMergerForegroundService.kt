package com.tubemerger.app.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.tubemerger.app.theme.AppColors

/**
 * Android Foreground Service (SOLID - Single Responsibility Principle)
 * Sole responsibility: Android OS lifecycle survival, WakeLock, and persistent notification.
 * Contains no business logic.
 */
class TubeMergerForegroundService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null

    companion object {
        const val CHANNEL_ID = "tubemerger_merge_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.tubemerger.app.START_MERGE"
        const val ACTION_STOP = "com.tubemerger.app.STOP_MERGE"
        const val EXTRA_PROGRESS_PERCENT = "extra_progress"
        const val EXTRA_CURRENT_TITLE = "extra_current_title"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        acquireWakeLock()
    }

    private var isStarted = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                isStarted = false
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
            else -> {
                val percent = intent?.getIntExtra(EXTRA_PROGRESS_PERCENT, 0) ?: 0
                val title = intent?.getStringExtra(EXTRA_CURRENT_TITLE) ?: "Processing video merge..."
                val notification = buildNotification(title, percent)
                if (isStarted) {
                    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    manager.notify(NOTIFICATION_ID, notification)
                } else {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
                    } else {
                        startForeground(NOTIFICATION_ID, notification)
                    }
                    isStarted = true
                }
            }
        }
        return START_NOT_STICKY
    }

    private fun buildNotification(contentText: String, progressPercent: Int): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("TubeMerger Active")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setColor(android.graphics.Color.parseColor(AppColors.BRAND_RED))
            .setProgress(100, progressPercent, progressPercent == 0)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "TubeMerger Background Processing",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows real-time progress for active video downloads and merges."
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "TubeMerger::EncodingWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(1000 * 60 * 60) // Max 60 mins safety timeout
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
