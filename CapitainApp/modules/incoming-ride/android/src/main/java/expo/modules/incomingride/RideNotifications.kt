package expo.modules.incomingride

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

// Demande de course affichée comme un appel entrant : plein écran téléphone verrouillé,
// bandeau prioritaire sinon, sonnerie répétée jusqu'à la réponse ou l'expiration.
data class RideOffer(
  val rideId: String,
  val title: String,
  val body: String,
  val openUrl: String,    // ouvre l'app sur la demande (toucher l'écran / le bandeau)
  val acceptUrl: String,  // ouvre l'app et accepte la course
  val acceptLabel: String,
  val rejectLabel: String,
  val timeoutMs: Long,
)

object RideNotifications {
  // Changer l'identifiant si le son ou l'importance change : Android fige un canal une fois créé
  private const val CHANNEL_ID = "ride_offers_v1"
  const val PREFS = "incoming_ride"
  const val EXTRA_RIDE_ID = "rideId"

  fun notificationId(rideId: String): Int = rideId.hashCode()

  fun show(context: Context, offer: RideOffer) {
    ensureChannel(context)
    val open = activityIntent(context, offer.openUrl, offer.rideId.hashCode())
    val accept = activityIntent(context, offer.acceptUrl, offer.rideId.hashCode() + 1)
    val reject = PendingIntent.getBroadcast(
      context,
      offer.rideId.hashCode() + 2,
      Intent(context, RideOfferActionReceiver::class.java).putExtra(EXTRA_RIDE_ID, offer.rideId),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(smallIcon(context))
      .setContentTitle(offer.title)
      .setContentText(offer.body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(offer.body))
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(true)
      .setTimeoutAfter(offer.timeoutMs)
      .setContentIntent(open)
      .setFullScreenIntent(open, true)
      .addAction(0, offer.rejectLabel, reject)
      .addAction(0, offer.acceptLabel, accept)
      .setSound(soundUri(context))                 // Android < 8 (sinon : son du canal)
      .setVibrate(VIBRATION)
      .build()
    notification.flags = notification.flags or Notification.FLAG_INSISTENT // sonnerie en boucle

    try {
      NotificationManagerCompat.from(context).notify(notificationId(offer.rideId), notification)
    } catch (_: SecurityException) {
      // Notifications refusées par le capitaine : rien à afficher
    }
  }

  fun cancel(context: Context, rideId: String) {
    NotificationManagerCompat.from(context).cancel(notificationId(rideId))
  }

  private val VIBRATION = longArrayOf(0, 600, 400, 600, 400, 600)

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Nouvelles courses", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Demandes de course à accepter ou refuser"
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      enableVibration(true)
      vibrationPattern = VIBRATION
      setSound(
        soundUri(context),
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
    }
    manager.createNotificationChannel(channel)
  }

  // Sonnerie de l'app (res/raw/new_ride, copiée par le plugin expo-notifications), sinon celle du téléphone
  private fun soundUri(context: Context): Uri {
    val id = context.resources.getIdentifier("new_ride", "raw", context.packageName)
    return if (id != 0) Uri.parse("android.resource://${context.packageName}/$id")
    else RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
  }

  private fun smallIcon(context: Context): Int {
    val id = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (id != 0) id else context.applicationInfo.icon
  }

  private fun activityIntent(context: Context, url: String, requestCode: Int): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(
      context, requestCode, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
