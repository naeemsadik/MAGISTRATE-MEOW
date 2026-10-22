import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors, radius } from '../theme';

const CONFESSIONS = [
  'Ami shikar korchi je reels amar BCS er cheye beshi priyo, tai Magistrate Meow er adalot theke palacchi.',
  'Mohamanno adalot, ami porashona fele palacchi, ar amar cadre hobar shopno ajker moto chhuti nilo.',
  'Ami shopath kori ei bailout er por phone e 5 minute er beshi thakbo na, Meow sakkhi, ami lojjito.',
];

// Anything bigger than a couple of characters in one change is a paste or a keyboard clipboard chip.
const MAX_CHARS_PER_CHANGE = 2;

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trimStart();

interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ShameBailoutModal({ visible, onCancel, onConfirm }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* Mounted per opening, so every bailout gets a fresh phrase and an empty input. */}
      {visible && <ConfessionForm onCancel={onCancel} onConfirm={onConfirm} />}
    </Modal>
  );
}

function ConfessionForm({ onCancel, onConfirm }: Omit<Props, 'visible'>) {
  const [phrase] = useState(() => CONFESSIONS[Math.floor(Math.random() * CONFESSIONS.length)]);
  const [typed, setTyped] = useState('');
  const [warning, setWarning] = useState<string | null>(null);

  const target = normalize(phrase);
  const input = normalize(typed);

  let matched = 0;
  while (matched < input.length && matched < target.length && input[matched] === target[matched]) matched++;
  const hasTypo = matched < input.length;
  const isMatch = input.trimEnd() === target;

  const handleChange = (next: string) => {
    if (next.length - typed.length > MAX_CHARS_PER_CHANGE) {
      setWarning('Copy-paste dhora porse! Nijer haate type koro. 😾');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setWarning(null);
    setTyped(next);
  };

  return (
    <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.card}>
        <Text style={styles.title}>🏳️ Emergency Bailout</Text>
        <Text style={styles.body}>
          Magistrate Meow demands a confession. Type it exactly. Copy-paste is not admissible in this court.
        </Text>

        <View style={styles.phraseBox}>
          <Text style={styles.phrase} selectable={false}>
            <Text style={styles.phraseDone}>{phrase.slice(0, matched)}</Text>
            <Text style={hasTypo ? styles.phraseTypo : styles.phraseNext}>{phrase.slice(matched, matched + 1)}</Text>
            <Text>{phrase.slice(matched + 1)}</Text>
          </Text>
        </View>

        <TextInput
          value={typed}
          onChangeText={handleChange}
          placeholder="Type the confession…"
          placeholderTextColor={colors.faint}
          style={[styles.input, hasTypo && styles.inputTypo]}
          multiline
          autoCorrect={false}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          contextMenuHidden
          importantForAutofill="no"
          // Disables suggestions, glide typing and the clipboard chip on most Android keyboards.
          keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
          accessibilityLabel="Confession input"
        />

        <View style={styles.meta}>
          <Text style={[styles.metaText, hasTypo && { color: colors.danger }]}>
            {hasTypo ? `Typo at character ${matched + 1}` : `${Math.min(matched, target.length)} / ${target.length}`}
          </Text>
          {warning && <Text style={styles.warning}>{warning}</Text>}
        </View>

        <Pressable
          style={({ pressed }) => [styles.stay, pressed && styles.pressed]}
          onPress={onCancel}
          accessibilityRole="button"
        >
          <Text style={styles.stayLabel}>📚 Stay & keep studying</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.unlock, !isMatch && styles.unlockDisabled, pressed && styles.pressed]}
          onPress={onConfirm}
          disabled={!isMatch}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isMatch }}
        >
          <Text style={[styles.unlockLabel, !isMatch && { color: colors.faint }]}>🔓 Unlock early</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,6,12,0.88)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 14,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  phraseBox: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phrase: { color: colors.muted, fontSize: 17, lineHeight: 26 },
  phraseDone: { color: colors.emerald },
  phraseNext: { color: colors.text, textDecorationLine: 'underline', fontWeight: '800' },
  phraseTypo: { color: colors.danger, textDecorationLine: 'underline', fontWeight: '800' },
  input: {
    minHeight: 88,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    textAlignVertical: 'top',
  },
  inputTypo: { borderColor: colors.danger },
  meta: { gap: 4 },
  metaText: { color: colors.faint, fontSize: 13 },
  warning: { color: colors.gold, fontSize: 14, fontWeight: '700' },
  stay: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stayLabel: { color: colors.bg, fontSize: 16, fontWeight: '800' },
  unlock: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockDisabled: { borderColor: colors.border },
  unlockLabel: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
