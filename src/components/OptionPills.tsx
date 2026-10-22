import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors, radius } from '../theme';

export interface PillOption<T> {
  label: string;
  value: T;
}

interface Props<T> {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accent?: string;
  compact?: boolean;
}

export function OptionPills<T extends string | number>({
  options,
  value,
  onChange,
  accent = colors.gold,
  compact = false,
}: Props<T>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              onChange(opt.value);
            }}
            style={({ pressed }) => [
              styles.pill,
              compact && styles.pillCompact,
              selected && { backgroundColor: accent, borderColor: accent },
              pressed && !selected && styles.pressed,
            ]}
          >
            <Text
              style={[styles.label, compact && styles.labelCompact, selected && styles.labelSelected]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillCompact: { minHeight: 36 },
  pressed: { backgroundColor: colors.surfaceRaised },
  label: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  labelCompact: { fontSize: 13 },
  labelSelected: { color: colors.bg },
});
