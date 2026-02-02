type Persistence = {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
};

export const persistence: Persistence = {
  setItem(key, value) {
    if ((window as any).persistentStorage) {
      return (window as any).persistentStorage.setItem(key, value);
    }
    return Promise.resolve(localStorage.setItem(key, value));
  },
  getItem(key) {
    if ((window as any).persistentStorage) {
      return (window as any).persistentStorage.getItem(key);
    }
    return Promise.resolve(localStorage.getItem(key));
  },
  removeItem(key) {
    if ((window as any).persistentStorage) {
      return (window as any).persistentStorage.removeItem(key);
    }
    return Promise.resolve(localStorage.removeItem(key));
  },
  clear() {
    if ((window as any).persistentStorage) {
      return (window as any).persistentStorage.clear();
    }
    return Promise.resolve(localStorage.clear());
  },
};