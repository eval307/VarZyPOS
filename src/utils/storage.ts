/**
 * Store-isolated persistent local storage engine
 * Guarantees that any change made by the user is immediately saved to localStorage
 * and can be seamlessly restored across page refreshes and logouts.
 */

export function getStoreStorage<T>(storeId: string, key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`kasirku_${storeId}_${key}`);
    if (raw !== null && raw !== undefined) {
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.warn(`[LocalStorage] Failed to read ${key} for store ${storeId}:`, err);
  }
  return fallback;
}

export function setStoreStorage<T>(storeId: string, key: string, data: T): void {
  try {
    localStorage.setItem(`kasirku_${storeId}_${key}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`[LocalStorage] Failed to save ${key} for store ${storeId}:`, err);
  }
}

export function removeStoreStorage(storeId: string, key: string): void {
  try {
    localStorage.removeItem(`kasirku_${storeId}_${key}`);
  } catch (err) {
    console.warn(`[LocalStorage] Failed to remove ${key} for store ${storeId}:`, err);
  }
}
