/**
 * Nantor Sourcing App - Centralized Firebase Configuration Manager
 * 
 * Supports:
 * 1. Default config from firebase-applet-config.json (Production: nantor-sourcing-prod)
 * 2. Build-time environment variables (import.meta.env.VITE_FIREBASE_*)
 * 3. Runtime custom configuration saved in localStorage
 */

import defaultConfig from '../../firebase-applet-config.json';

export interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

const STORAGE_KEY_CUSTOM_CONFIG = 'nantor_custom_firebase_config';

/**
 * Récupère la configuration Firebase active.
 */
export function getActiveFirebaseConfig(): FirebaseAppConfig {
  // 1. Vérifier si l'utilisateur a configuré un projet Firebase personnalisé dans les paramètres
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.projectId && parsed.apiKey && parsed.authDomain) {
          return {
            ...defaultConfig,
            ...parsed,
          };
        }
      }
    } catch (e) {
      console.warn('[FirebaseConfig] Erreur lecture config personnalisée:', e);
    }
  }

  // 2. Vérifier les variables d'environnement de build (VITE_FIREBASE_*)
  const envConfig: Partial<FirebaseAppConfig> = {};
  if (import.meta.env.VITE_FIREBASE_PROJECT_ID) envConfig.projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (import.meta.env.VITE_FIREBASE_API_KEY) envConfig.apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) envConfig.authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  if (import.meta.env.VITE_FIREBASE_APP_ID) envConfig.appId = import.meta.env.VITE_FIREBASE_APP_ID;
  if (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) envConfig.storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  if (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) envConfig.messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;

  if (envConfig.projectId && envConfig.apiKey) {
    return {
      ...defaultConfig,
      ...envConfig,
    } as FirebaseAppConfig;
  }

  // 3. Fallback sur le projet par défaut (imposing-snow-89brs)
  return defaultConfig as FirebaseAppConfig;
}

/**
 * Enregistre une configuration Firebase personnalisée dans le localStorage.
 */
export function saveCustomFirebaseConfig(config: FirebaseAppConfig): boolean {
  if (!config.projectId || !config.apiKey || !config.authDomain) {
    throw new Error('La configuration Firebase doit inclure au minimum projectId, apiKey et authDomain.');
  }
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_CONFIG, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('[FirebaseConfig] Impossible de sauvegarder la configuration:', e);
    return false;
  }
}

/**
 * Réinitialise la configuration Firebase sur le projet par défaut (imposing-snow-89brs).
 */
export function resetCustomFirebaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_CONFIG);
  } catch (e) {
    console.warn('[FirebaseConfig] Erreur réinitialisation config:', e);
  }
}

/**
 * Indique si une configuration Firebase personnalisée est actuellement active.
 */
export function isUsingCustomFirebaseConfig(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY_CUSTOM_CONFIG));
  } catch {
    return false;
  }
}
