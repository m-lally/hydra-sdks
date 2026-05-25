import React, { useState, useEffect, createContext, useContext } from 'react';
import { HydraClient, createHydraClient } from '../client';
import type { SDKOptions } from '../types';

interface HydraContextValue {
  client: HydraClient | null;
  isReady: boolean;
  error: Error | null;
}

const HydraContext = createContext<HydraContextValue>({
  client: null,
  isReady: false,
  error: null,
});

interface HydraProviderProps {
  children: React.ReactNode;
  options: SDKOptions;
}

export function HydraProvider({ children, options }: HydraProviderProps): JSX.Element {
  const [client, setClient] = useState<HydraClient | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const hydraClient = createHydraClient(options);
      setClient(hydraClient);
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize Hydra client'));
    }
  }, [options.baseUrl, options.apiKey, options.secretKey]);

  return (
    <HydraContext.Provider value={{ client, isReady, error }}>
      {children}
    </HydraContext.Provider>
  );
}

export function useHydraClient(): HydraClient {
  const { client, isReady, error } = useContext(HydraContext);

  if (!isReady) {
    throw new Error('Hydra client is not ready');
  }

  if (error) {
    throw error;
  }

  if (!client) {
    throw new Error('Hydra client not initialized');
  }

  return client;
}

export { HydraContext };
