import { useState, useCallback, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { LLMProvider, PROVIDER_LABELS, AppSettings } from '../../../types/settings';

interface SettingsPanelProps {
  onClose: () => void;
}

type Tab = 'api-keys' | 'model' | 'about';

const PROVIDERS: LLMProvider[] = ['ollama', 'openai', 'anthropic', 'google', 'groq', 'xai'];

function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [tab, setTab] = useState<Tab>('api-keys');
  const [draft, setDraft] = useState<AppSettings>({ ...settings });
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [ollamaError, setOllamaError] = useState('');

  const handleSave = async () => {
    await updateSettings(draft);
    onClose();
  };

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setDraft({ ...draft, [key]: value });
  };

  const updateProviderCfg = (provider: LLMProvider, field: string, value: string) => {
    setDraft({ ...draft, [provider]: { ...draft[provider], [field]: value } });
  };

  const refreshOllamaModels = useCallback(async () => {
    setFetchingModels(true);
    setOllamaError('');
    try {
      const result = await window.electronAPI.listOllamaModels();
      if (result.success) {
        setOllamaModels(result.models);
        if (result.models.length === 0) {
          setOllamaError('No models found — pull one in Ollama first');
        }
      } else {
        setOllamaError(result.error || 'Failed to connect');
      }
    } catch (err) {
      setOllamaError((err as Error).message);
    }
    setFetchingModels(false);
  }, []);

  const prevProviderRef = useRef(draft.provider);
  useEffect(() => {
    if (prevProviderRef.current !== draft.provider) {
      prevProviderRef.current = draft.provider;
      if (draft.provider === 'ollama') {
        refreshOllamaModels();
      }
    }
  }, [draft.provider, refreshOllamaModels]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'api-keys', label: 'API Keys' },
    { id: 'model', label: 'Model' },
    { id: 'about', label: 'About' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h2 className="text-gray-200 text-sm font-medium">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>

        <div className="flex gap-1 px-5 pt-3 border-b border-gray-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs rounded-t-md transition-colors ${
                tab === t.id ? 'bg-gray-800 text-gray-200' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === 'api-keys' && (
            <>
              <Section label="Deepgram (Speech-to-Text)">
                <InputField label="API Key" value={draft.deepgramApiKey} onChange={(v) => update('deepgramApiKey', v)} placeholder="DEEPGRAM_API_KEY" />
              </Section>
              {PROVIDERS.map((p) => (
                <Section key={p} label={PROVIDER_LABELS[p]}>
                  {p !== 'ollama' && (
                    <InputField label="API Key" value={draft[p].apiKey} onChange={(v) => updateProviderCfg(p, 'apiKey', v)} placeholder={`${p.toUpperCase()}_API_KEY`} password />
                  )}
                  {p === 'ollama' && (
                    <InputField label="Base URL" value={draft[p].baseUrl} onChange={(v) => updateProviderCfg(p, 'baseUrl', v)} placeholder="http://127.0.0.1:11434" />
                  )}
                </Section>
              ))}
            </>
          )}

          {tab === 'model' && (
            <>
              <Section label="Active Provider">
                <select
                  value={draft.provider}
                  onChange={(e) => update('provider', e.target.value as LLMProvider)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-gray-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                  ))}
                </select>
              </Section>

              <Section label="Model">
                {draft.provider === 'ollama' ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={draft.ollama.model}
                        onChange={(e) => updateProviderCfg('ollama', 'model', e.target.value)}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-gray-200 text-xs focus:outline-none focus:border-indigo-500"
                      >
                        {ollamaModels.length === 0 && (
                          <option value={draft.ollama.model}>{draft.ollama.model}</option>
                        )}
                        {ollamaModels.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <button
                        onClick={refreshOllamaModels}
                        disabled={fetchingModels}
                        className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-xs rounded-md transition-colors"
                        title="Refresh models"
                      >
                        {fetchingModels ? '...' : '↻'}
                      </button>
                    </div>
                    {ollamaError && (
                      <p className="text-red-400 text-xs">{ollamaError}</p>
                    )}
                    <InputField
                      label="Base URL"
                      value={draft.ollama.baseUrl}
                      onChange={(v) => updateProviderCfg('ollama', 'baseUrl', v)}
                      placeholder="http://127.0.0.1:11434"
                    />
                  </div>
                ) : (
                  <>
                    <InputField
                      label="Model Name"
                      value={draft[draft.provider].model}
                      onChange={(v) => updateProviderCfg(draft.provider, 'model', v)}
                      placeholder="gpt-4o"
                    />
                    <InputField
                      label="API Key"
                      value={draft[draft.provider].apiKey}
                      onChange={(v) => updateProviderCfg(draft.provider, 'apiKey', v)}
                      placeholder="API Key"
                      password
                    />
                  </>
                )}
              </Section>

              <Section label="Parameters">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-gray-400 text-xs mb-1">Temperature</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={draft.temperature}
                      onChange={(e) => update('temperature', parseFloat(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <span className="text-gray-500 text-xs">{draft.temperature}</span>
                  </div>
                  <div className="flex-1">
                    <InputField
                      label="Max Tokens"
                      value={String(draft.maxTokens)}
                      onChange={(v) => update('maxTokens', parseInt(v, 10) || 2048)}
                      placeholder="2048"
                    />
                  </div>
                </div>
              </Section>
            </>
          )}

          {tab === 'about' && (
            <div className="text-gray-400 text-xs space-y-3">
              <p><span className="text-gray-200 font-medium">3D AI Explainer</span> v0.1.0</p>
              <p>Desktop application for 3D visualization with AI-powered voice explanations.</p>
              <p>Built with Electron 33 + React 19 + Three.js + Vercel AI SDK.</p>
              <p className="text-gray-500">Copyright 2026 Latestinssan. Apache 2.0 License.</p>
              <p className="text-gray-500">Innovation idea thanks to Daksh Patel.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-800">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">{label}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, password }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; password?: boolean }) {
  return (
    <div>
      <label className="block text-gray-500 text-xs mb-1">{label}</label>
      <input
        type={password ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-gray-200 text-xs placeholder-gray-600 focus:outline-none focus:border-indigo-500"
      />
    </div>
  );
}

export default SettingsPanel;
