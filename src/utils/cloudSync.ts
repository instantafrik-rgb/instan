/**
 * Nantor Sourcing App - V4 Cloud Sync Service
 * Architecture: Local-First with Cloud Firestore & Bi-Directional Synchronization
 * 
 * Supports:
 * - Windows (Web/Desktop Chrome/Electron/PWA)
 * - Android (Chrome/PWA/Trusted Web Activity)
 * - Bi-directional: Windows -> Cloud -> Android & Android -> Cloud -> Windows
 * - Offline Queue: Operations made offline are queued and auto-synced upon reconnect
 * - Conflict resolution: Timestamps and versioning (Last-Write-Wins with granular merge)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  Timestamp,
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
  SyncState,
  SyncStats,
  OfflineQueueItem,
} from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(app);

const STORAGE_KEYS = {
  OFFLINE_QUEUE: 'nantor_v4_sync_offline_queue',
  LAST_SYNC: 'nantor_v4_sync_last_time',
  DEVICE_ID: 'nantor_v4_sync_device_id',
  SYNC_CONFIG: 'nantor_v4_sync_config',
};

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

// Push local collection entity to Firestore (or queue if offline)
export async function syncEntityToCloud(
  collectionName: 'clients' | 'devis' | 'commandes' | 'factures' | 'paiements' | 'fournisseurs' | 'sourcing' | 'rentabilites',
  action: 'create' | 'update' | 'delete',
  documentId: string,
  payload: any
): Promise<boolean> {
  const isOnline = navigator.onLine;

  if (!isOnline) {
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
    const docRef = doc(firestore, collectionName, documentId);

    if (action === 'delete') {
      // Soft-delete or hard delete
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
    return true;
  } catch (error) {
    console.warn(`Erreur sync cloud pour ${collectionName}/${documentId}, mise en file hors ligne:`, error);
    addToOfflineQueue({
      collection: collectionName,
      action,
      documentId,
      payload,
    });
    return false;
  }
}

// Flush pending offline queue
export async function flushOfflineQueue(
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; processed: number; errors: number }> {
  if (!navigator.onLine) {
    return { success: false, processed: 0, errors: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { success: true, processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;
  const remaining: OfflineQueueItem[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      const docRef = doc(firestore, item.collection, item.documentId);
      if (item.action === 'delete') {
        await deleteDoc(docRef);
      } else {
        await setDoc(
          docRef,
          {
            ...item.payload,
            _lastUpdated: item.timestamp,
            _deviceId: getOrCreateDeviceId(),
            _deviceType: detectDeviceType(),
          },
          { merge: true }
        );
      }
      processed++;
      if (onProgress) onProgress(processed, queue.length);
    } catch (err) {
      console.error(`Erreur flush file ${item.collection}/${item.documentId}:`, err);
      errors++;
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
  return { success: errors === 0, processed, errors };
}

// Full Cloud Fetch (Android <-> Windows full snapshot pull & merge)
export async function fetchAllCollectionsFromCloud(): Promise<{
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

  try {
    const collectionsToFetch = [
      'clients',
      'devis',
      'commandes',
      'factures',
      'paiements',
      'fournisseurs',
      'sourcing',
      'rentabilites',
    ];

    const results: any = {};

    await Promise.all(
      collectionsToFetch.map(async (colName) => {
        const colRef = collection(firestore, colName);
        const snapshot = await getDocs(colRef);
        results[colName] = snapshot.docs.map((d) => d.data());
      })
    );

    const rentabilitesMap: Record<string, Rentabilite> = {};
    if (results.rentabilites) {
      results.rentabilites.forEach((r: Rentabilite) => {
        if (r.commandeId) rentabilitesMap[r.commandeId] = r;
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
    console.error('Erreur téléchargement données cloud Firestore:', error);
    return null;
  }
}

// Full Cloud Push (Initial seed or manual full sync of local data)
export async function pushAllLocalDataToCloud(data: {
  clients: Client[];
  devis: Devis[];
  commandes: Commande[];
  factures: Facture[];
  paiements: Paiement[];
  fournisseurs: Fournisseur[];
  sourcingList: Sourcing[];
  rentabilites: Record<string, Rentabilite>;
}): Promise<{ success: boolean; totalUploaded: number; error?: string }> {
  if (!navigator.onLine) {
    return { success: false, totalUploaded: 0, error: 'Appareil hors ligne' };
  }

  try {
    let totalUploaded = 0;
    const deviceId = getOrCreateDeviceId();
    const deviceType = detectDeviceType();
    const now = new Date().toISOString();

    const pushCollection = async (colName: string, items: any[], idField = 'id') => {
      for (const item of items) {
        const docId = item[idField] || `${colName}-${Date.now()}`;
        const docRef = doc(firestore, colName, docId);
        await setDoc(
          docRef,
          {
            ...item,
            _lastUpdated: item.updatedAt || now,
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

    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
    return { success: true, totalUploaded };
  } catch (e: any) {
    console.error('Erreur export complet vers le Cloud:', e);
    return { success: false, totalUploaded: 0, error: e?.message || 'Erreur inconnue' };
  }
}
