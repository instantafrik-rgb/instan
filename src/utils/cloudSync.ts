/**
 * Nantor Sourcing App - V4 Cloud Sync Service
 * Architecture: Local-First with Cloud Firestore & User-Scoped Isolation
 * 
 * Supports:
 * - Scoped Firestore path: /users/{userId}/{collectionName}/{documentId}
 * - Zero-trust isolation conforming strictly to firestore.rules (request.auth.uid == userId)
 * - Windows (Web/Desktop Chrome/Electron/PWA) <-> Android (Chrome/PWA/Capacitor)
 * - Bi-directional real-time sync with onSnapshot listener
 * - Smart merging with Last-Write-Wins timestamps without data loss
 * - Offline Queue: Operations made offline or unauthenticated are safely queued in localStorage
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Client,
  Devis,
  Commande,
  Facture,
  Paiement,
  Fournisseur,
  Sourcing,
  Rentabilite,
  OfflineQueueItem,
} from '../types';
import { getCurrentUserId } from './googleAuth';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(app);

const STORAGE_KEYS = {
  OFFLINE_QUEUE: 'nantor_v4_sync_offline_queue',
  LAST_SYNC: 'nantor_v4_sync_last_time',
  DEVICE_ID: 'nantor_v4_sync_device_id',
  SYNC_CONFIG: 'nantor_v4_sync_config',
};

export const SYNC_COLLECTIONS = [
  'clients',
  'devis',
  'commandes',
  'factures',
  'paiements',
  'fournisseurs',
  'sourcing',
  'rentabilites',
] as const;

export type SyncCollectionType = typeof SYNC_COLLECTIONS[number];

// Device identification
export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!id) {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const prefix = isAndroid ? 'android' : 'win';
    id = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
  }
  return id;
}

export function detectDeviceType(): 'windows' | 'android' {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  return 'windows';
}

// Offline Queue Management
export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueueItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nantor_offline_queue_updated', { detail: queue.length }));
    }
  } catch (e) {
    console.error('Erreur sauvegarde file hors ligne:', e);
  }
}

export function addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp'>) {
  const queue = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    ...item,
    id: `queue-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };
  queue.push(newItem);
  saveOfflineQueue(queue);
  return newItem;
}

export function removeFromOfflineQueue(id: string) {
  const queue = getOfflineQueue();
  saveOfflineQueue(queue.filter((item) => item.id !== id));
}

export function clearOfflineQueue() {
  saveOfflineQueue([]);
}

// Helpers for scoped user paths
export function getUserDocRef(userId: string, colName: string, docId: string) {
  return doc(firestore, 'users', userId, colName, docId);
}

export function getUserColRef(userId: string, colName: string) {
  return collection(firestore, 'users', userId, colName);
}

// Smart merger for entities by ID and timestamps with deduplication and deletion safeguards
export function mergeCollectionEntities<T extends { id?: string; updatedAt?: string; _lastUpdated?: string; date?: string; numero?: string }>(
  localList: T[],
  cloudList: T[]
): T[] {
  const map = new Map<string, T>();
  const offlineQueue = getOfflineQueue();
  const pendingDeletions = new Set(
    offlineQueue.filter((q) => q.action === 'delete').map((q) => q.documentId)
  );

  // 1. Insert all local items first (preserves local IDs and authoring edits)
  for (const item of localList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  // 2. Merge cloud items safely
  for (const cloudItem of cloudList) {
    if (!cloudItem || !cloudItem.id) continue;

    // Protection: If user deleted this item locally and the delete is pending in offline queue,
    // do NOT resurrect it from the cloud
    if (pendingDeletions.has(cloudItem.id)) {
      continue;
    }

    const existing = map.get(cloudItem.id);
    if (!existing) {
      // Deduplication check by business number (e.g. 'numero' for devis/commandes/factures)
      if (cloudItem.numero) {
        let duplicateFound = false;
        for (const [existingId, existingItem] of map.entries()) {
          if (existingItem.numero === cloudItem.numero && existingId !== cloudItem.id) {
            duplicateFound = true;
            // Merge properties into the existing ID if cloud is more recent, preserving existing ID
            const cloudTime = new Date(cloudItem._lastUpdated || cloudItem.updatedAt || cloudItem.date || 0).getTime();
            const localTime = new Date(existingItem._lastUpdated || existingItem.updatedAt || existingItem.date || 0).getTime();
            if (cloudTime > localTime) {
              map.set(existingId, { ...cloudItem, id: existingId });
            }
            break;
          }
        }
        if (!duplicateFound) {
          map.set(cloudItem.id, cloudItem);
        }
      } else {
        map.set(cloudItem.id, cloudItem);
      }
    } else {
      // Both exist with same ID -> compare timestamps without changing existing ID
      const cloudTime = new Date(cloudItem._lastUpdated || cloudItem.updatedAt || cloudItem.date || 0).getTime();
      const localTime = new Date(existing._lastUpdated || existing.updatedAt || existing.date || 0).getTime();
      if (cloudTime > localTime) {
        map.set(cloudItem.id, { ...existing, ...cloudItem, id: existing.id });
      }
    }
  }

  return Array.from(map.values());
}

// Push a single entity to user's scoped Firestore path (or queue if offline/unauthenticated)
export async function syncEntityToCloud(
  collectionName: SyncCollectionType,
  action: 'create' | 'update' | 'delete',
  documentId: string,
  payload: any,
  targetUserId?: string
): Promise<boolean> {
  const isOnline = navigator.onLine;
  const userId = targetUserId || getCurrentUserId();

  if (!isOnline || !userId) {
    addToOfflineQueue({
      collection: collectionName,
      action,
      documentId,
      payload,
    });
    return false;
  }

  try {
    const deviceId = getOrCreateDeviceId();
    const docRef = getUserDocRef(userId, collectionName, documentId);

    if (action === 'delete') {
      await deleteDoc(docRef);
    } else {
      const dataToSave = {
        ...payload,
        id: documentId,
        _lastUpdated: new Date().toISOString(),
        _deviceId: deviceId,
        _deviceType: detectDeviceType(),
      };
      await setDoc(docRef, dataToSave, { merge: true });
    }

    // Update metadata document
    const metaRef = getUserDocRef(userId, 'meta', 'sync');
    setDoc(metaRef, {
      lastSync: new Date().toISOString(),
      lastDeviceId: deviceId,
      lastDeviceType: detectDeviceType(),
    }, { merge: true }).catch(() => {});

    return true;
  } catch (error) {
    console.warn(`[CloudSync] Erreur sync ${collectionName}/${documentId} pour l'utilisateur ${userId}, mise en file:`, error);
    addToOfflineQueue({
      collection: collectionName,
      action,
      documentId,
      payload,
    });
    return false;
  }
}

// Flush pending offline queue under user's scoped Firestore path
export async function flushOfflineQueue(
  targetUserId?: string,
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; processed: number; errors: number }> {
  if (!navigator.onLine) {
    return { success: false, processed: 0, errors: 0 };
  }

  const userId = targetUserId || getCurrentUserId();
  if (!userId) {
    return { success: false, processed: 0, errors: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { success: true, processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;
  const remaining: OfflineQueueItem[] = [];
  const deviceId = getOrCreateDeviceId();
  const deviceType = detectDeviceType();

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      const docRef = getUserDocRef(userId, item.collection, item.documentId);
      if (item.action === 'delete') {
        await deleteDoc(docRef);
      } else {
        await setDoc(
          docRef,
          {
            ...item.payload,
            id: item.documentId,
            _lastUpdated: item.timestamp,
            _deviceId: deviceId,
            _deviceType: deviceType,
          },
          { merge: true }
        );
      }
      processed++;
      if (onProgress) onProgress(processed, queue.length);
    } catch (err) {
      console.error(`[CloudSync] Échec envoi élément en attente ${item.collection}/${item.documentId}:`, err);
      errors++;
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
  return { success: errors === 0, processed, errors };
}

// Fetch all collections from user's scoped Firestore path
export async function fetchAllCollectionsFromCloud(targetUserId?: string): Promise<{
  clients: Client[];
  devis: Devis[];
  commandes: Commande[];
  factures: Facture[];
  paiements: Paiement[];
  fournisseurs: Fournisseur[];
  sourcingList: Sourcing[];
  rentabilites: Record<string, Rentabilite>;
} | null> {
  if (!navigator.onLine) return null;

  const userId = targetUserId || getCurrentUserId();
  if (!userId) return null;

  try {
    const results: any = {};

    await Promise.all(
      SYNC_COLLECTIONS.map(async (colName) => {
        const colRef = getUserColRef(userId, colName);
        const snapshot = await getDocs(colRef);
        results[colName] = snapshot.docs.map((d) => d.data());
      })
    );

    const rentabilitesMap: Record<string, Rentabilite> = {};
    if (results.rentabilites && Array.isArray(results.rentabilites)) {
      results.rentabilites.forEach((r: any) => {
        const key = r.commandeId || r.id;
        if (key) rentabilitesMap[key] = r;
      });
    }

    return {
      clients: results.clients || [],
      devis: results.devis || [],
      commandes: results.commandes || [],
      factures: results.factures || [],
      paiements: results.paiements || [],
      fournisseurs: results.fournisseurs || [],
      sourcingList: results.sourcing || [],
      rentabilites: rentabilitesMap,
    };
  } catch (error) {
    console.error('[CloudSync] Erreur téléchargement données utilisateur Firestore:', error);
    return null;
  }
}

// Push all local data into user's scoped Firestore path
export async function pushAllLocalDataToCloud(
  data: {
    clients: Client[];
    devis: Devis[];
    commandes: Commande[];
    factures: Facture[];
    paiements: Paiement[];
    fournisseurs: Fournisseur[];
    sourcingList: Sourcing[];
    rentabilites: Record<string, Rentabilite>;
  },
  targetUserId?: string
): Promise<{ success: boolean; totalUploaded: number; error?: string }> {
  if (!navigator.onLine) {
    return { success: false, totalUploaded: 0, error: 'Appareil hors ligne' };
  }

  const userId = targetUserId || getCurrentUserId();
  if (!userId) {
    return { success: false, totalUploaded: 0, error: 'Utilisateur non authentifié' };
  }

  try {
    let totalUploaded = 0;
    const deviceId = getOrCreateDeviceId();
    const deviceType = detectDeviceType();
    const now = new Date().toISOString();

    const pushCollection = async (colName: string, items: any[], idField = 'id') => {
      for (const item of items) {
        const docId = item[idField] || `${colName}-${Date.now()}`;
        const docRef = getUserDocRef(userId, colName, docId);
        await setDoc(
          docRef,
          {
            ...item,
            id: docId,
            _lastUpdated: item.updatedAt || item.date || now,
            _deviceId: deviceId,
            _deviceType: deviceType,
          },
          { merge: true }
        );
        totalUploaded++;
      }
    };

    await pushCollection('clients', data.clients);
    await pushCollection('fournisseurs', data.fournisseurs);
    await pushCollection('sourcing', data.sourcingList);
    await pushCollection('devis', data.devis);
    await pushCollection('commandes', data.commandes);
    await pushCollection('factures', data.factures);
    await pushCollection('paiements', data.paiements);

    const rentArray = Object.values(data.rentabilites);
    await pushCollection('rentabilites', rentArray, 'commandeId');

    // Update metadata document
    const metaRef = getUserDocRef(userId, 'meta', 'sync');
    await setDoc(metaRef, {
      lastSync: now,
      lastDeviceId: deviceId,
      lastDeviceType: deviceType,
      totalUploaded,
    }, { merge: true });

    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
    return { success: true, totalUploaded };
  } catch (e: any) {
    console.error('[CloudSync] Erreur export complet vers Firestore:', e);
    return { success: false, totalUploaded: 0, error: e?.message || 'Erreur inconnue' };
  }
}

// Bi-directional real-time synchronization listener (onSnapshot)
export function subscribeToUserCollections(
  userId: string,
  onRemoteChange: (collectionName: SyncCollectionType, items: any[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const currentDeviceId = getOrCreateDeviceId();
  const unsubs: Unsubscribe[] = [];

  SYNC_COLLECTIONS.forEach((colName) => {
    try {
      const colRef = getUserColRef(userId, colName);
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          // Check if any change was from another device
          const remoteDocs: any[] = [];
          let hasExternalChange = false;

          snapshot.docs.forEach((d) => {
            const data = d.data();
            remoteDocs.push(data);
            if (data._deviceId && data._deviceId !== currentDeviceId) {
              hasExternalChange = true;
            }
          });

          // Only trigger state update if there are documents and external changes or new docs
          if (hasExternalChange || snapshot.docChanges().some((c) => c.doc.data()._deviceId !== currentDeviceId)) {
            onRemoteChange(colName, remoteDocs);
          }
        },
        (err) => {
          console.warn(`[CloudSync] Erreur écoute temps réel pour ${colName}:`, err);
          if (onError) onError(err);
        }
      );
      unsubs.push(unsub);
    } catch (e) {
      console.warn(`[CloudSync] Impossible d'attacher listener sur ${colName}:`, e);
    }
  });

  return () => {
    unsubs.forEach((u) => {
      try {
        u();
      } catch {}
    });
  };
}
