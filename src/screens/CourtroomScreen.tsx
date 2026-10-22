import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MagistrateCat } from '../components/MagistrateCat';
import { OptionPills, type PillOption } from '../components/OptionPills';
import { ShameBailoutModal } from '../components/ShameBailoutModal';
import { SpeechBubble } from '../components/SpeechBubble';
import { getLockTaskState, isLockdownAvailable, type LockTaskState } from '../services/nativeLockdown';
import { useMagistrateStore } from '../store/useMagistrateStore';
import { colors, fonts, radius } from '../theme';
import type { GKFilter } from '../types';
import { formatClock } from '../utils/format';

const DIM_AFTER_MS = 60_000;

const FILTERS: PillOption<GKFilter>[] = [
  { label: '🇧🇩 BD', value: 'BD' },
  { label: '🌍 Intl', value: 'INTL' },
  { label: '🔀 Both', value: 'BOTH' },
];

const HALFWAY_LINES = [
  'Halfway there! Adhek shesh, ar adhek baki. Magistrate is impressed. 🎉',
  'Order in the court: you just crossed the halfway mark. Keep that pace!',
  'Ordhek session done! Ekhon thamle hobe na, cadre-to-be.',
];

export function CourtroomScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const session = useMagistrateStore((s) => s.session);
  const currentMessage = useMagistrateStore((s) => s.currentMessage);
  const dndActive = useMagistrateStore((s) => s.dndActive);
  const gkFilter = useMagistrateStore((s) => s.gkFilter);
  const isSaved = useMagistrateStore((s) => s.savedFacts.some((f) => f.id === s.currentMessage?.id));
  const popNextMessage = useMagistrateStore((s) => s.popNextMessage);
  const bookmarkCurrentFact = useMagistrateStore((s) => s.bookmarkCurrentFact);
  const updatePreferences = useMagistrateStore((s) => s.updatePreferences);
  const reengageLockdown = useMagistrateStore((s) => s.reengageLockdown);
  const endSession = useMagistrateStore((s) => s.endSession);

  const [now, setNow] = useState(Date.now);
  const [lockState, setLockState] = useState<LockTaskState>(getLockTaskState);
  const [bailoutOpen, setBailoutOpen] = useState(false);

  // Timing refs are seeded on mount (see the tick effect) so a resumed session starts fresh.
  const lastBubbleAt = useRef(0);
  const halfwayShown = useRef(true);

  // OLED auto-dimmer: chrome fades after a minute without touches; any touch or new bubble wakes it.
  const [brightness] = useState(() => new Animated.Value(1));
  const lastActivity = useRef(0);
  const dimmed = useRef(false);
  const wake = () => {
    lastActivity.current = Date.now();
    if (dimmed.current) {
      dimmed.current = false;
      Animated.timing(brightness, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  };

  const showNext = () => {
    lastBubbleAt.current = Date.now();
    popNextMessage();
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const mountedAt = Date.now();
    lastBubbleAt.current = mountedAt;
    lastActivity.current = mountedAt;
    const initial = useMagistrateStore.getState().session;
    // Don't replay the halfway cheer when resuming a session that already passed it.
    halfwayShown.current = initial
      ? mountedAt - initial.startedAt >= (initial.endsAt - initial.startedAt) / 2
      : true;

    const tick = () => {
      const t = Date.now();
      setNow(t);
      setLockState(getLockTaskState());

      const s = useMagistrateStore.getState();
      if (!s.session) return;
      if (t >= s.session.endsAt) {
        void s.endSession(true);
        return;
      }

      const half = s.session.startedAt + (s.session.endsAt - s.session.startedAt) / 2;
      if (!halfwayShown.current && t >= half) {
        halfwayShown.current = true;
        lastBubbleAt.current = t;
        s.showLocalMessage({
          category: 'MOTIVATION_WARM',
          petMood: 'excited',
          text: HALFWAY_LINES[Math.floor(Math.random() * HALFWAY_LINES.length)],
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        wake();
      } else if (s.bubbleIntervalMins > 0 && t - lastBubbleAt.current >= s.bubbleIntervalMins * 60_000) {
        lastBubbleAt.current = t;
        s.popNextMessage();
        void Haptics.selectionAsync();
        wake();
      }

      if (!dimmed.current && t - lastActivity.current >= DIM_AFTER_MS) {
        dimmed.current = true;
        Animated.timing(brightness, { toValue: 0, duration: 1200, useNativeDriver: true }).start();
      }
    };

    const interval = setInterval(tick, 1000);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) return null;

  const remainingSec = Math.max(0, (session.endsAt - now) / 1000);
  const progress = Math.min(1, Math.max(0, (now - session.startedAt) / (session.endsAt - session.startedAt)));
  const chromeOpacity = brightness.interpolate({ inputRange: [0, 1], outputRange: [0.12, 1] });
  const contentOpacity = brightness.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const pinned = lockState !== 'none';

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}
      onStartShouldSetResponderCapture={() => {
        wake();
        return false;
      }}
    >
      <StatusBar hidden />

      <Animated.View style={[styles.top, { opacity: chromeOpacity }]}>
        <Text style={styles.timer} accessibilityRole="timer" accessibilityLabel={`${formatClock(remainingSec)} remaining`}>
          {formatClock(remainingSec)}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.pills}>
          {!isLockdownAvailable ? (
            <StatusPill text="👀 Preview: no lock on this platform" tone="muted" />
          ) : pinned ? (
            <StatusPill text="🔒 Screen Pinned" tone="good" />
          ) : (
            <StatusPill text="⚠️ Not pinned · tap to pin" tone="warn" onPress={() => void reengageLockdown()} />
          )}
          {isLockdownAvailable && (
            <StatusPill text={dndActive ? '📞 Calls Only' : '🔔 Notifications on'} tone={dndActive ? 'good' : 'muted'} />
          )}
        </View>
      </Animated.View>

      <Animated.View style={[styles.stage, { opacity: contentOpacity }]}>
        <SpeechBubble
          message={currentMessage}
          isSaved={isSaved}
          onSave={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            bookmarkCurrentFact();
          }}
          onNext={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            showNext();
          }}
        />
        <MagistrateCat
          mood={currentMessage?.petMood ?? 'sleepy'}
          size={176}
          reactKey={currentMessage?.id}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            showNext();
          }}
        />
      </Animated.View>

      <Animated.View style={[styles.bottom, { opacity: chromeOpacity }]}>
        <OptionPills
          options={FILTERS}
          value={gkFilter}
          onChange={(v) => updatePreferences({ gkFilter: v })}
          accent={colors.emerald}
          compact
        />
        <Pressable
          onPress={() => setBailoutOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.bailout, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.bailoutLabel}>🏳️ Emergency Bailout</Text>
        </Pressable>
      </Animated.View>

      <ShameBailoutModal
        visible={bailoutOpen}
        onCancel={() => setBailoutOpen(false)}
        onConfirm={() => {
          setBailoutOpen(false);
          void endSession(false);
        }}
      />
    </View>
  );
}

function StatusPill({
  text,
  tone,
  onPress,
}: {
  text: string;
  tone: 'good' | 'warn' | 'muted';
  onPress?: () => void;
}) {
  const color = tone === 'good' ? colors.emerald : tone === 'warn' ? colors.gold : colors.muted;
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'}>
      <Text style={[styles.pill, { color, borderColor: color }]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, justifyContent: 'space-between' },
  top: { alignItems: 'center', gap: 10 },
  timer: {
    color: colors.gold,
    fontFamily: fonts.mono,
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: colors.gold },
  pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  pill: {
    fontSize: 13,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  stage: { alignItems: 'center', gap: 18 },
  bottom: { gap: 14 },
  bailout: {
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
    opacity: 0.45,
  },
  bailoutLabel: { color: colors.muted, fontSize: 14, fontWeight: '600' },
});
