import { registerSW } from 'virtual:pwa-register';

// Version applicative et date de build pour diagnostic (Point 11 de la demande)
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '4.3.0';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

// Variable globale de diagnostic disponible dans la console DevTools (Android Chrome / Windows Edge)
if (typeof window !== 'undefined') {
  (window as any).__NANTOR_APP_VERSION__ = APP_VERSION;
  (window as any).__NANTOR_BUILD_TIME__ = BUILD_TIME;
  console.log(
    `%c[NantorApp PWA] Initialisé - Version ${APP_VERSION} | Build: ${BUILD_TIME} | Scope: /instan/`,
    'background: #09090b; color: #10b981; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
  );
}

let swRegistration: ServiceWorkerRegistration | null = null;
let isRefreshing = false;

/**
 * Initialise le cycle de vie du Service Worker PWA et active les mises à jour automatiques.
 */
export function initPWAUpdate(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // En environnement de développement local ou dans le preview AI Studio,
  // désactiver le Service Worker et nettoyer tout ancien Service Worker pour garantir un affichage immédiat
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
    return;
  }

  // Écoute le changement de contrôleur (quand le nouveau SW prend le contrôle des clients)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!isRefreshing) {
      isRefreshing = true;
      console.log('[NantorApp PWA] Nouveau Service Worker actif : rechargement transparent de l\'application...');
      window.location.reload();
    }
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[NantorApp PWA] Nouvelle version prête à être activée.');
      // Force l'activation du nouveau Service Worker
      updateSW(true);
    },
    onOfflineReady() {
      console.log('[NantorApp PWA] Application mise en cache pour consultation hors ligne.');
    },
    onRegisteredSW(_swScriptUrl, registration) {
      if (!registration) return;
      swRegistration = registration;
      console.log('[NantorApp PWA] Service Worker enregistré avec succès pour /instan/.');

      // 1. Contrôle immédiat auprès de GitHub Pages lors du démarrage
      if (navigator.onLine) {
        registration.update().catch((err) => {
          console.debug('[NantorApp PWA] Vérification initiale de mise à jour:', err);
        });
      }

      // 2. Contrôle périodique toutes les 30 minutes
      setInterval(() => {
        if (navigator.onLine && swRegistration) {
          console.log('[NantorApp PWA] Vérification périodique des mises à jour sur GitHub Pages...');
          swRegistration.update().catch(() => {});
        }
      }, 30 * 60 * 1000);

      // 3. Contrôle à la reprise de l'application (passage au premier plan sur Android ou Windows)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine && swRegistration) {
          console.log('[NantorApp PWA] Reprise au premier plan : vérification de nouvelle version...');
          swRegistration.update().catch(() => {});
        }
      });

      // 4. Contrôle au retour de la connectivité réseau
      window.addEventListener('online', () => {
        if (swRegistration) {
          console.log('[NantorApp PWA] Connexion Internet rétablie : recherche de mise à jour...');
          swRegistration.update().catch(() => {});
        }
      });
    },
    onRegisterError(error) {
      console.warn('[NantorApp PWA] Erreur lors de l\'enregistrement du Service Worker:', error);
    },
  });
}

/**
 * Fonction utilitaire de diagnostic pour vérifier manuellement si une mise à jour est disponible.
 */
export async function checkAppUpdateManually(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    const reg = swRegistration || (await navigator.serviceWorker.getRegistration('/instan/'));
    if (reg) {
      console.log('[NantorApp PWA] Vérification manuelle de mise à jour lancée...');
      await reg.update();
      return true;
    }
  } catch (e) {
    console.warn('[NantorApp PWA] Impossible de vérifier la mise à jour:', e);
  }
  return false;
}
