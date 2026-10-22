import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MagistrateCat } from '../components/MagistrateCat';
import { OptionPills, type PillOption } from '../components/OptionPills';
import { SpeechBubble } from '../components/SpeechBubble';
import { useDndPermission } from '../hooks/useDndPermission';
import { isLockdownAvailable, openDndPermissionSettings } from '../services/nativeLockdown';
import { selectReadyCount, selectStudyMinutesToday, useMagistrateStore } from '../store/useMagistrateStore';
import { colors, radius } from '../theme';
import type { GKFilter, PetMessage } from '../types';
import { formatStudyTime } from '../utils/format';

const DURATIONS: PillOption<number>[] = [
  { label: '25m', value: 25 },
  { label: '45m', value: 45 },
  { label: '60m', value: 60 },
  { label: '90m', value: 90 },
];

const FILTERS: PillOption<GKFilter>[] = [
  { label: '🇧🇩 BD Only', value: 'BD' },
  { label: '🌍 Intl Only', value: 'INTL' },
  { label: '🔀 Both', value: 'BOTH' },
];

const INTERVALS: PillOption<number>[] = [
  { label: 'Every 5m', value: 5 },
  { label: 'Every 10m', value: 10 },
  { label: 'Tap Only', value: 0 },
];

function greetings(name: string): string[] {
  const who = name || 'future cadre';
  return [
    `Assalamu Alaikum, ${who}! Court is in session whenever you are. Phone ta amar kache joma dao.`,
    `${who}, the Magistrate has reviewed your case: verdict, aaj porte hobe. 🔨`,
    `Cha ready? Boi ready? Tahole ami-o ready. Choose your sentence below, ${who}.`,
    `Every BCS cadre once sat exactly where you are. Let's add one more session to the record.`,
  ];
}

interface Props {
  onOpenVault: () => void;
  onOpenSettings: () => void;
}

export function HomeScreen({ onOpenVault, onOpenSettings }: Props) {
  const insets = useSafeAreaInsets();
  const dndGranted = useDndPermission();

  const cousinName = useMagistrateStore((s) => s.cousinName);
  const apiKey = useMagistrateStore((s) => s.apiKey);
  const selectedDurationMins = useMagistrateStore((s) => s.selectedDurationMins);
  const gkFilter = useMagistrateStore((s) => s.gkFilter);
  const bubbleIntervalMins = useMagistrateStore((s) => s.bubbleIntervalMins);
  const savedCount = useMagistrateStore((s) => s.savedFacts.length);
  const todayMinutes = useMagistrateStore(selectStudyMinutesToday);
  const readyCount = useMagistrateStore(selectReadyCount);
  const updatePreferences = useMagistrateStore((s) => s.updatePreferences);
  const startSession = useMagistrateStore((s) => s.startSession);

  const lines = useMemo(() => greetings(cousinName.trim()), [cousinName]);
  const [greetingIndex, setGreetingIndex] = useState(() => Math.floor(Math.random() * lines.length));
  const greeting: PetMessage = {
    id: `greeting-${greetingIndex}`,
    category: 'MOTIVATION_WARM',
    topicTag: 'greeting',
    text: lines[greetingIndex % lines.length],
    petMood: 'nerd',
    createdAt: 0,
    source: 'local',
  };

  const begin = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void startSession();
  };

  const onStart = () => {
    if (isLockdownAvailable && !dndGranted) {
      Alert.alert(
        'Allow Call-Only mode?',
        'Give Magistrate Meow Do Not Disturb access so only phone calls ring during the session. Without it, notifications stay on.',
        [
          { text: 'Start anyway', style: 'cancel', onPress: begin },
          { text: 'Grant access', onPress: openDndPermissionSettings },
        ],
      );
      return;
    }
    begin();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <View style={styles.badges}>
          <Text style={styles.badge}>🔥 {formatStudyTime(todayMinutes)} today</Text>
          <Text style={styles.badge}>{apiKey && readyCount > 0 ? `⚡ ${readyCount} ready` : '📦 Offline pack'}</Text>
        </View>
        <View style={styles.iconRow}>
          <IconButton label="📌" a11y={`Case Files, ${savedCount} saved facts`} onPress={onOpenVault} />
          <IconButton label="⚙️" a11y="Settings" onPress={onOpenSettings} />
        </View>
      </View>

      <Text style={styles.title}>The Chambers</Text>

      <View style={styles.hero}>
        <SpeechBubble message={greeting} />
        <View style={styles.catWrap}>
          <MagistrateCat
            mood={todayMinutes >= 120 ? 'proud' : 'nerd'}
            size={190}
            cushion
            reactKey={greetingIndex}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setGreetingIndex((i) => (i + 1) % lines.length);
            }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Field label="Session length">
          <OptionPills
            options={DURATIONS}
            value={selectedDurationMins}
            onChange={(v) => updatePreferences({ selectedDurationMins: v })}
          />
        </Field>
        <Field label="GK focus">
          <OptionPills
            options={FILTERS}
            value={gkFilter}
            onChange={(v) => updatePreferences({ gkFilter: v })}
            accent={colors.emerald}
          />
        </Field>
        <Field label="Speech bubbles">
          <OptionPills
            options={INTERVALS}
            value={bubbleIntervalMins}
            onChange={(v) => updatePreferences({ bubbleIntervalMins: v })}
          />
        </Field>
      </View>

      {!apiKey && (
        <Pressable onPress={onOpenSettings} style={styles.hint} accessibilityRole="button">
          <Text style={styles.hintText}>
            Using the offline pack. Add a free Gemini key in ⚙️ Settings for fresh AI facts every session.
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={onStart}
        accessibilityRole="button"
        accessibilityHint="Pins the screen and silences everything except phone calls"
        style={({ pressed }) => [styles.start, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}
      >
        <Text style={styles.startLabel}>🔨 Start Court Session</Text>
        <Text style={styles.startSub}>Locks the phone for {selectedDurationMins} minutes</Text>
      </Pressable>
      <Text style={styles.footnote}>
        Android will ask to pin this screen: tap “Got it”. Calls still ring; everything else waits.
      </Text>
    </ScrollView>
  );
}

function IconButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.surfaceRaised }]}
    >
      <Text style={styles.iconLabel}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  badge: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  iconRow: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: { fontSize: 20 },
  title: { color: colors.gold, fontSize: 30, fontWeight: '900', letterSpacing: 0.3 },
  hero: { gap: 18 },
  catWrap: { alignItems: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
  },
  field: { gap: 8 },
  fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  hint: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.goldDim,
    padding: 12,
  },
  hintText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  start: {
    minHeight: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 2,
  },
  startLabel: { color: colors.bg, fontSize: 20, fontWeight: '900' },
  startSub: { color: '#422006', fontSize: 13, fontWeight: '600' },
  footnote: { color: colors.faint, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
