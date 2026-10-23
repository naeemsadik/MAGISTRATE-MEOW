package expo.modules.lockdown

import android.app.ActivityManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Screen pinning (lock task) + Call-Only Do Not Disturb.
 *
 * DND restore strategy:
 * - Android 15+ (API 35) with targetSdk >= 35: setInterruptionFilter/setNotificationPolicy only
 *   toggle an implicit AutomaticZenRule owned by this app, so restoring is just switching it off.
 *   The user's own DND modes are never touched.
 * - Android 14 and below: the calls change global DND, so the previous filter + policy are saved
 *   to SharedPreferences (surviving process death) and restored on stop.
 */
class LockdownModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val notificationManager: NotificationManager
    get() = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private val prefs: SharedPreferences
    get() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  private val usesImplicitZenRule: Boolean
    get() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM &&
      context.applicationInfo.targetSdkVersion >= Build.VERSION_CODES.VANILLA_ICE_CREAM

  override fun definition() = ModuleDefinition {
    Name("Lockdown")

    Function("isDndPermissionGranted") {
      notificationManager.isNotificationPolicyAccessGranted
    }

    Function("openDndPermissionSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("getLockTaskState") {
      lockTaskState()
    }

    AsyncFunction("startLockdown") {
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()

      // Without device-owner whitelisting this shows the system "Pin this app?" prompt.
      // The user may decline; JS polls getLockTaskState() to reflect the real state.
      val pinRequested = try {
        if (lockTaskState() == STATE_NONE) activity.startLockTask()
        true
      } catch (e: Exception) {
        false
      }

      mapOf(
        "pinRequested" to pinRequested,
        "dndActive" to applyCallOnlyDnd()
      )
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("stopLockdown") {
      appContext.currentActivity?.let { activity ->
        try {
          if (lockTaskState() != STATE_NONE) activity.stopLockTask()
        } catch (e: Exception) {
          // Not in lock task mode, or pinned by another task — nothing to undo.
        }
      }
      restoreDnd()
    }.runOnQueue(Queues.MAIN)
  }

  private fun lockTaskState(): String {
    val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    return when (am.lockTaskModeState) {
      ActivityManager.LOCK_TASK_MODE_PINNED -> STATE_PINNED
      ActivityManager.LOCK_TASK_MODE_LOCKED -> STATE_LOCKED
      else -> STATE_NONE
    }
  }

  private fun applyCallOnlyDnd(): Boolean {
    val nm = notificationManager
    if (!nm.isNotificationPolicyAccessGranted) return false

    // Only snapshot once: if a session is resumed after process death, the saved
    // state is still the user's real pre-session state, not our call-only policy.
    if (!usesImplicitZenRule && !prefs.contains(KEY_FILTER)) {
      val prev = nm.notificationPolicy
      val editor = prefs.edit()
        .putInt(KEY_FILTER, nm.currentInterruptionFilter)
        .putInt(KEY_CATEGORIES, prev.priorityCategories)
        .putInt(KEY_CALL_SENDERS, prev.priorityCallSenders)
        .putInt(KEY_MESSAGE_SENDERS, prev.priorityMessageSenders)
        .putInt(KEY_VISUAL_EFFECTS, prev.suppressedVisualEffects)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        editor.putInt(KEY_CONVERSATION_SENDERS, prev.priorityConversationSenders)
      }
      editor.commit()
    }

    // Visual suppression only applies to notifications DND blocks; allowed calls still ring and show.
    val suppressed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      NotificationManager.Policy.SUPPRESSED_EFFECT_PEEK or
        NotificationManager.Policy.SUPPRESSED_EFFECT_LIGHTS or
        NotificationManager.Policy.SUPPRESSED_EFFECT_FULL_SCREEN_INTENT or
        NotificationManager.Policy.SUPPRESSED_EFFECT_AMBIENT
    } else {
      0
    }

    nm.notificationPolicy = buildPolicy(
      categories = NotificationManager.Policy.PRIORITY_CATEGORY_CALLS or
        NotificationManager.Policy.PRIORITY_CATEGORY_REPEAT_CALLERS,
      callSenders = NotificationManager.Policy.PRIORITY_SENDERS_ANY,
      messageSenders = NotificationManager.Policy.PRIORITY_SENDERS_ANY,
      visualEffects = suppressed,
      conversationSenders = CONVERSATION_SENDERS_NONE
    )
    nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
    return true
  }

  private fun restoreDnd() {
    val nm = notificationManager
    if (!nm.isNotificationPolicyAccessGranted) {
      prefs.edit().clear().commit()
      return
    }

    if (usesImplicitZenRule) {
      // Deactivates only this app's implicit rule.
      nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
      return
    }

    if (!prefs.contains(KEY_FILTER)) return

    nm.notificationPolicy = buildPolicy(
      categories = prefs.getInt(KEY_CATEGORIES, 0),
      callSenders = prefs.getInt(KEY_CALL_SENDERS, NotificationManager.Policy.PRIORITY_SENDERS_ANY),
      messageSenders = prefs.getInt(KEY_MESSAGE_SENDERS, NotificationManager.Policy.PRIORITY_SENDERS_ANY),
      visualEffects = prefs.getInt(KEY_VISUAL_EFFECTS, 0),
      conversationSenders = prefs.getInt(KEY_CONVERSATION_SENDERS, CONVERSATION_SENDERS_NONE)
    )
    val previousFilter = prefs.getInt(KEY_FILTER, NotificationManager.INTERRUPTION_FILTER_ALL)
    nm.setInterruptionFilter(
      if (previousFilter == NotificationManager.INTERRUPTION_FILTER_UNKNOWN) {
        NotificationManager.INTERRUPTION_FILTER_ALL
      } else {
        previousFilter
      }
    )
    prefs.edit().clear().commit()
  }

  private fun buildPolicy(
    categories: Int,
    callSenders: Int,
    messageSenders: Int,
    visualEffects: Int,
    conversationSenders: Int
  ): NotificationManager.Policy =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      NotificationManager.Policy(categories, callSenders, messageSenders, visualEffects, conversationSenders)
    } else {
      NotificationManager.Policy(categories, callSenders, messageSenders, visualEffects)
    }

  companion object {
    private const val PREFS_NAME = "magistrate_lockdown"
    private const val KEY_FILTER = "prev_filter"
    private const val KEY_CATEGORIES = "prev_categories"
    private const val KEY_CALL_SENDERS = "prev_call_senders"
    private const val KEY_MESSAGE_SENDERS = "prev_message_senders"
    private const val KEY_VISUAL_EFFECTS = "prev_visual_effects"
    private const val KEY_CONVERSATION_SENDERS = "prev_conversation_senders"

    // Compile-time constant (API 30); only passed to the 5-arg Policy constructor on R+.
    private const val CONVERSATION_SENDERS_NONE = NotificationManager.Policy.CONVERSATION_SENDERS_NONE

    private const val STATE_NONE = "none"
    private const val STATE_PINNED = "pinned"
    private const val STATE_LOCKED = "locked"
  }
}
