import * as SecureStore from 'expo-secure-store';

// The Gemini key lives in the Android Keystore-backed SecureStore, never in plain MMKV.
const KEY = 'gemini_api_key';

export async function loadApiKey(): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(KEY)) ?? '';
  } catch {
    return '';
  }
}

export async function saveApiKey(apiKey: string): Promise<void> {
  if (apiKey) {
    await SecureStore.setItemAsync(KEY, apiKey);
  } else {
    await SecureStore.deleteItemAsync(KEY);
  }
}
