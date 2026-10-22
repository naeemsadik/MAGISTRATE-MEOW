import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDndPermission } from '../hooks/useDndPermission';
import { FALLBACK_PACK_SIZE } from '../services/fallbackPack';
import { DEFAULT_GEMINI_MODEL } from '../services/geminiService';
import { isLockdownAvailable, openDndPermissionSettings } from '../services/nativeLockdown';
import { selectReadyCount, useMagistrateStore } from '../store/useMagistrateStore';
import { colors, radius } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: Props) {
  // Mounted per opening so the drafts always start from the saved values.
  return visible ? <SettingsSheet onClose={onClose} /> : null;
}

function SettingsSheet({ onClose }: Pick<Props, 'onClose'>) {
  const insets = useSafeAreaInsets();
  const dndGranted = useDndPermission();

  const apiKey = useMagistrateStore((s) => s.apiKey);
  const cousinName = useMagistrateStore((s) => s.cousinName);
  const geminiModel = useMagistrateStore((s) => s.geminiModel);
  const isFetching = useMagistrateStore((s) => s.isFetching);
  const lastFetchError = useMagistrateStore((s) => s.lastFetchError);
  const readyCount = useMagistrateStore(selectReadyCount);
  const setApiKey = useMagistrateStore((s) => s.setApiKey);
  const updatePreferences = useMagistrateStore((s) => s.updatePreferences);
  const replenishQueueIfLow = useMagistrateStore((s) => s.replenishQueueIfLow);

  const [nameDraft, setNameDraft] = useState(cousinName);
  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [modelDraft, setModelDraft] = useState(geminiModel);
  const [showKey, setShowKey] = useState(false);

  const keyDirty = keyDraft.trim() !== apiKey;

  const commitText = () => {
    const name = nameDraft.trim();
    const model = modelDraft.trim() || DEFAULT_GEMINI_MODEL;
    if (name !== cousinName || model !== geminiModel) {
      updatePreferences({ cousinName: name, geminiModel: model });
    }
  };

  const close = () => {
    commitText();
    onClose();
  };

  let geminiStatus: string;
  if (!apiKey) geminiStatus = `No key yet: bubbles come from the offline pack (${FALLBACK_PACK_SIZE} items).`;
  else if (isFetching) geminiStatus = 'Asking Gemini for a fresh batch…';
  else if (lastFetchError) geminiStatus = lastFetchError;
  else geminiStatus = `✓ Connected. ${readyCount} AI items ready.`;

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Settings</Text>
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button" style={styles.doneBtn}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Section title="Who is studying?">
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              onBlur={commitText}
              placeholder="Your name (Magistrate Meow will use it)"
              placeholderTextColor={colors.faint}
              style={styles.input}
              autoCapitalize="words"
              maxLength={40}
            />
          </Section>

          <Section title="Gemini API key">
            <Text style={styles.help}>
              Free key from Google AI Studio. Stored in the Android Keystore and only ever sent to the Gemini API.
            </Text>
            <View style={styles.keyRow}>
              <TextInput
                value={keyDraft}
                onChangeText={setKeyDraft}
                placeholder="Paste your key"
                placeholderTextColor={colors.faint}
                style={[styles.input, styles.keyInput]}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="no"
              />
              <Pressable onPress={() => setShowKey((v) => !v)} style={styles.eye} accessibilityRole="button">
                <Text style={styles.eyeLabel}>{showKey ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            <View style={styles.row}>
              <Button
                label={apiKey && !keyDraft.trim() ? 'Remove key' : 'Save key'}
                disabled={!keyDirty}
                onPress={() => void setApiKey(keyDraft)}
                primary
              />
              <Button label="Get a key" onPress={() => void Linking.openURL('https://aistudio.google.com/apikey')} />
            </View>
            <View style={styles.statusRow}>
              {isFetching && <ActivityIndicator color={colors.gold} size="small" />}
              <Text style={[styles.status, lastFetchError && !isFetching ? { color: colors.gold } : null]}>
                {geminiStatus}
              </Text>
            </View>
            {apiKey ? (
              <Button
                label="⚡ Fetch a fresh batch now"
                disabled={isFetching}
                onPress={() => {
                  commitText();
                  void replenishQueueIfLow(true);
                }}
              />
            ) : null}
          </Section>

          <Section title="Gemini model">
            <TextInput
              value={modelDraft}
              onChangeText={setModelDraft}
              onBlur={commitText}
              placeholder={DEFAULT_GEMINI_MODEL}
              placeholderTextColor={colors.faint}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.help}>
              Change this only if Google retires the default. Reset: {DEFAULT_GEMINI_MODEL}
            </Text>
          </Section>

          <Section title="Lockdown">
            {isLockdownAvailable ? (
              <>
                <Text style={styles.help}>
                  {dndGranted
                    ? '✓ Call-Only Do Not Disturb is allowed. Only phone calls ring during sessions.'
                    : 'Allow Do Not Disturb access so sessions silence everything except phone calls.'}
                </Text>
                {!dndGranted && <Button label="Grant DND access" onPress={openDndPermissionSettings} primary />}
                <Text style={styles.help}>
                  Each session, Android asks to pin the screen; tap “Got it”. While pinned, Home, Back and Recents are
                  blocked until the timer ends or you complete the Emergency Bailout.
                </Text>
              </>
            ) : (
              <Text style={styles.help}>
                Screen pinning and DND need the Android build of the app (not Expo Go or web).
              </Text>
            )}
          </Section>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Button({
  label,
  onPress,
  primary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        primary && styles.buttonPrimary,
        disabled && styles.buttonDisabled,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.buttonLabel, primary && !disabled && { color: colors.bg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  doneBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  done: { color: colors.gold, fontSize: 17, fontWeight: '700' },
  content: { paddingHorizontal: 16, gap: 16 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  help: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  input: {
    minHeight: 48,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  keyRow: { flexDirection: 'row', gap: 8 },
  keyInput: { flex: 1 },
  eye: {
    minWidth: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeLabel: { color: colors.muted, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { flex: 1, color: colors.muted, fontSize: 14, lineHeight: 20 },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonPrimary: { backgroundColor: colors.gold, borderColor: colors.gold },
  buttonDisabled: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, opacity: 0.6 },
  buttonLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
});
