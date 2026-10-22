import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryAccent, categoryLabel, colors, radius } from '../theme';
import { isGkMessage, type PetMessage } from '../types';

interface Props {
  message: PetMessage | null;
  isSaved?: boolean;
  onSave?: () => void;
  onNext?: () => void;
  /** Shown when there is no message yet. */
  placeholder?: string;
}

export function SpeechBubble({ message, isSaved = false, onSave, onNext, placeholder }: Props) {
  const [enter] = useState(() => new Animated.Value(1));

  useEffect(() => {
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
  }, [message?.id, enter]);

  const animatedStyle = {
    opacity: enter,
    transform: [
      { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
      { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
    ],
  };

  if (!message) {
    return (
      <Animated.View style={[styles.bubble, animatedStyle]}>
        <Text style={styles.placeholder}>{placeholder ?? 'Tap Magistrate Meow for a fact.'}</Text>
        <View style={styles.tail} />
      </Animated.View>
    );
  }

  const gk = isGkMessage(message);
  const accent = categoryAccent[message.category];

  return (
    <Animated.View style={[styles.bubble, animatedStyle]} accessibilityLiveRegion="polite">
      <View style={styles.tagRow}>
        <Text style={[styles.tag, { color: accent, borderColor: accent }]}>{categoryLabel[message.category]}</Text>
        {gk && message.topicTag ? (
          <Text style={styles.topic} numberOfLines={1}>
            {message.topicTag}
          </Text>
        ) : null}
      </View>

      <Text style={styles.text}>{message.text}</Text>

      {(onSave || onNext) && (
        <View style={styles.actions}>
          {gk && onSave && (
            <Pressable
              onPress={onSave}
              disabled={isSaved}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? 'Fact saved to Case Files' : 'Save fact to Case Files'}
              style={({ pressed }) => [styles.action, isSaved && styles.actionDone, pressed && styles.pressed]}
            >
              <Text style={[styles.actionLabel, isSaved && { color: colors.emerald }]}>
                {isSaved ? '✅ Saved' : '📌 Save'}
              </Text>
            </Pressable>
          )}
          {onNext && (
            <Pressable
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel="Next message"
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <Text style={styles.actionLabel}>🎲 Next</Text>
            </Pressable>
          )}
        </View>
      )}
      <View style={styles.tail} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 10,
  },
  tail: {
    position: 'absolute',
    bottom: -9,
    left: '50%',
    marginLeft: -9,
    width: 18,
    height: 18,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  text: { color: colors.text, fontSize: 18, lineHeight: 26 },
  placeholder: { color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  action: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDone: { backgroundColor: 'rgba(16,185,129,0.12)' },
  actionLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
