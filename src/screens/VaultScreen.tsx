import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MagistrateCat } from '../components/MagistrateCat';
import { OptionPills, type PillOption } from '../components/OptionPills';
import { useMagistrateStore } from '../store/useMagistrateStore';
import { categoryAccent, categoryLabel, colors, radius } from '../theme';
import type { SavedFact } from '../types';

type VaultFilter = 'ALL' | 'GK_BD' | 'GK_INTL';

const FILTERS: PillOption<VaultFilter>[] = [
  { label: 'All', value: 'ALL' },
  { label: '🇧🇩 BD Affairs', value: 'GK_BD' },
  { label: '🌍 International', value: 'GK_INTL' },
];

const SWIPE_DELETE_DISTANCE = 110;

interface Props {
  onBack: () => void;
}

export function VaultScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const savedFacts = useMagistrateStore((s) => s.savedFacts);
  const removeSavedFact = useMagistrateStore((s) => s.removeSavedFact);
  const [filter, setFilter] = useState<VaultFilter>('ALL');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const visible = useMemo(
    () => (filter === 'ALL' ? savedFacts : savedFacts.filter((f) => f.category === filter)),
    [savedFacts, filter],
  );

  const remove = useCallback(
    (id: string) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      removeSavedFact(id);
    },
    [removeSavedFact],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" hitSlop={10} style={styles.back}>
          <Text style={styles.backLabel}>‹ Chambers</Text>
        </Pressable>
        <Text style={styles.title}>📌 Case Files</Text>
        <Text style={styles.subtitle}>
          {savedFacts.length} saved fact{savedFacts.length === 1 ? '' : 's'} · swipe left once memorised
        </Text>
        <OptionPills options={FILTERS} value={filter} onChange={setFilter} accent={colors.emerald} compact />
      </View>

      <FlatList
        data={visible}
        keyExtractor={(f) => f.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        renderItem={({ item }) => (
          <SwipeToDelete id={item.id} onDelete={remove}>
            <FactCard fact={item} onMemorised={() => remove(item.id)} />
          </SwipeToDelete>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MagistrateCat mood="sleepy" size={150} />
            <Text style={styles.emptyTitle}>No case files yet</Text>
            <Text style={styles.emptyBody}>
              Tap 📌 Save on any GK bubble during a session and it lands here for revision.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function FactCard({ fact, onMemorised }: { fact: SavedFact; onMemorised: () => void }) {
  const accent = categoryAccent[fact.category];
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={[styles.tag, { color: accent, borderColor: accent }]}>{categoryLabel[fact.category]}</Text>
        <Text style={styles.topic} numberOfLines={1}>
          {fact.topicTag}
        </Text>
      </View>
      <Text style={styles.text}>{fact.text}</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.date}>Saved {new Date(fact.savedAt).toLocaleDateString()}</Text>
        <Pressable
          onPress={onMemorised}
          accessibilityRole="button"
          accessibilityLabel="Mark as memorised and remove"
          hitSlop={8}
          style={({ pressed }) => [styles.memorised, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.memorisedLabel}>✓ Memorised</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SwipeToDelete({
  id,
  children,
  onDelete,
}: {
  id: string;
  children: ReactNode;
  onDelete: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const [x] = useState(() => new Animated.Value(0));

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => x.setValue(Math.min(0, g.dx)),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -SWIPE_DELETE_DISTANCE || g.vx < -0.8) {
            Animated.timing(x, { toValue: -width, duration: 180, useNativeDriver: true }).start(() => onDelete(id));
          } else {
            Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
          }
        },
        onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [x, width, id, onDelete],
  );

  return (
    <View style={styles.swipeWrap}>
      <View style={styles.swipeBg}>
        <Text style={styles.swipeBgLabel}>✓ Memorised</Text>
      </View>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...responder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backLabel: { color: colors.gold, fontSize: 17, fontWeight: '700' },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: 4 },
  list: { paddingHorizontal: 16, gap: 12 },
  swipeWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  swipeBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.emerald,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 20,
  },
  swipeBgLabel: { color: colors.bg, fontSize: 15, fontWeight: '800' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  topic: { flex: 1, color: colors.faint, fontSize: 12 },
  text: { color: colors.text, fontSize: 16, lineHeight: 24 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { color: colors.faint, fontSize: 12 },
  memorised: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 },
  memorisedLabel: { color: colors.emerald, fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 10, paddingHorizontal: 24 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  emptyBody: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
