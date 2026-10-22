MAGISTRATE MEOW: PRODUCT & TECHNICAL SPECIFICATION
Subtitle: Tactical Study-Lock & BCS General Knowledge Companion App
Platform: Android (React Native + Expo Prebuild / Custom Native Modules)
Architecture: 100% Serverless, Offline-First Local Storage (MMKV) + Direct Gemini API
1. Executive Summary & Product Vision
1.1 Problem Statement
Preparing for the Bangladesh Civil Service (BCS) Preliminary and Written examinations requires memorizing vast amounts of General Knowledge (Bangladesh Affairs and International Affairs) from heavy reference guides (MP3, Professor’s, Oracle). Prolonged solo study sessions frequently lead to severe mental fatigue and frustration. When burnout hits, aspirants instinctively reach for their smartphones for a "quick 5-minute break," which easily spirals into hours of doomscrolling on social media.
1.2 Solution Overview
Magistrate Meow is a specialized "Tactical Study Hostage" utility built for a BCS aspirant. When a study session starts, the app locks the phone onto a single high-contrast screen using Android's native Screen Pinning API and switches the device into a Call-Only Do Not Disturb (DND) mode—blocking all social media notifications while allowing urgent family phone calls to ring through.
To combat study monotony, an animated desktop-style companion cat—Magistrate Meow—sits on the lock screen. Powered by the Gemini 2.5 Flash API via an offline-first batch-prefetching queue, the cat periodically pops speech bubbles containing either witty Banglish motivational roasts, warm encouragement, or high-yield BCS General Knowledge facts (filterable by Bangladesh or International Affairs).
2. Branding & Visual Identity
App Name: Magistrate Meow
Persona: A strict, scholarly, slightly dramatic, yet deeply supportive cat wearing black-rimmed glasses, a judicial collar, and holding a miniature gavel.
Color Palette (OLED Battery-Saving Dark Theme):
Primary Background (Courtroom Lock Screen): #0B0F17 (Deep Obsidian)
Secondary Surface (Cards & Speech Bubbles): #161F30 (Slate Navy)
Primary Accent (Gavel Gold): #F59E0B
Secondary Accent (BCS Emerald): #10B981
Text Primary: #F8FAFC
Text Muted: #94A3B8
Pet Sprite & Animation States (petMood):
nerd: Wearing square glasses, holding a tiny book (used for GK Fact delivery).
sassy: Arms crossed or tapping gavel impatiently (used for funny Banglish roasts).
excited: Paws up celebrating (used for milestones and streak completions).
sleepy: Wearing a nightcap / sipping cha (used for idle state or break mode).
proud: Wearing a crown or cool sunglasses (used when a study block completes).
3. Product Requirements Document (PRD)
Feature ID
Feature Name
Priority
Description & Acceptance Criteria
FR-01
Native Screen Pinning (Kiosk Lock)
P0 (Must)
Triggers Android startLockTask() on session start, disabling Home, Back, and Recents buttons until the timer expires or bailout is completed.
FR-02
Call-Only Do Not Disturb (DND)
P0 (Must)
Uses NotificationManager to mute all app pings/vibrations while permitting cellular voice calls (PRIORITY_CATEGORY_CALLS) to ring normally.
FR-03
Serverless Gemini Batch Prefetcher
P0 (Must)
Fetches 20–30 structured JSON items (GK facts + motivation lines) in a single gemini-2.5-flash call and caches them locally in MMKV.
FR-04
Interactive Pet & Speech Bubbles
P0 (Must)
Displays speech bubbles every N minutes (configurable) or immediately when the user taps the pet sprite, paired with subtle haptic feedback.
FR-05
GK Category Filter
P0 (Must)
Allows toggling between 🇧🇩 BD Affairs, 🌍 International Affairs, or 🔀 Mixed before or during a study session.
FR-06
Shame Bailout Anti-Cheat Modal
P0 (Must)
Prevents impulsive early exits by requiring the user to manually type a specific Banglish confession sentence (with copy-paste disabled) to unlock early.
FR-07
One-Tap Fact Bookmarking ("Case Files")
P1 (Should)
Adds a 📌 Save Fact button on every GK speech bubble so unfamiliar facts can be saved in 1 tap and reviewed after the session ends.
FR-08
OLED Auto-Dimmer & Keep-Awake
P1 (Should)
Keeps the screen awake (expo-keep-awake) on the study desk while dimming UI chrome after 60 seconds of inactivity to prevent battery drain.
FR-09
Post-Session "Cha Break" Mini-Quiz
P2 (Could)
Presents 3 rapid-fire MCQs at the end of a completed session based on the exact GK facts shown during that study block.

