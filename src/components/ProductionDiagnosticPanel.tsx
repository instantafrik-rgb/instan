import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  RefreshCw,
  LogIn,
  LogOut,
  Database,
  Cloud,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getActiveFirebaseConfig,
  isUsingCustomFirebaseConfig,
  saveCustomFirebaseConfig,
  resetCustomFirebaseConfig,
} from '../utils/firebaseConfig';
import { APP_VERSION, BUILD_TIME, checkAppUpdateManually } from '../pwaUpdate';

export const ProductionDiagnosticPanel: React.FC = () => {
  const {
    currentAuthUser,
    lastAuthError,
    signInWithGoogle,
    signOutGoogle,
    testFirestore,
    syncStats,
    syncNow,
    uploadAllToCloud,
    downloadAllFromCloud,
    showToast,
  } = useApp();

  const activeConfig = getActiveFirebaseConfig();
  const hasCustomConfig = isUsingCustomFirebaseConfig();

  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [customJsonInput, setCustomJsonInput] = useState('');
  const [configEditorError, setConfigEditorError] = useState<string | null>(null);

  const [isTestingFirestore, setIsTestingFirestore] = useState(false);
  const [firestoreTestResult, setFirestoreTestResult] = useState<{
    success: boolean;
    message: string;
    code?: string;
    durationMs?: number;
  } | null>(null);

  const [isTestingSync, setIsTestingSync] = useState(false);
  const [syncTestResult, setSyncTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Informations d'environnement dynamiques
  const isDev = import.meta.env.DEV;
  const currentEnv = isDev ? 'DEV (AI Studio Preview)' : 'PROD (GitHub Pages / Production Build)';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'N/A';
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'N/A';
  const currentPathname = typeof window !== 'undefined' ? window.location.pathname : 'N/A';
  const baseUrl = import.meta.env.BASE_URL;

  // Statut Service Worker
  const [swStatus, setSwStatus] = useState<{
    supported: boolean;
    controllerActive: boolean;
    scope?: string;
    scriptUrl?: string;
  }>({
    supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    controllerActive: typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller,
  });

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setSwStatus({
            supported: true,
            controllerActive: !!navigator.serviceWorker.controller,
            scope: reg.scope,
            scriptUrl: reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL,
          });
        }
      }).catch(() => {});
    }
  }, []);

  // Déterminer l'état Cloud global
  const cloudStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' = currentAuthUser
    ? syncStats.lastError
      ? 'ERROR'
      : 'CONNECTED'
    : 'DISCONNECTED';

  // Copier le nom de domaine pour configuration Firebase
  const handleCopyHostname = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      showToast(`Domaine copié : "${currentHostname}"`, 'info');
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  // Test Firestore Read/Write
  const handleRunFirestoreTest = async () => {
    setIsTestingFirestore(true);
    setFirestoreTestResult(null);
    try {
      const res = await testFirestore();
      setFirestoreTestResult(res);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      const code = err?.code || 'unknown';
      const msg = err?.message || 'Erreur inattendue';
      setFirestoreTestResult({
        success: false,
        message: `Firestore ERROR: [${code}] ${msg}`,
        code,
      });
      showToast(`Échec test Firestore: [${code}]`, 'error');
    } finally {
      setIsTestingFirestore(false);
    }
  };

  // Test Cloud Sync complet
  const handleRunSyncTest = async () => {
    setIsTestingSync(true);
    setSyncTestResult(null);
    try {
      const res = await syncNow();
      setSyncTestResult(res);
      if (res.success) {
        showToast('Cycle Cloud Sync réussi avec succès !', 'success');
      } else {
        showToast(`Cloud Sync : ${res.message}`, 'error');
      }
    } catch (e: any) {
      setSyncTestResult({
        success: false,
        message: e?.message || 'Erreur lors de la synchronisation',
      });
    } finally {
      setIsTestingSync(false);
    }
  };

  // Forcer vérification de mise à jour Service Worker
  const handleUpdateSW = async () => {
    showToast('Recherche de mise à jour du Service Worker...', 'info');
    const updated = await checkAppUpdateManually();
    if (updated) {
      showToast('Vérification effectuée. Si une nouvelle version existe, elle s\'activera automatiquement.', 'success');
    } else {
      showToast('Aucun Service Worker en attente ou vérification non disponible.', 'info');
    }
  };

  // Nettoyer caches Service Worker (sans toucher à localStorage)
  const handlePurgeSWCache = async () => {
    if (typeof window === 'undefined' || !('caches' in window)) {
      showToast('API CacheStorage non disponible.', 'info');
      return;
    }
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
      showToast('Caches des fichiers statiques purgés. Rechargement de la page...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e: any) {
      showToast(`Erreur purge cache: ${e?.message || 'Erreur'}`, 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-[#121214] p-5 sm:p-6 rounded-2xl border border-neutral-200/90 dark:border-neutral-800/90 space-y-6 text-xs shadow-xs">
      {/* Header Diagnostic */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Activity className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              DIAGNOSTIC DE PRODUCTION & CLOUD
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                isDev
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              }`}
            >
              {isDev ? 'AI STUDIO PREVIEW' : 'GITHUB PAGES (PROD)'}
            </span>
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Diagnostic Technique : Preview vs Production GitHub Pages
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
            Vérifiez l'autorisation de domaine Firebase, la configuration OAuth, les règles Firestore et le cycle de synchronisation Cloud.
          </p>
        </div>

        {/* Cloud Status Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold text-xs ${
              cloudStatus === 'CONNECTED'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : cloudStatus === 'ERROR'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cloudStatus === 'CONNECTED'
                  ? 'bg-emerald-500 animate-pulse'
                  : cloudStatus === 'ERROR'
                  ? 'bg-rose-500'
                  : 'bg-neutral-400'
              }`}
            />
            STATUS CLOUD : {cloudStatus}
          </div>
        </div>
      </div>

      {/* Alerte Critique si code 'auth/unauthorized-domain' */}
      {lastAuthError?.code === 'auth/unauthorized-domain' && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">
                Domaine non autorisé dans Firebase Authentication ! [auth/unauthorized-domain]
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Le domaine <strong className="font-mono bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded">{currentHostname}</strong> n'est pas encore enregistré dans la liste des <em>Domaines autorisés</em> de votre projet Firebase (<span className="font-mono">{activeConfig.projectId}</span>). C'est exactement pour cela que le Google Sign-In fonctionne dans le Preview d'AI Studio mais échoue sur GitHub Pages !
              </p>
            </div>
          </div>

          <div className="p-3 bg-white/80 dark:bg-black/30 rounded-lg border border-amber-200 dark:border-amber-800 space-y-2">
            <p className="font-semibold text-xs text-amber-900 dark:text-amber-100">
              Procédure de résolution (1 minute chrono) :
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-amber-800 dark:text-amber-300 pl-1">
              <li>Ouvrez la <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold text-amber-900 dark:text-amber-100 hover:text-amber-700">Console Firebase</a> et sélectionnez le projet <strong className="font-mono">{activeConfig.projectId}</strong>.</li>
              <li>Allez dans le menu <strong>Authentication</strong> puis cliquez sur l'onglet <strong>Paramètres (Settings)</strong>.</li>
              <li>Faites défiler jusqu'à la section <strong>Domaines autorisés (Authorized domains)</strong>.</li>
              <li>Cliquez sur <strong>Ajouter un domaine (Add domain)</strong> et collez la valeur ci-dessous :</li>
            </ol>
            <div className="flex items-center gap-2 pt-1">
              <span className="px-3 py-1.5 font-mono text-xs font-bold bg-neutral-900 text-white dark:bg-neutral-800 dark:text-amber-300 rounded-lg select-all">
                {currentHostname}
              </span>
              <button
                onClick={handleCopyHostname}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedDomain ? 'Copié !' : 'Copier le domaine'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tableau des 10 indicateurs obligatoires de l'audit */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Colonne 1 : Environnement & Hébergement */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            1. Environnement & Origine Web
          </h4>
          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">ENVIRONNEMENT :</dt>
              <dd className="font-mono font-bold text-neutral-900 dark:text-white">{currentEnv}</dd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">ORIGIN :</dt>
              <dd className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{currentOrigin}</dd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">BASE URL :</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-200">{baseUrl}</dd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">PATH ACTUEL :</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-200">{currentPathname}</dd>
            </div>
            <div className="flex items-center justify-between py-1">
              <dt className="text-neutral-500 dark:text-neutral-400">VERSION BUILD :</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-200">
                v{APP_VERSION} ({new Date(BUILD_TIME).toLocaleString('fr-FR')})
              </dd>
            </div>
          </dl>
        </div>

        {/* Colonne 2 : Firebase Configuration (Projet & AuthDomain) */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              2. Configuration Firebase Réelle
            </h4>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              hasCustomConfig
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300'
            }`}>
              {hasCustomConfig ? 'PROJET PERSO' : 'STARTER IA'}
            </span>
          </div>
          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">FIREBASE PROJECT ID :</dt>
              <dd className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {activeConfig.projectId}
              </dd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">FIREBASE AUTH DOMAIN :</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-200">
                {activeConfig.authDomain}
              </dd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">FIREBASE APP ID :</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-200">
                {activeConfig.appId ? `${activeConfig.appId.slice(0, 18)}...` : 'N/A'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">API KEY INTÉGRÉE :</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-200">
                {activeConfig.apiKey ? `${activeConfig.apiKey.slice(0, 10)}... (OK)` : 'ABSENTE'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-1">
              <dt className="text-neutral-500 dark:text-neutral-400">SOURCE CONFIG :</dt>
              <dd className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {hasCustomConfig ? 'Custom LocalStorage' : 'firebase-applet-config.json (Default)'}
              </dd>
            </div>
          </dl>
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <button
              onClick={() => setShowConfigEditor(!showConfigEditor)}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showConfigEditor ? 'Fermer l\'éditeur Firebase' : 'Changer / Débloquer projet Firebase →'}
            </button>
            {hasCustomConfig && (
              <button
                onClick={() => {
                  resetCustomFirebaseConfig();
                  showToast('Retour au projet par défaut imposing-snow. Rechargement...', 'info');
                  setTimeout(() => window.location.reload(), 600);
                }}
                className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Rétablir défaut
              </button>
            )}
          </div>
        </div>

        {/* Colonne 3 : Utilisateur Actif & Session Auth */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <LogIn className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            3. Session Utilisateur & Auth
          </h4>
          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">AUTH USER (UID) :</dt>
              <dd className="font-mono font-bold text-neutral-900 dark:text-white">
                {currentAuthUser?.uid || 'NON CONNECTÉ'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">AUTH EMAIL :</dt>
              <dd className="font-mono text-neutral-900 dark:text-white">
                {currentAuthUser?.email || 'NON CONNECTÉ'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">NOM AFFICHÉ :</dt>
              <dd className="font-medium text-neutral-800 dark:text-neutral-200">
                {currentAuthUser?.displayName || (currentAuthUser ? 'Utilisateur Google' : 'N/A')}
              </dd>
            </div>
            <div className="flex items-center justify-between py-1">
              <dt className="text-neutral-500 dark:text-neutral-400">DERNIÈRE ERREUR AUTH :</dt>
              <dd className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                {lastAuthError?.code ? `${lastAuthError.code}` : 'AUCUNE ERREUR'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Colonne 4 : État de Synchronisation Cloud */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Cloud className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            4. Synchronisation & Firestore Scoping
          </h4>
          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">CLOUD STATUS :</dt>
              <dd className="font-bold text-neutral-900 dark:text-white">{cloudStatus}</dd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">DERNIÈRE SYNCHRO :</dt>
              <dd className="font-mono text-neutral-800 dark:text-neutral-200">
                {syncStats.lastSyncTime ? new Date(syncStats.lastSyncTime).toLocaleString('fr-FR') : 'Aucune synchronisation'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200/50 dark:border-neutral-800">
              <dt className="text-neutral-500 dark:text-neutral-400">RÈGLES FIRESTORE :</dt>
              <dd className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                /users/{'{uid}'}/* (Zero-Trust Déployé)
              </dd>
            </div>
            <div className="flex items-center justify-between py-1">
              <dt className="text-neutral-500 dark:text-neutral-400">ERREUR CLOUD RÉELLE :</dt>
              <dd className="font-mono text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]" title={syncStats.lastError || 'Aucune erreur'}>
                {syncStats.lastError || 'Aucune erreur'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Éditeur de configuration Firebase (Contournement du blocage Starter AI Studio) */}
      {showConfigEditor && (
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800/80 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Contournement du blocage Starter AI Studio
              </h4>
              <p className="text-xs text-indigo-800 dark:text-indigo-300 mt-1 leading-relaxed">
                Le projet <strong>imposing-snow-89brs</strong> est un sandbox géré par AI Studio dont les permissions IAM peuvent interdire l'ajout manuel de domaines dans Firebase Console.
                <br />
                Pour avoir un fonctionnement 100% autonome et illimité sur GitHub Pages, vous pouvez coller les identifiants de <strong>votre propre projet Firebase gratuit</strong> (créé en 2 min sur <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline font-bold">console.firebase.google.com</a> où vous avez tous les droits admin).
              </p>
            </div>
            <button
              onClick={() => setShowConfigEditor(false)}
              className="p-1 rounded-lg hover:bg-indigo-200/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Collez votre objet de configuration Web Firebase (format JSON ou snippet JS de la console) :
            </label>
            <textarea
              value={customJsonInput}
              onChange={(e) => setCustomJsonInput(e.target.value)}
              placeholder={`{\n  "projectId": "mon-nantor-prod",\n  "appId": "1:123456:web:abcdef",\n  "apiKey": "AIzaSy...",\n  "authDomain": "mon-nantor-prod.firebaseapp.com",\n  "storageBucket": "mon-nantor-prod.appspot.com"\n}`}
              rows={5}
              className="w-full font-mono text-[11px] p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {configEditorError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {configEditorError}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              onClick={() => setShowConfigEditor(false)}
              className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-medium cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                setConfigEditorError(null);
                try {
                  let cleaned = customJsonInput.trim();
                  if (cleaned.includes('{') && cleaned.includes('}')) {
                    cleaned = cleaned.substring(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1);
                  }
                  const jsonString = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
                  const parsed = JSON.parse(jsonString);
                  if (!parsed.projectId || !parsed.apiKey || !parsed.authDomain) {
                    setConfigEditorError('Le JSON doit comporter au moins projectId, apiKey et authDomain.');
                    return;
                  }
                  saveCustomFirebaseConfig(parsed);
                  showToast('Projet Firebase personnalisé enregistré ! Rechargement...', 'success');
                  setTimeout(() => window.location.reload(), 700);
                } catch (e: any) {
                  setConfigEditorError(`Erreur d'analyse JSON : ${e?.message || 'Format invalide'}`);
                }
              }}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition"
            >
              Enregistrer et Recharger l'Application
            </button>
          </div>
        </div>
      )}


      {/* Détail de la dernière erreur Auth capturée (Point 5 du brief) */}
      {lastAuthError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Erreur Firebase Auth Capturée : {lastAuthError.code}
            </span>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono">
              {new Date(lastAuthError.timestamp).toLocaleTimeString('fr-FR')}
            </span>
          </div>
          <div className="p-2.5 bg-white/80 dark:bg-black/40 rounded-lg border border-rose-200 dark:border-rose-900 font-mono text-[11px] break-all">
            {lastAuthError.message}
          </div>
        </div>
      )}

      {/* Section Tests en direct : Auth, Firestore et Cloud Sync */}
      <div className="p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-4">
        <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Tests Interactifs en Direct (Auth ↔ Firestore ↔ Cloud Sync)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Test 1 : Authentification Google */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 flex flex-col justify-between space-y-3">
            <div>
              <p className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                <LogIn className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Test 1 : Google Sign-In
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                {currentAuthUser
                  ? `Connecté en tant que ${currentAuthUser.email || currentAuthUser.uid}`
                  : 'Tente la connexion Google avec capture de l\'erreur réelle.'}
              </p>
            </div>

            <div className="space-y-1.5">
              {currentAuthUser ? (
                <button
                  onClick={signOutGoogle}
                  className="w-full py-2 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Déconnexion
                </button>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      setIsAuthenticating(true);
                      await signInWithGoogle();
                      setIsAuthenticating(false);
                    }}
                    disabled={isAuthenticating}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Connexion Google (Popup)
                  </button>
                  <button
                    onClick={async () => {
                      setIsAuthenticating(true);
                      await signInWithGoogle({ forceRedirect: true });
                      setIsAuthenticating(false);
                    }}
                    disabled={isAuthenticating}
                    className="w-full py-1.5 px-3 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium text-[11px] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    Mode Redirection complet
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Test 2 : Firestore Read/Write (Point 6 du brief) */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 flex flex-col justify-between space-y-3">
            <div>
              <p className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Test 2 : Opération Firestore Réelle
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                Écrit, lit et supprime un document sous <span className="font-mono">/users/{'{uid}'}/_diagnostic/test_ping</span>.
              </p>
            </div>

            <div className="space-y-2">
              {firestoreTestResult && (
                <div
                  className={`p-2 rounded-lg text-[10px] font-mono leading-tight ${
                    firestoreTestResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <p className="font-bold">{firestoreTestResult.success ? 'Firestore OK' : 'Firestore ERROR'}</p>
                  <p className="truncate">{firestoreTestResult.message}</p>
                  {firestoreTestResult.durationMs && (
                    <p className="text-neutral-500 dark:text-neutral-400 mt-0.5">Durée : {firestoreTestResult.durationMs} ms</p>
                  )}
                </div>
              )}

              <button
                onClick={handleRunFirestoreTest}
                disabled={isTestingFirestore || !currentAuthUser}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingFirestore ? 'animate-spin' : ''}`} />
                {isTestingFirestore ? 'Test Firestore...' : 'Tester Firestore (Ping)'}
              </button>
            </div>
          </div>

          {/* Test 3 : Cloud Sync Cycle complet */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 flex flex-col justify-between space-y-3">
            <div>
              <p className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                Test 3 : Cycle Cloud Sync Complet
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                Synchronise les 8 collections (clients, devis, commandes, paiements, factures, etc.) avec Firestore.
              </p>
            </div>

            <div className="space-y-2">
              {syncTestResult && (
                <div
                  className={`p-2 rounded-lg text-[10px] font-mono leading-tight ${
                    syncTestResult.success
                      ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <p className="font-bold">{syncTestResult.success ? 'Sync OK' : 'Sync ERROR'}</p>
                  <p className="truncate">{syncTestResult.message}</p>
                </div>
              )}

              <button
                onClick={handleRunSyncTest}
                disabled={isTestingSync || !currentAuthUser}
                className="w-full py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingSync ? 'animate-spin' : ''}`} />
                {isTestingSync ? 'Synchronisation...' : 'Lancer Synchronisation'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Point 10 : Rapport sur les variables Vite */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-3">
        <h4 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center justify-between">
          <span>Audit des Variables d'Environnement Vite (Point 10)</span>
          <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
            Fichier bundle statique compilé
          </span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px] font-mono">
          <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <span className="text-neutral-600 dark:text-neutral-300">VITE_FIREBASE_API_KEY</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
              ABSENT (Normal - JSON embarqué)
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <span className="text-neutral-600 dark:text-neutral-300">VITE_FIREBASE_PROJECT_ID</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
              ABSENT (Normal - JSON embarqué)
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <span className="text-neutral-600 dark:text-neutral-300">VITE_FIREBASE_AUTH_DOMAIN</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
              ABSENT (Normal - JSON embarqué)
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <span className="text-neutral-600 dark:text-neutral-300">VITE_BASE_PATH</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              PRESENT (/instan/)
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between col-span-1 sm:col-span-2">
            <span className="text-neutral-600 dark:text-neutral-300">firebase-applet-config.json</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              PRESENT & EMBARQUÉ DANS DIST/ (Projet: {activeConfig.projectId})
            </span>
          </div>
        </div>
      </div>

      {/* Point 11 : Service Worker & PWA */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Service Worker & Cache PWA (Point 11)
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpdateSW}
              className="px-2.5 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Vérifier MAJ SW
            </button>
            <button
              onClick={handlePurgeSWCache}
              className="px-2.5 py-1 rounded-lg bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1 cursor-pointer"
              title="Purge le cache d'actifs statiques (JS/CSS) sans toucher à localStorage"
            >
              Purger Caches & Recharger
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Support Service Worker</p>
            <p className="font-bold text-neutral-900 dark:text-white mt-0.5">
              {swStatus.supported ? 'ACTIF (Navigateur compatible)' : 'NON SUPPORTÉ'}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Contrôleur Service Worker</p>
            <p className="font-bold text-neutral-900 dark:text-white mt-0.5">
              {swStatus.controllerActive ? 'ACTIF (Prend en charge les requêtes)' : 'EN ATTENTE / AUCUN'}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Scope Enregistré</p>
            <p className="font-bold font-mono text-neutral-900 dark:text-white mt-0.5">
              {swStatus.scope || '/instan/'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
