// IndexedDB SessionStore for Signal Protocol
import type { StoredSession, StoredPreKey, StoredSignedPreKey, StoredKyberPreKey, StoredIdentityKeyPair } from './types';

const DB_NAME = 'piligrim-signal';
const DB_VERSION = 1;
const STORES = { SESSIONS: 'sessions', PRE_KEYS: 'preKeys', SIGNED_PRE_KEYS: 'signedPreKeys', KYBER_PRE_KEYS: 'kyberPreKeys', IDENTITY: 'identity' } as const;
type StoreName = typeof STORES[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const s = db.createObjectStore(STORES.SESSIONS, { keyPath: 'sessionKey' });
        s.createIndex('uid', 'uid', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.PRE_KEYS)) db.createObjectStore(STORES.PRE_KEYS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.SIGNED_PRE_KEYS)) db.createObjectStore(STORES.SIGNED_PRE_KEYS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.KYBER_PRE_KEYS)) db.createObjectStore(STORES.KYBER_PRE_KEYS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.IDENTITY)) db.createObjectStore(STORES.IDENTITY, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function getAll<T>(sn: StoreName): Promise<T[]> {
  return openDB().then(db => new Promise<T[]>((res, rej) => {
    const tx = db.transaction(sn, 'readonly'); const s = tx.objectStore(sn); const r = s.getAll();
    r.onsuccess = () => res(r.result as T[]); r.onerror = () => rej(r.error);
  }));
}

function get<T>(sn: StoreName, k: IDBValidKey): Promise<T | undefined> {
  return openDB().then(db => new Promise<T | undefined>((res, rej) => {
    const tx = db.transaction(sn, 'readonly'); const s = tx.objectStore(sn); const r = s.get(k);
    r.onsuccess = () => res(r.result as T | undefined); r.onerror = () => rej(r.error);
  }));
}

function put<T>(sn: StoreName, v: T): Promise<IDBValidKey> {
  return openDB().then(db => new Promise<IDBValidKey>((res, rej) => {
    const tx = db.transaction(sn, 'readwrite'); const s = tx.objectStore(sn); const r = s.put(v as any);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
}

function del(sn: StoreName, k: IDBValidKey): Promise<void> {
  return openDB().then(db => new Promise<void>((res, rej) => {
    const tx = db.transaction(sn, 'readwrite'); const s = tx.objectStore(sn); const r = s.delete(k);
    r.onsuccess = () => res(); r.onerror = () => rej(r.error);
  }));
}

function clear(sn: StoreName): Promise<void> {
  return openDB().then(db => new Promise<void>((res, rej) => {
    const tx = db.transaction(sn, 'readwrite'); const s = tx.objectStore(sn); const r = s.clear();
    r.onsuccess = () => res(); r.onerror = () => rej(r.error);
  }));
}

export const SessionStore = {
  async saveSession(s: StoredSession): Promise<void> { await put(STORES.SESSIONS, s); },
  async loadSession(uid: string, deviceId: number): Promise<StoredSession | undefined> {
    return get<StoredSession>(STORES.SESSIONS, `${uid}:${deviceId}`);
  },
  async deleteSession(uid: string, deviceId: number): Promise<void> {
    await del(STORES.SESSIONS, `${uid}:${deviceId}`);
  },
  async listSessions(): Promise<StoredSession[]> { return getAll<StoredSession>(STORES.SESSIONS); },
  async hasSession(uid: string, deviceId: number): Promise<boolean> { return !!(await this.loadSession(uid, deviceId)); },

  async savePreKey(k: StoredPreKey): Promise<void> { await put(STORES.PRE_KEYS, k); },
  async getPreKey(id: number): Promise<StoredPreKey | undefined> { return get<StoredPreKey>(STORES.PRE_KEYS, id); },
  async listPreKeys(): Promise<StoredPreKey[]> { return getAll<StoredPreKey>(STORES.PRE_KEYS); },
  async deletePreKey(id: number): Promise<void> { await del(STORES.PRE_KEYS, id); },
  async countPreKeys(): Promise<number> { return (await this.listPreKeys()).length; },

  async saveSignedPreKey(k: StoredSignedPreKey): Promise<void> { await put(STORES.SIGNED_PRE_KEYS, k); },
  async getSignedPreKey(id: number): Promise<StoredSignedPreKey | undefined> { return get<StoredSignedPreKey>(STORES.SIGNED_PRE_KEYS, id); },
  async listSignedPreKeys(): Promise<StoredSignedPreKey[]> { return getAll<StoredSignedPreKey>(STORES.SIGNED_PRE_KEYS); },

  async saveKyberPreKey(k: StoredKyberPreKey): Promise<void> { await put(STORES.KYBER_PRE_KEYS, k); },
  async getKyberPreKey(id: number): Promise<StoredKyberPreKey | undefined> { return get<StoredKyberPreKey>(STORES.KYBER_PRE_KEYS, id); },
  async listKyberPreKeys(): Promise<StoredKyberPreKey[]> { return getAll<StoredKyberPreKey>(STORES.KYBER_PRE_KEYS); },

  async saveIdentityKeyPair(kp: StoredIdentityKeyPair): Promise<void> { await put(STORES.IDENTITY, { id: 'main', ...kp }); },
  async loadIdentityKeyPair(): Promise<StoredIdentityKeyPair | undefined> {
    const r = await get<any>(STORES.IDENTITY, 'main');
    return r ? { publicKey: r.publicKey, privateKey: r.privateKey } : undefined;
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      clear(STORES.SESSIONS), clear(STORES.PRE_KEYS), clear(STORES.SIGNED_PRE_KEYS),
      clear(STORES.KYBER_PRE_KEYS), clear(STORES.IDENTITY),
    ]);
  },

  async getStats() {
    const [s, p, sp, kp] = await Promise.all([this.listSessions(), this.listPreKeys(), this.listSignedPreKeys(), this.listKyberPreKeys()]);
    const id = await this.loadIdentityKeyPair();
    return { sessions: s.length, preKeys: p.length, signedPreKeys: sp.length, kyberPreKeys: kp.length, hasIdentity: !!id };
  },
};

export type SessionStoreType = typeof SessionStore;