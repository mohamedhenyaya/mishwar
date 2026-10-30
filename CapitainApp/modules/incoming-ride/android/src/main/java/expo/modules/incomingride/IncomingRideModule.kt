package expo.modules.incomingride

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.view.WindowManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Pont JS ↔ Android pour l'écran « Nouvelle course » façon appel entrant
class IncomingRideModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("Contexte Android indisponible")

  override fun definition() = ModuleDefinition {
    Name("IncomingRide")

    // App ouverte par l'écran d'appel : elle doit s'afficher par-dessus l'écran verrouillé
    OnCreate { showOverLockScreenIfRide(appContext.currentActivity?.intent) }
    OnActivityEntersForeground { showOverLockScreenIfRide(appContext.currentActivity?.intent) }
    OnNewIntent { intent -> showOverLockScreenIfRide(intent) }

    // Adresse de l'API et jeton, utilisés par le bouton « Refuser » quand l'app est fermée
    Function("configure") { apiBaseUrl: String, token: String? ->
      context.getSharedPreferences(RideNotifications.PREFS, Context.MODE_PRIVATE).edit()
        .putString("apiBaseUrl", apiBaseUrl)
        .putString("token", token)
        .apply()
    }

    Function("show") { offer: Map<String, Any?> ->
      RideNotifications.show(
        context,
        RideOffer(
          rideId      = offer["rideId"] as String,
          title       = offer["title"] as String,
          body        = offer["body"] as String,
          openUrl     = offer["openUrl"] as String,
          acceptUrl   = offer["acceptUrl"] as String,
          acceptLabel = offer["acceptLabel"] as String,
          rejectLabel = offer["rejectLabel"] as String,
          timeoutMs   = (offer["timeoutMs"] as? Number)?.toLong() ?: 60_000L,
        ),
      )
    }

    Function("cancel") { rideId: String -> RideNotifications.cancel(context, rideId) }

    // Demande traitée : l'app ne s'affiche plus par-dessus l'écran verrouillé
    Function("releaseLockScreen") {
      val activity = appContext.currentActivity ?: return@Function null
      activity.runOnUiThread {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
          activity.setShowWhenLocked(false)
          activity.setTurnScreenOn(false)
        } else {
          @Suppress("DEPRECATION")
          activity.window.clearFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
          )
        }
      }
    }

    // Android 14+ : l'écran plein écran doit être autorisé par le capitaine dans les réglages
    Function("canUseFullScreenIntent") {
      if (Build.VERSION.SDK_INT < 34) return@Function true
      context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
    }

    Function("openFullScreenIntentSettings") {
      if (Build.VERSION.SDK_INT >= 34) {
        openSettings(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${context.packageName}")))
      }
    }

    // Sans exemption, certains téléphones tuent l'app et les demandes n'arrivent plus
    Function("isIgnoringBatteryOptimizations") {
      context.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(context.packageName)
    }

    Function("requestIgnoreBatteryOptimizations") {
      openSettings(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}")))
    }
  }

  private fun openSettings(intent: Intent) {
    try {
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: Exception) {
      context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }
  }

  private fun showOverLockScreenIfRide(intent: Intent?) {
    if (intent?.data?.host != "ride") return
    val activity = appContext.currentActivity ?: return
    activity.runOnUiThread {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        activity.setShowWhenLocked(true)
        activity.setTurnScreenOn(true)
      } else {
        @Suppress("DEPRECATION")
        activity.window.addFlags(
          WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
        )
      }
    }
  }
}
