package com.tubemerger.app

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(com.tubemerger.app.bridge.TubeMergerPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)

    // Phase 1: Initialize native yt-dlp & FFmpeg media engine
    Thread {
      try {
        com.yausername.youtubedl_android.YoutubeDL.getInstance().init(this)
        com.yausername.ffmpeg.FFmpeg.getInstance().init(this)
        android.util.Log.i("TubeMerger", "Native YoutubeDL and FFmpeg engine initialized successfully.")
      } catch (e: Exception) {
        android.util.Log.e("TubeMerger", "Failed to initialize YoutubeDL: ${e.message}", e)
      }
    }.start()
  }
}