4. Screen Architecture & Navigation Flow
The application uses a flat 3-Screen Stack + 2 Modals architecture to minimize navigation friction:



Plaintext
[ App Launch ]
      │
      ├──► 1. Home / Setup Screen ("The Chambers")
      │         ├──► [Modal] Settings & Gemini API Key Configuration
      │         └──► 3. Saved Facts Vault Screen ("Case Files")
      │
      └──► 2. Active Lockdown Screen ("The Courtroom" - Pinned & DND Active)
                ├──► [Modal] Shame Bailout Prompt (Early Exit Verification)
                └──► [Modal] Session Complete / Cha Break Celebration


4.1 Screen 1: Home / Setup Screen ("The Chambers")
Header Bar: Displays daily study hours (🔥 3.5 hrs today), cached queue badge (⚡ 26 items ready), 📌 Case Files button, and ⚙️ Settings icon.
Hero Section: Animated Magistrate Meow sitting on a velvet cushion with a welcoming speech bubble.
Session Configuration Card:
Timer Duration Selector: [ 25m ] [ 45m ] [ 60m ] [ 90m ]
GK Focus Filter: [ 🇧🇩 BD Only ] [ 🌍 Intl Only ] [ 🔀 Both ]
Bubble Interval: [ Every 5m ] [ Every 10m ] [ Tap Only ]
Primary Action Button: 🔨 Start Court Session (Lock Phone)
4.2 Screen 2: Active Lockdown Screen ("The Courtroom")
Top Status Bar: Large monospace countdown timer (44:12) and active protection pill (🔒 Screen Pinned | 📞 Calls Only).
Center Stage:
Speech Bubble Card: Displays category tag (🇧🇩 BD GK / 🌍 INTL GK / 😼 ORDER IN THE COURT), message text, [ 📌 Save ] button, and [ 🎲 Next ] button.
Interactive Pet Canvas: Tapping the cat triggers a gavel/purr haptic vibration (expo-haptics), switches sprite animation according to petMood, and pulls the next item from the local queue.
Bottom Action: Low-opacity button [ 🏳️ Emergency Bailout ] which opens the anti-cheat modal.
4.3 Screen 3: Saved Facts Vault ("Case Files")
Filterable list (All, BD Affairs, International) of all bookmarked GK facts with swipe-to-delete once memorized.
5. State Management & Data Flow
The app uses Zustand paired with react-native-mmkv for synchronous, zero-latency local persistence.
5.1 TypeScript State Schema (src/store/useMagistrateStore.ts)



TypeScript
export type GKFilter = 'BD' | 'INTL' | 'BOTH';
export type PetMood = 'excited' | 'sassy' | 'sleepy' | 'proud' | 'nerd';
export type MessageCategory = 'GK_BD' | 'GK_INTL' | 'MOTIVATION_FUNNY' | 'MOTIVATION_WARM';

export interface PetMessage {
  id: string;
  category: MessageCategory;
  topicTag: string;
  text: string;
  petMood: PetMood;
  createdAt: number;
}

export interface MagistrateState {
  // User Preferences
  apiKey: string;
  cousinName: string;
  selectedDurationMins: number;
  gkFilter: GKFilter;
  bubbleIntervalMins: number;

  // Active Session Runtime
  isLockedDown: boolean;
  remainingSeconds: number;
  currentMessage: PetMessage | null;

