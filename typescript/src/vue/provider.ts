import { type InjectionKey, type App, inject } from 'vue';
import { HydraClient, createHydraClient } from '../client';
import type { SDKOptions } from '../types';

export const hydraClientKey: InjectionKey<HydraClient> = Symbol('hydra-client');

export function createHydraPlugin(opts: SDKOptions) {
  const client = createHydraClient(opts);
  return {
    install(app: App) {
      app.provide(hydraClientKey, client);
    },
  };
}

export function useHydraClient(): HydraClient {
  const client = inject(hydraClientKey);
  if (!client) {
    throw new Error(
      'Hydra client not found. Install the hydraPlugin before calling useHydraClient().'
    );
  }
  return client;
}
