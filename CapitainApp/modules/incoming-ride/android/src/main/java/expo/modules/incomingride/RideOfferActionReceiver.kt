package expo.modules.incomingride

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

// « Refuser » sur l'écran d'appel : ferme l'écran puis envoie POST /rides/:id/reject,
// sans ouvrir l'app (adresse de l'API et jeton enregistrés par IncomingRide.configure).
class RideOfferActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val rideId = intent.getStringExtra(RideNotifications.EXTRA_RIDE_ID) ?: return
    RideNotifications.cancel(context, rideId)

    val prefs = context.getSharedPreferences(RideNotifications.PREFS, Context.MODE_PRIVATE)
    val apiBaseUrl = prefs.getString("apiBaseUrl", null) ?: return
    val token = prefs.getString("token", null) ?: return

    val pending = goAsync()
    thread {
      try {
        val connection = URL("$apiBaseUrl/rides/$rideId/reject").openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.connectTimeout = 8_000
        connection.readTimeout = 8_000
        connection.doOutput = true
        connection.setRequestProperty("Authorization", "Bearer $token")
        connection.setRequestProperty("Content-Type", "application/json")
        connection.outputStream.use { it.write("{}".toByteArray()) }
        connection.responseCode // envoie la requête ; le résultat importe peu (course peut-être déjà prise)
        connection.disconnect()
      } catch (_: Exception) {
        // réseau indisponible : la demande expirera côté serveur
      } finally {
        pending.finish()
      }
    }
  }
}
