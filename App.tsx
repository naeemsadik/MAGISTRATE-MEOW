import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionCompleteModal } from './src/components/SessionCompleteModal';
import { SettingsModal } from './src/components/SettingsModal';
import { CourtroomScreen } from './src/screens/CourtroomScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { VaultScreen } from './src/screens/VaultScreen';
import { useMagistrateStore } from './src/store/useMagistrateStore';
import { colors } from './src/theme';

type Route = 'home' | 'vault';

export default function App() {
  // An active session always wins: the Courtroom cannot be navigated away from.
  const inSession = useMagistrateStore((s) => s.session !== null);
  const bootstrap = useMagistrateStore((s) => s.bootstrap);
  const [route, setRoute] = useState<Route>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const goHome = useCallback(() => setRoute('home'), []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        {inSession ? (
          <CourtroomScreen />
        ) : route === 'vault' ? (
          <VaultScreen onBack={goHome} />
        ) : (
          <HomeScreen onOpenVault={() => setRoute('vault')} onOpenSettings={() => setSettingsOpen(true)} />
        )}
      </View>
      <SettingsModal visible={settingsOpen && !inSession} onClose={() => setSettingsOpen(false)} />
      <SessionCompleteModal />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
