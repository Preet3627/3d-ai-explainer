import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppSettings, DEFAULT_SETTINGS, LLMProvider } from '../../../types/settings';

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  updateProvider: (provider: LLMProvider, cfg: { apiKey?: string; model?: string; baseUrl?: string }) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      setSettings({ ...DEFAULT_SETTINGS, ...s } as AppSettings);
      setLoading(false);
    });
  }, []);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const merged = { ...settings, ...updates };
    setSettings(merged);
    await window.electronAPI.setSettings(updates as Record<string, unknown>);
  }, [settings]);

  const updateProvider = useCallback(async (provider: LLMProvider, cfg: { apiKey?: string; model?: string; baseUrl?: string }) => {
    const current = settings[provider];
    const updated = { ...settings, [provider]: { ...current, ...cfg } };
    setSettings(updated);
    await window.electronAPI.setSettings({ [provider]: updated[provider] } as Record<string, unknown>);
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, updateProvider }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
