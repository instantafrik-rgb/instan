import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialisation Firebase App (singleton réutilisable)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Activer la persistance locale du token d'authentification pour conserver la session
// entre les réouvertures de la PWA sur Android, Windows et navigateur
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('[GoogleAuth] Impossible d\'activer browserLocalPersistence:', err);
});

// Portées Google Workspace pour le module optionnel Google Sheets (NantorApp -> Sheets)
export const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

/**
 * Génère le provider Google Auth selon le besoin :
 * - Mode normal (Cloud Sync Firestore) : profile, email, openid uniquement (zéro blocage OAuth).
 * - Mode Workspace (Google Sheets) : ajoute les scopes Sheets/Drive si explicitement demandés.
 */
export function createGoogleProvider(includeWorkspaceScopes = false): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  // Toujours proposer le sélecteur de compte Google pour choisir le profil désiré
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  if (includeWorkspaceScopes) {
    GOOGLE_WORKSPACE_SCOPES.forEach((scope) => {
      provider.addScope(scope);
    });
  }

  return provider;
}

// Variables de cache mémoire de session
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;
let redirectResultHandled = false;

/**
 * Traduit les codes d'erreur Firebase Auth en messages clairs et compréhensibles.
 */
export function formatAuthErrorMessage(error: any): string {
  if (!error) return 'Erreur de connexion inconnue.';
  const code = error?.code || '';
  const message = error?.message || '';

  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Le domaine de l\'application (instantafrik-rgb.github.io ou domaine actuel) n\'est pas encore autorisé dans Firebase Authentication. Rendez-vous sur Firebase Console > Authentication > Paramètres > Domaines autorisés pour ajouter ce domaine.';
    case 'auth/operation-not-allowed':
      return 'La connexion avec Google n\'est pas activée dans Firebase. Activez le fournisseur Google dans Firebase Console > Authentication > Sign-in method.';
    case 'auth/popup-blocked':
      return 'La fenêtre de connexion Google a été bloquée par votre navigateur. Autorisez les popups pour ce site ou utilisez la redirection.';
    case 'auth/popup-closed-by-user':
      return 'La fenêtre de connexion Google a été fermée avant la sélection du compte. Cliquez à nouveau sur "Connecter avec Google" pour vous identifier.';
    case 'auth/cancelled-popup-request':
      return 'Une tentative de connexion Google est déjà en cours dans une autre fenêtre ou a été interrompue. Veuillez réessayer.';
    case 'auth/invalid-api-key':
      return 'La clé API Firebase est invalide ou restreinte dans Google Cloud Console.';
    case 'auth/invalid-oauth-client-id':
      return 'L\'identifiant client OAuth Google est invalide ou introuvable.';
    case 'auth/account-exists-with-different-credential':
      return 'Un compte existe déjà avec cette adresse email mais avec un mode de connexion différent.';
    case 'auth/network-request-failed':
      return 'Erreur de connexion réseau : impossible de joindre les serveurs Google/Firebase. Vérifiez votre accès Internet.';
    case 'auth/user-disabled':
      return 'Ce compte utilisateur a été désactivé dans Firebase Authentication.';
    case 'auth/internal-error':
      return 'Erreur interne Firebase. Vérifiez la configuration du projet Firebase.';
    default:
      if (message.includes('popup')) {
        return 'La fenêtre contextuelle Google a été bloquée ou interrompue.';
      }
      return message || 'Échec de l\'authentification avec Google.';
  }
}

/**
 * Traite le retour d'une authentification par redirection Google (signInWithRedirect).
 * Crucial pour les environnements PWA Android / Windows où les popups peuvent échouer.
 */
export async function handleRedirectResult(): Promise<{ user: User; accessToken: string | null } | null> {
  if (redirectResultHandled) return null;
  redirectResultHandled = true;

  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      cachedUser = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }
      console.log('[GoogleAuth] Succès retour de redirection Google. UID Firebase:', result.user.uid, 'Email:', result.user.email);
      return { user: result.user, accessToken: cachedAccessToken };
    }
  } catch (error: any) {
    console.error('[GoogleAuth] Erreur lors du traitement getRedirectResult:', error);
    throw error;
  }
  return null;
}

