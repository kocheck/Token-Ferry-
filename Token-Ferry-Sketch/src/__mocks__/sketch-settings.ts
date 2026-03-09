// Mock for sketch/settings module

const store = new Map<string, unknown>();

const Settings = {
  settingForKey(key: string): unknown {
    return store.get(key) ?? undefined;
  },
  setSettingForKey(key: string, value: unknown): void {
    store.set(key, value);
  },
  __clear(): void {
    store.clear();
  },
};

export default Settings;
