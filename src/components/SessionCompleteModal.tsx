import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { selectStudyMinutesToday, useMagistrateStore } from '../store/useMagistrateStore';
import { colors, radius } from '../theme';
import type { PetMessage, SessionSummary } from '../types';
import { formatStudyTime, shuffle } from '../utils/format';
import { MagistrateCat } from './MagistrateCat';

const QUIZ_LENGTH = 3;

interface PreparedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  fact: string;
}

function prepareQuiz(pool: PetMessage[]): PreparedQuestion[] {
  return shuffle(pool)
    .slice(0, QUIZ_LENGTH)
    .flatMap((m) => {
      if (!m.quiz) return [];
      const correct = m.quiz.options[m.quiz.answerIndex];
      const options = shuffle(m.quiz.options);
      return [{ question: m.quiz.question, options, correctIndex: options.indexOf(correct), fact: m.text }];
    });
}

type Phase = 'summary' | 'quiz' | 'result';

/** "Cha Break": celebration plus up to 3 MCQs built from the facts shown during the session. */
export function SessionCompleteModal() {
  const summary = useMagistrateStore((s) => s.lastSessionSummary);
  // Keyed by session so each ending gets a freshly drawn quiz.
  return summary ? <ChaBreak key={summary.endedAt} summary={summary} /> : null;
}

function ChaBreak({ summary }: { summary: SessionSummary }) {
  const insets = useSafeAreaInsets();
  const todayMinutes = useMagistrateStore(selectStudyMinutesToday);
  const dismiss = useMagistrateStore((s) => s.dismissSessionSummary);

  const [phase, setPhase] = useState<Phase>('summary');
  const [questions] = useState(() => (summary.completed ? prepareQuiz(summary.quizPool) : []));
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const current = questions[qIndex];

  const pick = (i: number) => {
    if (picked !== null || !current) return;
    setPicked(i);
    const right = i === current.correctIndex;
    if (right) setScore((s) => s + 1);
    void Haptics.notificationAsync(
      right ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    );
  };

  const next = () => {
    if (qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
      setPicked(null);
    } else {
      setPhase('result');
    }
  };

  const mood = !summary.completed
    ? 'sassy'
    : phase === 'result' && score === questions.length
      ? 'excited'
      : phase === 'quiz'
        ? 'nerd'
        : 'proud';

  return (
    <Modal
      visible
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      >
        <MagistrateCat mood={mood} size={150} reactKey={`${phase}-${qIndex}`} />

        {phase === 'summary' && (
          <>
            <Text style={styles.title}>{summary.completed ? 'Court adjourned! ☕' : 'Bailout granted… 😾'}</Text>
            <Text style={styles.subtitle}>
              {summary.completed
                ? 'Full session served. Cha break earned!'
                : 'The court has noted your early exit. The minutes you studied still count.'}
            </Text>
            <View style={styles.stats}>
              <Stat value={`${summary.minutesStudied} min`} label="this session" />
              <Stat value={formatStudyTime(todayMinutes)} label="today" />
              <Stat value={String(summary.factsShown)} label="facts heard" />
            </View>
            {questions.length > 0 ? (
              <PrimaryButton
                label={`🧠 Cha Break Quiz (${questions.length} MCQ${questions.length > 1 ? 's' : ''})`}
                onPress={() => setPhase('quiz')}
              />
            ) : summary.completed ? (
              <Text style={styles.note}>No GK facts came up this session, so no quiz. Tap the cat more next time!</Text>
            ) : null}
            <SecondaryButton label="Back to the Chambers" onPress={dismiss} />
          </>
        )}

        {phase === 'quiz' && current && (
          <View style={styles.quiz}>
            <Text style={styles.progress}>
              Question {qIndex + 1} of {questions.length}
            </Text>
            <Text style={styles.question}>{current.question}</Text>
            {current.options.map((opt, i) => {
              const revealed = picked !== null;
              const isCorrect = i === current.correctIndex;
              const isPicked = i === picked;
              return (
                <Pressable
                  key={opt}
                  onPress={() => pick(i)}
                  disabled={revealed}
                  accessibilityRole="button"
                  style={[
                    styles.option,
                    revealed && isCorrect && styles.optionCorrect,
                    revealed && isPicked && !isCorrect && styles.optionWrong,
                  ]}
                >
                  <Text style={styles.optionLabel}>
                    {String.fromCharCode(65 + i)}. {opt}
                    {revealed && isCorrect ? '  ✅' : revealed && isPicked ? '  ❌' : ''}
                  </Text>
                </Pressable>
              );
            })}
            {picked !== null && (
              <>
                <Text style={styles.fact}>📌 {current.fact}</Text>
                <PrimaryButton label={qIndex + 1 < questions.length ? 'Next question' : 'See verdict'} onPress={next} />
              </>
            )}
          </View>
        )}

        {phase === 'result' && (
          <>
            <Text style={styles.title}>
              {score}/{questions.length} correct
            </Text>
            <Text style={styles.subtitle}>
              {score === questions.length
                ? 'Flawless! Magistrate Meow is doing a happy dance. 🐾'
                : score === 0
                  ? 'Order! These facts need another reading. Save them to Case Files next time.'
                  : 'Good recall. Review the ones you missed during your next cha.'}
            </Text>
            <PrimaryButton label="Back to the Chambers" onPress={dismiss} />
          </>
        )}
      </ScrollView>
    </Modal>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.primary, pressed && { opacity: 0.8 }]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, alignItems: 'center', gap: 16 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: colors.gold, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.muted, fontSize: 12 },
  note: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  quiz: { alignSelf: 'stretch', gap: 12 },
  progress: { color: colors.gold, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  question: { color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 28 },
  option: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  optionCorrect: { borderColor: colors.emerald, backgroundColor: 'rgba(16,185,129,0.14)' },
  optionWrong: { borderColor: colors.danger, backgroundColor: 'rgba(244,63,94,0.12)' },
  optionLabel: { color: colors.text, fontSize: 16, lineHeight: 22 },
  fact: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  primary: {
    alignSelf: 'stretch',
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryLabel: { color: colors.bg, fontSize: 17, fontWeight: '800' },
  secondary: {
    alignSelf: 'stretch',
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
