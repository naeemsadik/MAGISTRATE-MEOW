# Magistrate Meow

A study-lock companion for BCS Preliminary prep. Starting a session pins the phone to one screen (Android screen pinning) and switches to Call-Only Do Not Disturb. Magistrate Meow, a cat in glasses and a judge's collar, pops speech bubbles with BCS GK facts (Bangladesh / International) and Banglish motivation. The full spec is in [plan.md](plan.md).

## Status against the 4-day plan

| Day | Scope | State |
| --- | --- | --- |
| 1 | Expo scaffold, Zustand + MMKV store, Home + Courtroom UI, animated cat | Done; verified in the web preview |
| 2 | Kotlin lockdown module (pinning + Call-Only DND), Shame Bailout modal | Done; **Kotlin not yet compiled**, needs a device test |
| 3 | Gemini batch prefetcher, offline queue, fallback pack | Done; parser/error handling covered by smoke tests, no live key tested |
| 4 | Case Files vault, SecureStore API key, Cha Break quiz, icons, release APK | Done except the APK build itself (no JDK / Android SDK on the dev machine yet) |

Checks run: `tsc` clean, ESLint clean, `expo-doctor` 20/20, Android JS bundle compiles (Hermes), `expo prebuild` generates the native project, all main flows driven end-to-end in a headless browser.

## Run it

```bash
npm install
npm run web              # UI preview in a browser (no lock/DND on web)
npx expo run:android     # dev build on a USB-connected phone (needs JDK 17 + Android SDK)
```

Expo Go **won't work**: the app has its own native module and uses MMKV.

### Build the shareable APK

**Locally** (needs JDK 17 and the Android SDK, e.g. via Android Studio; set `JAVA_HOME` and `ANDROID_HOME`):

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease     # Windows cmd: gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

The generated project signs release builds with the debug keystore. That's fine for sideloading to one phone, but updates must keep the same key. For a real release key, see [App signing](https://docs.expo.dev/guides/local-app-production/).

**In the cloud** (no local SDK; needs a free Expo account):

```bash
npx eas-cli@latest build -p android --profile preview   # outputs an installable .apk
```

## First run on the phone

1. ⚙️ Settings → paste a free Gemini key from [Google AI Studio](https://aistudio.google.com/apikey). Without one, bubbles come from the bundled offline pack (169 GK facts + 25 motivation lines).
2. Tap **Grant DND access** and enable Magistrate Meow in the system list. This allows Call-Only mode.
3. Start a session. Android shows **"Pin this app?"**: tap *Got it*. Home, Back and Recents are blocked until the timer ends or the Shame Bailout confession is typed.

## How it's built

```
modules/lockdown/          Local Expo module (Kotlin): startLockTask + Call-Only DND with save/restore
src/
  assets/fallback_bcs_pack.json   Offline facts, each GK fact with an MCQ for the Cha Break quiz
  components/              MagistrateCat (SVG, 5 moods), SpeechBubble, ShameBailoutModal, SettingsModal, SessionCompleteModal
  screens/                 HomeScreen ("The Chambers"), CourtroomScreen, VaultScreen ("Case Files")
  services/                geminiService, nativeLockdown, fallbackPack, apiKeyStore (SecureStore), storage (MMKV)
  store/useMagistrateStore.ts     Zustand + MMKV persistence
```

The session is stored as an absolute `endsAt` timestamp, so the timer survives JS throttling and app restarts. If Android kills the app mid-session, the next launch either resumes (re-pins and re-applies DND) or finishes the session and restores the phone.

## Deliberate differences from plan.md

| Plan | Implemented | Why |
| --- | --- | --- |
| `LockdownModule.kt` registered by hand in `MainApplication.kt` | Local Expo module in `modules/lockdown` | `expo prebuild` regenerates `android/`, which would wipe hand edits |
| DND off by forcing `INTERRUPTION_FILTER_ALL` | Saves the user's previous DND state and restores it | Ending a session shouldn't clobber the user's own DND setup. On Android 15+ the app only toggles its own DND rule |
| `gemini-2.5-flash`, key in the URL | `gemini-3.8-flash` (editable in Settings), key in the `x-goog-api-key` header | 2.5 Flash is now limited to keys that used it before; keys in URLs leak into logs |
| Lottie sprite animations | SVG cat with mood accessories, animated with RN `Animated` | No sprite assets exist yet; zero extra native deps |
| Cha Break MCQs (P2) generated at session end | Each GK fact carries its own MCQ (Gemini + offline pack) | Quiz works offline and tests exactly the facts shown |
| 100-fact fallback pack | 169 GK facts + 25 motivation lines | More variety before repeats |

## Known limitations

- **Screen pinning isn't a true kiosk.** Without device-owner provisioning, the user can unpin with the system gesture (hold Back + Overview). The Courtroom then shows "⚠️ Not pinned · tap to pin".
- **Copy-paste blocking is best-effort.** The confession field hides the context menu, disables suggestions, and rejects any input that grows by more than 2 characters at once.
- **AI facts can be wrong.** The prompt asks Gemini for well-established facts only, but verify anything surprising against a reference book before relying on it in the exam.