  // Persistent Offline Storage (MMKV)
  messageQueue: PetMessage[];
  savedFacts: PetMessage[];
  recentTopicTags: string[]; // Prevents duplicate GK facts across Gemini calls
  totalStudyMinutesToday: number;

  // Actions
  startSession: () => Promise<void>;
  endSession: (completed: boolean) => Promise<void>;
  popNextMessage: () => void;
  bookmarkCurrentFact: () => void;
  removeSavedFact: (id: string) => void;
  replenishQueueIfLow: () => Promise<void>;
}


5.2 Offline-First Lifecycle Flow
Prefetch Check: On app launch (or when messageQueue.length < 10), the store checks network connectivity. If online, it invokes fetchMagistrateBatch(), passing the last 20 recentTopicTags so Gemini avoids repeating topics.
Offline Fallback: If Wi-Fi/mobile data is turned off, the queue seamlessly falls back to src/assets/fallback_bcs_pack.json (bundled with 100 curated BD & International BCS facts).
Lockdown Execution: Calling startSession() invokes the Kotlin bridge (LockdownModule.startLockdown()), activates KeepAwake, and starts the 1-second timer interval and speech bubble rotation interval.
Teardown: When remainingSeconds === 0 or the Shame Bailout phrase is verified, endSession() calls LockdownModule.stopLockdown(), restores normal ringer mode, and logs the completed minutes.
6. Technical Implementation Modules
6.1 Project Directory Structure



Plaintext
magistrate-meow/
├── android/
│   └── app/src/main/java/com/magistratemeow/
│       ├── LockdownModule.kt          # Native Screen Pinning + Call-Only DND
│       └── LockdownPackage.kt         # Registers the Kotlin Native Module
├── src/
│   ├── assets/
│   │   ├── sprites/                   # Lottie JSON / PNG Sprite animations
│   │   └── fallback_bcs_pack.json     # Offline starter GK & motivation dataset
│   ├── components/
│   │   ├── MagistrateCat.tsx          # Animated Pet + Tap Handler + Haptics
│   │   ├── SpeechBubble.tsx           # High-contrast bubble + Bookmark action
│   │   └── ShameBailoutModal.tsx      # Anti-cheat text verification modal
│   ├── services/
│   │   ├── geminiService.ts           # Serverless batch fetcher (gemini-2.5-flash)
│   │   └── nativeLockdown.ts          # TypeScript wrapper for LockdownModule
│   ├── store/
│   │   └── useMagistrateStore.ts      # Zustand + MMKV state store
│   └── screens/
│       ├── HomeScreen.tsx
│       ├── CourtroomScreen.tsx
│       └── VaultScreen.tsx
└── app.json


6.2 Native Android Bridge (LockdownModule.kt)
Required Permission in AndroidManifest.xml:
<uses-permission android:name="android.permission.ACCESS_NOTIFICATION_POLICY" />



Kotlin
package com.magistratemeow

import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LockdownModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "LockdownModule"

    @ReactMethod
    fun startLockdown(promise: Promise) {
        val activity: Activity? = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity not found")
            return
        }
        try {
            // 1. Pin Screen (Lock Task Mode)
            activity.startLockTask()

            // 2. Set Call-Only Do Not Disturb
            val nm = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (nm.isNotificationPolicyAccessGranted) {
                val policy = NotificationManager.Policy(
                    NotificationManager.Policy.PRIORITY_CATEGORY_CALLS or NotificationManager.Policy.PRIORITY_CATEGORY_REPEAT_CALLERS,
                    NotificationManager.Policy.PRIORITY_SENDERS_ANY,
                    0
                )
                nm.notificationPolicy = policy
                nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("LOCKDOWN_ERR", e.message)
        }
    }

    @ReactMethod
    fun stopLockdown(promise: Promise) {
        val activity: Activity? = currentActivity
        try {
            activity?.stopLockTask()
            val nm = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (nm.isNotificationPolicyAccessGranted) {
                nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UNLOCK_ERR", e.message)
        }
    }

    @ReactMethod
    fun requestDndPermission() {
        val nm = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (!nm.isNotificationPolicyAccessGranted) {
            val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
        }
    }
}


