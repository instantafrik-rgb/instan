import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Plus,
  FolderDown,
  FolderUp,
  Cloud,
  LogOut,
  Sparkles,
  Search,
  Table,
  Users,
  Package,
  ShoppingBag,
  CreditCard,
  Building2,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  initAuth,
  googleSignIn,
  googleLogout,
  getAccessToken,
  getCurrentGoogleUser,
} from '../utils/googleAuth';
import {
  createDedicatedSpreadsheet,
  listUserSpreadsheets,
  syncAllDataToGoogleSheets,
  writeSheetValues,
  readSheetValues,
  GoogleSpreadsheetItem,
} from '../utils/googleSheets';
import { formatDate } from '../utils/formatters';

interface GoogleSheetsViewProps {
  onNavigateTab?: (tab: any) => void;
}

export const GoogleSheetsView: React.FC<GoogleSheetsViewProps> = ({ onNavigateTab }) => {
  const {
    commandes,
    devis,
    sourcingList,
    clients,
    fournisseurs,
    paiements,
    parametres,
    updateParametres,
    logEvent,
  } = useApp();

  // Auth state
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sheets state
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState<string>(
    parametres.googleSheetsSpreadsheetId || ''
  );
  const [activeSpreadsheetUrl, setActiveSpreadsheetUrl] = useState<string>(
    parametres.googleSheetsSpreadsheetUrl || ''
  );
  const [driveSpreadsheets, setDriveSpreadsheets] = useState<GoogleSpreadsheetItem[]>([]);
  const [isLoadingDriveList, setIsLoadingDriveList] = useState(false);
  const [customSheetInput, setCustomSheetInput] = useState('');

  // Operations state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [activeSheetTab, setActiveSheetTab] = useState<'sync' | 'select' | 'import'>('sync');

  // Confirmation modal state for mutating operations (as required by Workspace Skill)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Import preview state
  const [importResult, setImportResult] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // 1. Initialize Auth on Mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        setAuthError(null);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );

    // Initial check
    const current = getCurrentGoogleUser();
    if (current) {
      setGoogleUser(current);
      getAccessToken().then((tok) => {
        if (tok) setAccessToken(tok);
      });
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Fetch Drive spreadsheets when authenticated
  useEffect(() => {
    if (accessToken) {
      fetchDriveSpreadsheets(accessToken);
    }
  }, [accessToken]);

  const fetchDriveSpreadsheets = async (token: string) => {
    setIsLoadingDriveList(true);
    try {
      const items = await listUserSpreadsheets(token);
      setDriveSpreadsheets(items);
    } catch (err: any) {
      console.warn('Could not list drive spreadsheets', err);
    } finally {
      setIsLoadingDriveList(false);
    }
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const { user, accessToken: token } = await googleSignIn();
      setGoogleUser(user);
      setAccessToken(token);
      updateParametres({
        googleDriveConnected: true,
        googleDriveEmail: user.email || undefined,
      });
      logEvent('Connexion Google Workspace réussie', user.email || 'Compte Google', 'Système');
      fetchDriveSpreadsheets(token);
    } catch (err: any) {
      setAuthError(err.message || 'Échec de la connexion à Google');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await googleLogout();
    setGoogleUser(null);
    setAccessToken(null);
    updateParametres({
      googleDriveConnected: false,
    });
    logEvent('Déconnexion Google Workspace', 'Session fermée', 'Système');
  };

  // Helper to extract Spreadsheet ID from URL or Raw ID
  const extractSpreadsheetId = (input: string): string => {
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
    return input.trim();
  };

  // Create new dedicated sheet
  const handleCreateNewSpreadsheet = async () => {
    if (!accessToken) {
      setAuthError('Veuillez vous connecter à votre compte Google pour créer un classeur.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Créer un nouveau classeur Google Sheets ?',
      message: `Cette action créera un classeur intitulé "Nantor Sourcing - Suivi Commandes & Sourcing (Togo-Chine)" dans votre Google Drive, avec 6 onglets prêts pour l'exportation.`,
      onConfirm: async () => {
        setIsSyncing(true);
        setSyncErrorMsg(null);
        setSyncSuccessMsg(null);

        try {
          const created = await createDedicatedSpreadsheet(
            `Nantor Sourcing - Suivi & Logistique (${new Date().toLocaleDateString('fr-FR')})`,
            accessToken
          );

          setActiveSpreadsheetId(created.id);
          setActiveSpreadsheetUrl(created.url);
          updateParametres({
            googleSheetsSpreadsheetId: created.id,
            googleSheetsSpreadsheetUrl: created.url,
          });

          // Perform initial sync into the newly created sheet
          await syncAllDataToGoogleSheets(
            created.id,
            {
              commandes,
              devis,
              sourcingList,
              clients,
              fournisseurs,
              paiements,
              devise: parametres.devise || 'FCFA',
            },
            accessToken
          );

          updateParametres({
            derniereSynchroSheetsDate: new Date().toISOString(),
          });

          setSyncSuccessMsg('Nouveau classeur Google Sheets créé et synchronisé avec succès !');
          logEvent('Création Classeur Google Sheets', created.id, 'Système');
          fetchDriveSpreadsheets(accessToken);
        } catch (err: any) {
          setSyncErrorMsg(err.message || 'Erreur lors de la création du classeur');
        } finally {
          setIsSyncing(false);
          setConfirmModal(null);
        }
      },
    });
  };

  // Link existing spreadsheet
  const handleLinkSpreadsheet = (id: string, url?: string) => {
    const cleanId = extractSpreadsheetId(id);
    if (!cleanId) return;

    const finalUrl = url || `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
    setActiveSpreadsheetId(cleanId);
    setActiveSpreadsheetUrl(finalUrl);
    updateParametres({
      googleSheetsSpreadsheetId: cleanId,
      googleSheetsSpreadsheetUrl: finalUrl,
    });
    setSyncSuccessMsg('Classeur Google Sheets relié avec succès.');
    setTimeout(() => setSyncSuccessMsg(null), 3000);
  };

  // Full synchronization
  const handleFullSync = async () => {
    if (!accessToken) {
      setAuthError('Connexion Google requise pour synchroniser les données.');
      return;
    }
    if (!activeSpreadsheetId) {
      setSyncErrorMsg('Veuillez créer ou sélectionner un classeur Google Sheets avant de synchroniser.');
      return;
    }

    const totalRecords =
      commandes.length +
      devis.length +
      sourcingList.length +
      clients.length +
      fournisseurs.length +
      paiements.length;

    setConfirmModal({
      isOpen: true,
      title: 'Mettre à jour le classeur Google Sheets ?',
      message: `Vous êtes sur le point d'écrire ${totalRecords} enregistrements (Commandes, Devis, Sourcing, Clients, Fournisseurs, Paiements) dans votre classeur Google Sheets distant. Les feuilles correspondantes seront actualisées avec les données les plus récentes.`,
      onConfirm: async () => {
        setIsSyncing(true);
        setSyncErrorMsg(null);
        setSyncSuccessMsg(null);

        try {
          const result = await syncAllDataToGoogleSheets(
            activeSpreadsheetId,
            {
              commandes,
              devis,
              sourcingList,
              clients,
              fournisseurs,
              paiements,
              devise: parametres.devise || 'FCFA',
            },
            accessToken
          );

          const now = new Date().toISOString();
          updateParametres({
            derniereSynchroSheetsDate: now,
            derniereSauvegardeDriveDate: now,
          });

          setSyncSuccessMsg(
            `Synchronisation réussie ! ${result.updatedSheetsCount} feuilles mises à jour (${result.totalRowsCount} lignes écrites).`
          );
          logEvent(
            'Synchronisation Google Sheets réussie',
            `ID: ${activeSpreadsheetId}`,
            'Système',
            `${result.totalRowsCount} lignes écrites`
          );
        } catch (err: any) {
          setSyncErrorMsg(err.message || 'Erreur lors de la synchronisation');
        } finally {
          setIsSyncing(false);
          setConfirmModal(null);
        }
      },
    });
  };

  // Single sheet sync
  const handleSyncSingleEntity = async (entity: string, title: string) => {
    if (!accessToken) {
      setAuthError('Connexion Google requise.');
      return;
    }
    if (!activeSpreadsheetId) {
      setSyncErrorMsg('Sélectionnez d’abord un classeur.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Actualiser la feuille "${title}" dans Google Sheets ?`,
      message: `Cette opération remplacera le contenu de l'onglet "${title}" par vos données locales actuelles.`,
      onConfirm: async () => {
        setIsSyncing(true);
        setSyncErrorMsg(null);
        try {
          // Trigger targeted update
          await syncAllDataToGoogleSheets(
            activeSpreadsheetId,
            {
              commandes,
              devis,
              sourcingList,
              clients,
              fournisseurs,
              paiements,
              devise: parametres.devise || 'FCFA',
            },
            accessToken
          );
          setSyncSuccessMsg(`Feuille "${title}" actualisée avec succès dans Google Sheets !`);
        } catch (err: any) {
          setSyncErrorMsg(err.message || 'Erreur lors de l’actualisation');
        } finally {
          setIsSyncing(false);
          setConfirmModal(null);
        }
      },
    });
  };

  // Preview read from Google Sheets
  const handlePreviewSheet = async () => {
    if (!accessToken || !activeSpreadsheetId) return;
    setIsImporting(true);
    try {
      const rows = await readSheetValues(activeSpreadsheetId, "'Commandes'!A1:L20", accessToken);
      setImportResult(rows);
    } catch (err: any) {
      setSyncErrorMsg(`Impossible de lire la feuille : ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#112238] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Intégration Google Sheets & Drive
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                Officiel V3
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Synchronisation bidirectionnelle en temps réel, création de classeurs automatisés et exports vers votre compte Google personnel.
            </p>
          </div>
        </div>

        {/* Quick action: Open Sheet in new tab if configured */}
        {activeSpreadsheetUrl && (
          <a
            href={activeSpreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ouvrir mon Google Sheet
          </a>
        )}
      </div>

      {/* Messages */}
      {syncSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {syncErrorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 flex items-center gap-2.5 text-xs font-semibold animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{syncErrorMsg}</span>
        </div>
      )}

      {/* 1. SECTION COMPTE GOOGLE / AUTHENTIFICATION OAUTH */}
      <div className="bg-white dark:bg-[#112238] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Compte Google Workspace
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                {googleUser
                  ? `Connecté en tant que ${googleUser.displayName || googleUser.email}`
                  : 'Connectez votre compte Google pour autoriser l’accès à vos feuilles de calcul Google Sheets'}
              </p>
            </div>
          </div>

          <div>
            {!googleUser ? (
              /* Official Google Sign-In button per workspace-integration SKILL.md specs */
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="gsi-material-button inline-flex items-center justify-center px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-medium text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="gsi-material-button-icon mr-2">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-4 h-4"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span>{isAuthenticating ? 'Connexion en cours...' : 'Se connecter avec Google'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt="Avatar"
                      className="w-5 h-5 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {(googleUser.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {googleUser.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>

        {authError && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}
      </div>

      {/* 2. CONFIGURATION DU CLASSEUR ACTIF */}
      <div className="bg-white dark:bg-[#112238] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Classeur Google Sheets actif
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Définissez la feuille de calcul vers laquelle toutes les commandes, devis et clients sont envoyés.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveSheetTab('sync')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeSheetTab === 'sync'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Synchronisation
            </button>
            <button
              onClick={() => setActiveSheetTab('select')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeSheetTab === 'select'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Choisir / Lier
            </button>
            <button
              onClick={() => {
                setActiveSheetTab('import');
                handlePreviewSheet();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeSheetTab === 'import'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Consulter en direct
            </button>
          </div>
        </div>

        {/* Current Active Sheet Info */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              ID DU CLASSEUR ACTUEL
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                {activeSpreadsheetId || 'Aucun classeur sélectionné'}
              </span>
              {activeSpreadsheetId && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                  Prêt
                </span>
              )}
            </div>
            {parametres.derniereSynchroSheetsDate && (
              <p className="text-[11px] text-slate-400">
                Dernière synchronisation : {formatDate(parametres.derniereSynchroSheetsDate)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCreateNewSpreadsheet}
              disabled={isSyncing || !googleUser}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Créer nouveau classeur
            </button>

            {activeSpreadsheetId && (
              <button
                type="button"
                onClick={handleFullSync}
                disabled={isSyncing || !googleUser}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Synchronisation...' : 'Synchroniser tout'}
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: SYNCHRONISATION & PER-ENTITY EXPORTS */}
        {activeSheetTab === 'sync' && (
          <div className="space-y-4 pt-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Synchronisation par module vers Google Sheets
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                {
                  id: 'commandes',
                  title: 'Commandes & Logistique',
                  count: commandes.length,
                  icon: Package,
                  desc: 'N°, Clients, Statuts, Montants, Suivi Chine-Togo',
                  color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50',
                },
                {
                  id: 'devis',
                  title: 'Devis Sourcing',
                  count: devis.length,
                  icon: FileSpreadsheet,
                  desc: 'Détail articles, livraison Chine, frais 5%, totaux',
                  color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50',
                },
                {
                  id: 'sourcing',
                  title: 'Demandes de Sourcing',
                  count: sourcingList.length,
                  icon: ShoppingBag,
                  desc: 'Produits recherchés, usines, prix Chine, statuts',
                  color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50',
                },
                {
                  id: 'clients',
                  title: 'Répertoire Clients',
                  count: clients.length,
                  icon: Users,
                  desc: 'Noms, téléphones, WhatsApp Lomé, quartiers',
                  color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50',
                },
                {
                  id: 'fournisseurs',
                  title: 'Fournisseurs Chine',
                  count: fournisseurs.length,
                  icon: Building2,
                  desc: 'WeChat, boutiques 1688 / Alibaba, villes',
                  color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50',
                },
                {
                  id: 'paiements',
                  title: 'Règlements & Encaissements',
                  count: paiements.length,
                  icon: CreditCard,
                  desc: 'TMoney, Flooz, montants encaissés, soldes',
                  color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50',
                },
              ].map((m) => {
                const IconComponent = m.icon;
                return (
                  <div
                    key={m.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${m.color}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {m.title}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                          {m.count}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{m.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSyncSingleEntity(m.id, m.title)}
                      disabled={isSyncing || !googleUser || !activeSpreadsheetId}
                      className="w-full py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3 text-emerald-600" />
                      Mettre à jour cette feuille
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CHOISIR UN CLASSEUR EXISTANT DANS GOOGLE DRIVE */}
        {activeSheetTab === 'select' && (
          <div className="space-y-4 pt-2 text-xs">
            {/* Direct input URL */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Coller un lien ou ID Google Sheets existant :
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/... ou ID"
                  value={customSheetInput}
                  onChange={(e) => setCustomSheetInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleLinkSpreadsheet(customSheetInput);
                    setCustomSheetInput('');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-all"
                >
                  Lier
                </button>
              </div>
            </div>

            {/* List Drive spreadsheets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  Classeurs détectés sur votre compte Google Drive ({driveSpreadsheets.length})
                </h4>
                {accessToken && (
                  <button
                    type="button"
                    onClick={() => fetchDriveSpreadsheets(accessToken)}
                    disabled={isLoadingDriveList}
                    className="text-emerald-600 hover:text-emerald-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingDriveList ? 'animate-spin' : ''}`} />
                    Actualiser
                  </button>
                )}
              </div>

              {isLoadingDriveList ? (
                <div className="py-6 text-center text-slate-400">
                  Chargement des classeurs Google Drive...
                </div>
              ) : driveSpreadsheets.length === 0 ? (
                <p className="py-4 text-center text-slate-400 italic">
                  Aucun classeur Google Sheets trouvé ou compte non encore connecté.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  {driveSpreadsheets.map((s) => {
                    const isSelected = activeSpreadsheetId === s.id;
                    return (
                      <div
                        key={s.id}
                        className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                              {s.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Modifié le {formatDate(s.modifiedTime)} • ID: {s.id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={s.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                            title="Ouvrir dans Google Sheets"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {isSelected ? (
                            <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Sélectionné
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLinkSpreadsheet(s.id, s.webViewLink)}
                              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-100 rounded-lg font-bold text-[11px] cursor-pointer"
                            >
                              Choisir
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: VISUALISATION EN DIRECT DES DONNÉES DU SPREADSHEET */}
        {activeSheetTab === 'import' && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  Aperçu en direct : Feuille "Commandes"
                </h4>
                <p className="text-slate-500 text-[11px]">
                  Données actuellement lues depuis l'API Google Sheets en temps réel.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePreviewSheet}
                disabled={isImporting || !activeSpreadsheetId || !accessToken}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isImporting ? 'animate-spin' : ''}`} />
                Recharger
              </button>
            </div>

            {isImporting ? (
              <div className="py-8 text-center text-slate-400">
                Lecture des données Google Sheets en direct...
              </div>
            ) : !importResult || importResult.length === 0 ? (
              <p className="py-4 text-center text-slate-400 italic">
                Aucune donnée renvoyée ou classeur non encore initialisé. Cliquez sur "Synchroniser tout" pour créer les en-têtes et les lignes.
              </p>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto bg-white dark:bg-[#0c1626]">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-slate-200 dark:border-slate-800 text-emerald-900 dark:text-emerald-200">
                      {importResult[0]?.map((col: string, idx: number) => (
                        <th key={idx} className="p-2.5 font-bold whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {importResult.slice(1).map((row: string[], rIdx: number) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        {row.map((cell: string, cIdx: number) => (
                          <td key={cIdx} className="p-2.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL FOR DESTRUCTIVE / MUTATING OPERATIONS (MANDATORY per Workspace Skill) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {confirmModal.title}
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs"
              >
                Confirmer l'opération
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