/**
 * Lance l'authentification Google avec gestion intelligente Popup <-> Redirection.
 */
export const googleSignIn = async (options?: {
  includeWorkspaceScopes?: boolean;
  forceRedirect?: boolean;
}): Promise<{ user: User; accessToken: string }> => {
  const includeScopes = Boolean(options?.includeWorkspaceScopes);
  const provider = createGoogleProvider(includeScopes);

  console.log('[GoogleAuth] Début connexion Google Sign-In (scopes workspace:', includeScopes, ')...');

  // Détection environnement : iframe AI Studio vs PWA standalone mobile
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as any).standalone)
  );

  // Si l'utilisateur est dans une iframe (ex: preview AI Studio), signInWithRedirect est bloqué par SameOrigin,
  // donc signInWithPopup est impératif.
  const shouldTryPopupFirst = isInIframe || (!options?.forceRedirect && !isStandalone && !isMobile);

  if (shouldTryPopupFirst) {
    try {
      console.log('[GoogleAuth] Tentative via signInWithPopup...');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }
      cachedUser = result.user;

      console.log(
        '[GoogleAuth] Succès Google Sign-In via Popup. UID Firebase:',
        result.user.uid,
        'Email:',
        result.user.email,
        'Nom:',
        result.user.displayName
      );

      // Si des scopes Google Sheets étaient spécifiquement demandés mais qu'aucun token n'est retourné
      if (includeScopes && !cachedAccessToken) {
        throw new Error('Jeton d\'accès Google Sheets non retourné par Google.');
      }

      return { user: result.user, accessToken: cachedAccessToken || '' };
    } catch (popupError: any) {
      console.warn('[GoogleAuth] signInWithPopup a échoué ou a été bloqué:', popupError?.code, popupError?.message);

      // Si le popup a été bloqué et qu'on n'est pas dans un iframe, on tente le fallback par redirection
      if ((popupError?.code === 'auth/popup-blocked' || popupError?.code === 'auth/cancelled-popup-request') && !isInIframe) {
        console.log('[GoogleAuth] Basculement automatique sur signInWithRedirect...');
        await signInWithRedirect(auth, provider);
        // signInWithRedirect redirige la page entière, la promise ne résout pas immédiatement
        return new Promise(() => {});
      }

      throw popupError;
    }
  } else {
    // Environnement mobile standalone ou demande explicite de redirection
    try {
      console.log('[GoogleAuth] Lancement direct via signInWithRedirect (mobile/standalone)...');
      await signInWithRedirect(auth, provider);
      return new Promise(() => {});
    } catch (redirectError: any) {
      console.warn('[GoogleAuth] signInWithRedirect a échoué, essai de repli via popup:', redirectError);
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }
      cachedUser = result.user;
      return { user: result.user, accessToken: cachedAccessToken || '' };
    }
  }
};

/**
 * Initialise l'écouteur d'état d'authentification Firebase.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // 1. Vérifier si l'utilisateur revient d'une redirection OAuth
  handleRedirectResult()
    .then((res) => {
      if (res?.user && onAuthSuccess) {
        onAuthSuccess(res.user, res.accessToken || '');
      }
    })
    .catch((err) => {
      console.warn('[GoogleAuth] Erreur au traitement de retour redirect:', err);
    });

  // 2. Écouter les changements de session Firebase Auth
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      console.log('[GoogleAuth] Utilisateur Firebase actif détecté. UID:', user.uid, 'Email:', user.email);
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken || '');
      }
    } else {
      console.log('[GoogleAuth] Aucun utilisateur Firebase connecté.');
      cachedAccessToken = null;
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getCurrentGoogleUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

export const getCurrentUserId = (): string | null => {
  return auth.currentUser ? auth.currentUser.uid : (cachedUser ? cachedUser.uid : null);
};

export const onAuthUserChanged = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    cachedUser = user;
    callback(user);
  });
};

export const googleLogout = async (): Promise<void> => {
  console.log('[GoogleAuth] Déconnexion demandée...');
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
  console.log('[GoogleAuth] Déconnexion terminée avec succès.');
};