6.3 Serverless Gemini API Service (src/services/geminiService.ts)



TypeScript
export async function fetchMagistrateBatch(
  apiKey: string,
  cousinName: string,
  recentTopics: string[]
) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `
    You are "Magistrate Meow", a witty, slightly dramatic, yet deeply supportive cat helping ${cousinName} prepare for the Bangladesh Civil Service (BCS) Preliminary exam.
    Generate a JSON array of 20 unique speech bubble items:
    - 7 "GK_BD": High-yield Bangladesh Affairs (1971 Liberation War sectors/titles, Constitution articles, Rivers, Ancient Bengal, Economic Survey, GI products, Mega projects).
    - 7 "GK_INTL": High-yield International Affairs (UN agencies & HQs, Straits/Canals, Treaties, Geopolitics, Central Banks, Environmental Summits, Regional Blocs).
    - 3 "MOTIVATION_FUNNY": Funny Banglish/Bengali roasts about BCS prep, MP3 guides, dawat biryani, or relatives asking about exam dates.
    - 3 "MOTIVATION_WARM": Empathetic, grounding encouragement for a tired student studying all day.

    Do NOT repeat these recent topics: ${recentTopics.slice(-20).join(', ')}.
    Keep every "text" under 200 characters so it fits cleanly inside a mobile speech bubble.
  `;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              category: {
                type: 'STRING',
                enum: ['GK_BD', 'GK_INTL', 'MOTIVATION_FUNNY', 'MOTIVATION_WARM'],
              },
              topicTag: { type: 'STRING' },
              text: { type: 'STRING' },
              petMood: {
                type: 'STRING',
                enum: ['excited', 'sassy', 'sleepy', 'proud', 'nerd'],
              },
            },
            required: ['category', 'topicTag', 'text', 'petMood'],
          },
        },
      },
    }),
  });

  const data = await response.json();
  const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(rawJson || '[]');
}


7. 4-Day Execution & Sprint Plan
Day
Milestone
Key Engineering Tasks
Deliverable
Day 1
Scaffolding & Courtroom UI
Initialize Expo project (npx create-expo-app), run npx expo prebuild --platform android, install zustand, react-native-mmkv, lottie-react-native, expo-keep-awake, and expo-haptics. Build HomeScreen and CourtroomScreen UI.
Interactive prototype with animated pet & countdown timer.
Day 2
Native Lock & Call-Only DND
Implement LockdownModule.kt and register LockdownPackage.kt in MainApplication.kt. Add ACCESS_NOTIFICATION_POLICY permission. Build ShameBailoutModal.tsx with copy-paste disabled.
Phone pins screen and blocks notifications while letting phone calls ring.
Day 3
Gemini Engine & Offline Queue
Implement geminiService.ts with responseSchema. Connect Zustand queue auto-replenishment and create fallback_bcs_pack.json for zero-internet resilience.
Live AI-generated BCS GK facts and Banglish motivation bubbles.
Day 4
Vault, Polish & Release APK
Build VaultScreen.tsx for saved facts. Add secure API key modal (expo-secure-store). Run ./gradlew assembleRelease to compile the standalone APK.
Signed MagistrateMeow-v1.0.apk ready to share with your cousin.

Bonus: One-Command Python Script to Generate Magistrate_Meow_Plan.docx
If you want to generate the .docx file directly on your PC via terminal, run pip install python-docx and execute this script:



Python
from docx import Document
from docx.shared import Pt, RGBColor

doc = Document()

# Title
title = doc.add_heading('MAGISTRATE MEOW: PRODUCT & TECHNICAL SPECIFICATION', 0)
subtitle = doc.add_paragraph('Tactical Study-Lock & BCS General Knowledge Companion App\nPlatform: Android (React Native + Native Kotlin Bridge + Serverless Gemini API)')
subtitle.runs[0].italic = True

