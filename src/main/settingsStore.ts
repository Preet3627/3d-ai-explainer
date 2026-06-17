import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';

const SETTINGS_FILE = 'settings.json';

class SettingsStore {
  private settings: AppSettings;
  private filePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, SETTINGS_FILE);
    this.settings = this.load();
  }

  private load(): AppSettings {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // Fall through to defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  getAll(): AppSettings {
    return { ...this.settings };
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings[key] = value;
    this.save();
  }

  setAll(updates: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.save();
  }
}

export default SettingsStore;
