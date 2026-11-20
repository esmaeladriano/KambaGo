import test from 'node:test';
import assert from 'node:assert/strict';
import { preferencesStorage, supabaseAuthStorage } from './deviceStorage';
import { useAuthStore } from '../../store/useAuthStore';

test('deviceStorage adapters store, read and remove items safely without browser globals', async () => {
  await supabaseAuthStorage.setItem('sb-test-auth-token', 'token-123');
  assert.equal(await supabaseAuthStorage.getItem('sb-test-auth-token'), 'token-123');
  await supabaseAuthStorage.removeItem('sb-test-auth-token');
  assert.equal(await supabaseAuthStorage.getItem('sb-test-auth-token'), null);
});

test('useAuthStore persists and hydrates dataSaverEnabled via preferencesStorage', async () => {
  await preferencesStorage.removeItem('kambago_data_saver');
  useAuthStore.setState({ dataSaverEnabled: false, preferencesHydrated: false, profile: null });

  useAuthStore.getState().setDataSaverEnabled(true);
  assert.equal(useAuthStore.getState().dataSaverEnabled, true);

  // Simular reinício de estado e hidratação assíncrona
  useAuthStore.setState({ dataSaverEnabled: false, preferencesHydrated: false });
  await useAuthStore.getState().hydratePreferences();
  assert.equal(useAuthStore.getState().preferencesHydrated, true);
  assert.equal(useAuthStore.getState().dataSaverEnabled, true);

  await preferencesStorage.removeItem('kambago_data_saver');
  useAuthStore.setState({ dataSaverEnabled: false, preferencesHydrated: false });
});