sections = [
    ("1. Executive Summary & Product Vision",
     "Magistrate Meow is a 'Tactical Study Hostage' utility built for a BCS aspirant. "
     "When a session starts, the app locks the phone onto a single high-contrast screen using Android Screen Pinning "
     "and switches the device into Call-Only Do Not Disturb (DND) mode—silencing social media notifications while allowing urgent phone calls to ring through.\n\n"
     "To relieve burnout from memorizing GK guides all day, an animated companion cat ('Magistrate Meow') sits on the lock screen. "
     "Powered by Gemini 2.5 Flash and local MMKV storage, the pet pops speech bubbles with witty Banglish roasts, warm encouragement, "
     "and high-yield BCS General Knowledge facts (Bangladesh & International Affairs)."),

    ("2. Core Functional Requirements (PRD)",
     "• FR-01 Native Screen Pinning (P0): Triggers Android startLockTask() to disable Home/Recents navigation.\n"
     "• FR-02 Call-Only DND (P0): Mutes app notifications while allowing PRIORITY_CATEGORY_CALLS.\n"
     "• FR-03 Serverless Gemini Batch Prefetcher (P0): Fetches 20 structured JSON items per API call into local MMKV cache.\n"
     "• FR-04 Interactive Pet & Speech Bubbles (P0): Rotates GK facts & motivation lines on a timer or on pet tap.\n"
     "• FR-05 GK Topic Filter (P0): Toggle between BD Affairs, International Affairs, or Mixed.\n"
     "• FR-06 Shame Bailout Modal (P0): Requires typing a Banglish confession phrase (copy-paste disabled) to unlock early.\n"
     "• FR-07 One-Tap Fact Bookmarking (P1): Save unfamiliar GK facts during lockdown to review in the Case Files Vault.\n"
     "• FR-08 OLED Auto-Dimmer (P1): Keeps screen awake on the desk while dimming background to pure black (#0B0F17)."),

    ("3. Screen Architecture",
     "1. Home / Setup Screen ('The Chambers'): Daily study streak, cached fact counter, duration pills (25m/45m/60m/90m), GK filter (BD/Intl/Both), Settings modal, and 'Start Court Session' button.\n"
     "2. Active Lockdown Screen ('The Courtroom'): Monospace countdown timer, active DND/Pin badge, high-contrast speech bubble with 'Save Fact' button, interactive Magistrate Meow sprite (moods: nerd, sassy, excited, sleepy, proud), and Emergency Bailout trigger.\n"
     "3. Saved Facts Vault ('Case Files'): Filterable review list of bookmarked BD & International GK facts."),

    ("4. State Flow & Serverless Gemini Strategy",
     "• Store: Zustand persisted with react-native-mmkv.\n"
     "• Batch Prefetching: Whenever messageQueue.length < 10 and the device is online, geminiService.ts calls gemini-2.5-flash with responseSchema to fetch 7 GK_BD, 7 GK_INTL, 3 MOTIVATION_FUNNY, and 3 MOTIVATION_WARM items.\n"
     "• Deduplication: Passes the last 20 recentTopicTags in the prompt so facts never repeat.\n"
     "• Offline Resilience: Falls back to bundled fallback_bcs_pack.json when Wi-Fi is off."),

    ("5. 4-Day Sprint Plan",
     "• Day 1 (Scaffolding & UI): Expo Prebuild for Android, Zustand + MMKV setup, Courtroom dark UI & Lottie/Sprite cat animations.\n"
     "• Day 2 (Native Lockdown Bridge): Implement LockdownModule.kt (startLockTask + NotificationManager Call-Only DND) & ShameBailoutModal.\n"
     "• Day 3 (Gemini Batch Engine): Wire up geminiService.ts with structured JSON output and offline fallback pack.\n"
     "• Day 4 (Vault & Release APK): Build Case Files Vault screen, secure API key input modal, and compile standalone release APK (./gradlew assembleRelease).")
]

for heading, body in sections:
    doc.add_heading(heading, level=1)
    doc.add_paragraph(body)

doc.save("Magistrate_Meow_Specification.docx")
print("Saved Magistrate_Meow_Specification.docx successfully!")


