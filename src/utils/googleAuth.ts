import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { auth } from './firebase';
export { auth };

// Portées Google Workspace pour le module optionnel Google Sheets (NantorApp -> Sheets)
export const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

export interface AuthErrorInfo {
  code: string;
  message: string;
  timestamp: string;
  domain?: string;
  origin?: string;
}

let lastAuthErrorInfo: AuthErrorInfo | null = null;

export function getLastAuthError(): AuthErrorInfo | null {
  return lastAuthErrorInfo;
}

export function setLastAuthError(err: any): void {
  if (!err) {
    lastAuthErrorInfo = null;
    return;
  }
  const code = err?.code || 'unknown';
  const rawMessage = err?.message || 'Erreur inconnue';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const domain = typeof window !== 'undefined' ? window.location.hostname : '';
  lastAuthErrorInfo = {
    code,
    message: rawMessage,
    timestamp: new Date().toISOString(),
    domain,
    origin,
  };
}

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
let redirectResultPromise: Promise<{ user: User; accessToken: string | null } | null> | null = null;

/**
 * Traduit les codes d'erreur Firebase Auth en messages clairs et compréhensibles.
 */
export function formatAuthErrorMessage(error: any): string {
  if (!error) return 'Erreur de connexion inconnue.';
  const code = error?.code || '';
  const message = error?.message || '';
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'ce domaine';

  switch (code) {
    case 'auth/unauthorized-domain':
      return `Le domaine "${currentHost}" n'est pas autorisé dans Firebase Authentication. Action requise : Connectez-vous à la Console Firebase > Authentication > Paramètres > Domaines autorisés, et ajoutez "${currentHost}".`;
    case 'auth/operation-not-allowed':
      return 'Le fournisseur d\'authentification Google n\'est pas activé dans Firebase. Activez-le dans Firebase Console > Authentication > Sign-in method > Fournisseur Google.';
    case 'auth/popup-blocked':
      return 'La fenêtre contextuelle Google a été bloquée par le navigateur. Autorisez les popups pour ce site ou cliquez sur "Connexion par Redirection".';
    case 'auth/popup-closed-by-user':
      return 'La fenêtre de connexion Google a été fermée avant la sélection du compte. Cliquez à nouveau pour vous identifier.';
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
      return `Erreur interne Firebase (${message}). Vérifiez la configuration du projet.`;
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
 * Utilise un singleton Promise pour éviter les exécutions concurrentes.
 */
export function handleRedirectResult(): Promise<{ user: User; accessToken: string | null } | null> {
  if (redirectResultPromise) {
    return redirectResultPromise;
  }

  redirectResultPromise = (async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        cachedUser = result.user;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
        }
        setLastAuthError(null);
        console.log('[GoogleAuth] Succès retour de redirection Google. UID Firebase:', result.user.uid, 'Email:', result.user.email);
        return { user: result.user, accessToken: cachedAccessToken };
      }
      return null;
    } catch (error: any) {
      console.error('[GoogleAuth] Erreur lors du traitement getRedirectResult:', error?.code, error?.message);
      setLastAuthError(error);
      throw error;
    }
  })();

  return redirectResultPromise;
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

  setLastAuthError(null);
  console.log('[GoogleAuth] Début connexion Google Sign-In (scopes workspace:', includeScopes, 'forceRedirect:', Boolean(options?.forceRedirect), ')...');

  // Détection environnement : iframe AI Studio vs PWA standalone mobile
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Si redirection explicitement forcée et non dans un iframe
  if (options?.forceRedirect && !isInIframe) {
    try {
      console.log('[GoogleAuth] Lancement demandé par redirection (forceRedirect=true)...');
      await signInWithRedirect(auth, provider);
      return new Promise(() => {});
    } catch (redirectError: any) {
      setLastAuthError(redirectError);
      console.warn('[GoogleAuth] signInWithRedirect a échoué:', redirectError);
      throw redirectError;
    }
  }

  // Par défaut sur TOUS les environnements (y compris GitHub Pages, Android et Windows PWA) :
  // Tenter en premier lieu signInWithPopup.
  // Raison critique : Sur GitHub Pages (domaine externe instantafrik-rgb.github.io différent de firebaseapp.com),
  // signInWithPopup utilise window.postMessage et n'est pas bloqué par le partitionnement des cookies tiers,
  // alors que signInWithRedirect perd régulièrement l'état de session OAuth sur les domaines tiers.
  try {
    console.log('[GoogleAuth] Tentative prioritaire via signInWithPopup (zéro perte de session)...');
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    cachedUser = result.user;
    setLastAuthError(null);

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
    setLastAuthError(popupError);
    console.warn('[GoogleAuth] signInWithPopup a échoué:', popupError?.code, popupError?.message);

    // Si le popup est expressément bloqué par le navigateur et qu'on n'est pas dans un iframe,
    // tenter le basculement automatique par redirection
    if ((popupError?.code === 'auth/popup-blocked' || popupError?.code === 'auth/cancelled-popup-request') && !isInIframe) {
      console.log('[GoogleAuth] Popup bloqué par le navigateur. Basculement sur signInWithRedirect...');
      try {
        await signInWithRedirect(auth, provider);
        return new Promise(() => {});
      } catch (redirectErr: any) {
        setLastAuthError(redirectErr);
        throw redirectErr;
      }
    }

    throw popupError;
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
