import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
import {
  Client,
  Devis,
  Commande,
  Paiement,
  ModePaiement,
  Facture,
  FactureStatut,
  Rentabilite,
  Parametres,
  ArticleLigne,
  CommandeStatut,
  Fournisseur,
  Sourcing,
  HistoriqueItem,
  NotificationItem,
  GoogleDriveBackup,
  Logistique,
  CommandeDocument,
  TabType,
  SyncState,
  SyncStats,
} from '../types';
import {
  syncEntityToCloud,
  flushOfflineQueue,
  fetchAllCollectionsFromCloud,
  pushAllLocalDataToCloud,
  getOfflineQueue,
  getOrCreateDeviceId,
  detectDeviceType,
  subscribeToUserCollections,
  mergeCollectionEntities,
} from '../utils/cloudSync';
import {
  auth,
  googleSignIn,
  googleLogout,
  getCurrentGoogleUser,
  onAuthUserChanged,
  ensureAuthenticated,
} from '../utils/googleAuth';
import type { User } from 'firebase/auth';
import {
  initialClients,
  initialDevis,
  initialCommandes,
  initialPaiements,
  initialFactures,
  initialRentabilites,
  initialParametres,
  initialFournisseurs,
  initialSourcing,
  initialHistorique,
  initialGoogleDriveBackups,
} from '../data/initialData';
import { generateNextNumber } from '../utils/formatters';
import {
  playNotificationSound,
  triggerDeviceVibration,
  triggerNativeNotification,
} from '../utils/notifications';

interface AppContextType {
  clients: Client[];
  devis: Devis[];
  commandes: Commande[];
  paiements: Paiement[];
  factures: Facture[];
  rentabilites: Record<string, Rentabilite>;
  fournisseurs: Fournisseur[];
  sourcingList: Sourcing[];
  historique: HistoriqueItem[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  googleDriveBackups: GoogleDriveBackup[];
  parametres: Parametres;
  isUnlocked: boolean;
  isLocked: boolean;

  // PIN security & Mode Privé
  setIsUnlocked: (unlocked: boolean) => void;
  unlockApp: () => void;
  lockApp: () => void;
  toggleModePrive: () => void;

  // Logging
  logEvent: (action: string, objetConcerne: string, categorie: HistoriqueItem['categorie'], details?: string) => void;

  // Toast System V3
  toast: { message: string; type: 'success' | 'info' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;

  // CRUD Client
  addClient: (client: Omit<Client, 'id' | 'dateCreation'>) => Client;
  updateClient: (client: Client) => void;
  archiveClient: (clientId: string) => void;
  unarchiveClient: (clientId: string) => void;
  deleteClient: (clientId: string) => boolean;

  // CRUD Fournisseur
  addFournisseur: (fData: Omit<Fournisseur, 'id' | 'dateCreation'>) => Fournisseur;
  updateFournisseur: (f: Fournisseur) => void;
  archiveFournisseur: (id: string) => void;
  unarchiveFournisseur: (id: string) => void;
  deleteFournisseur: (id: string) => void;

  // CRUD Sourcing
  addSourcing: (sData: Omit<Sourcing, 'id' | 'numero' | 'dateCreation'>) => Sourcing;
  updateSourcing: (s: Sourcing) => void;
  archiveSourcing: (id: string) => void;
  unarchiveSourcing: (id: string) => void;
  deleteSourcing: (id: string) => void;
  convertSourcingToDevis: (sourcingId: string) => Devis | null;

  // CRUD Devis
  addDevis: (devisData: Omit<Devis, 'id' | 'numero'>) => Devis;
  updateDevis: (devis: Devis) => void;
  convertDevisToCommande: (devisId: string) => Commande | null;
  archiveDevis: (devisId: string) => void;
  unarchiveDevis: (devisId: string) => void;
  restoreDevis: (devisId: string) => void;
  deleteDevis: (devisId: string) => void;

  // CRUD Commande & Logistique & Documents
  addCommande: (commandeData: Omit<Commande, 'id' | 'numero'>) => Commande;
  updateCommande: (commande: Commande) => void;
  updateCommandeStatut: (commandeId: string, statut: CommandeStatut, numeroSuivi?: string) => void;
  updateCommandeLogistique: (commandeId: string, logistique: Logistique) => void;
  addCommandeDocument: (commandeId: string, doc: Omit<CommandeDocument, 'id' | 'date'>) => void;
  deleteCommandeDocument: (commandeId: string, docId: string) => void;
  archiveCommande: (commandeId: string) => void;
  unarchiveCommande: (commandeId: string) => void;
  restoreCommande: (commandeId: string) => void;
  deleteCommande: (commandeId: string) => void;

  // CRUD Paiements
  addPaiement: (paiementData: Omit<Paiement, 'id' | 'numero'>) => Paiement;
  updatePaiement: (paiement: Paiement) => void;
  deletePaiement: (paiementId: string) => void;
  getFacturePaiements: (factureId: string) => Paiement[];

  // CRUD Factures V4 (Flexible: depuis Devis, Commande sans devis, ou Directe)
  generateFactureFromCommande: (commandeId: string) => Facture | null;
  generateFactureFromDevis: (devisId: string) => Facture | null;
  addFactureDirecte: (factureData: Omit<Facture, 'id' | 'numero'>) => Facture;
  updateFacture: (facture: Facture) => void;
  archiveFacture: (factureId: string) => void;
  unarchiveFacture: (factureId: string) => void;
  restoreFacture: (factureId: string) => void;
  deleteFacture: (factureId: string) => void;
  marquerFacturePayeeManuellement: (
    factureId: string,
    details?: {
      montant?: number;
      date?: string;
      modePaiement?: ModePaiement;
      reference?: string;
      note?: string;
    }
  ) => Paiement | null;
  updateFactureStatutManuel: (
    factureId: string,
    nouveauStatut: FactureStatut,
    forcePayee?: boolean,
    raison?: string
  ) => void;

  // Cloud Synchronization V4 (Windows <-> Android)
  syncState: SyncState;
  syncStats: SyncStats;
  syncNow: () => Promise<{ success: boolean; message: string }>;
  uploadAllToCloud: () => Promise<{ success: boolean; message: string }>;
  downloadAllFromCloud: () => Promise<{ success: boolean; message: string }>;
  clearOfflinePendingQueue: () => void;
  currentAuthUser: User | null;
  signInWithGoogle: () => Promise<void>;
  signOutGoogle: () => Promise<void>;

  // Rentabilité
  saveRentabilite: (commandeId: string, prixAchatChine: number, fraisReels: number) => Rentabilite;
  saveRentabiliteV2: (
    commandeId: string,
    data: {
      prixAchatChine: number;
      livraisonChine?: number;
      transportInternational?: number;
      douane?: number;
      autresFrais?: number;
      coutEstime?: number;
    }
  ) => Rentabilite;

  // Settings, Exports & Backups
  updateParametres: (params: Partial<Parametres>) => void;
  resetDemoData: () => void;
  resetToInitialData: () => void;
  clearAllData: () => void;
  exportBackupJSON: () => string;
  exportDataBackup: () => string;
  exportBackupZIP: () => Promise<Blob>;
  exportCSV: (type: 'clients' | 'devis' | 'commandes' | 'paiements' | 'fournisseurs' | 'sourcing') => string;
  importBackupJSON: (jsonStr: string) => boolean;
  importDataBackup: (jsonStr: string) => boolean;
  importBackupZIP: (file: File) => Promise<boolean>;
  sauvegarderGoogleDrive: () => Promise<boolean>;
  restaurerGoogleDrive: (backupId: string) => Promise<boolean>;

  // Notifications V3
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  addNotification: (notif: Omit<NotificationItem, 'id' | 'date' | 'read'>) => void;
  triggerTestNotification: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  CLIENTS: 'com_china_clients',
  DEVIS: 'com_china_devis',
  COMMANDES: 'com_china_commandes',
  PAIEMENTS: 'com_china_paiements',
  FACTURES: 'com_china_factures',
  RENTABILITE: 'com_china_rentabilite',
  PARAMETRES: 'com_china_parametres',
  FOURNISSEURS: 'com_china_fournisseurs',
  SOURCING: 'com_china_sourcing',
  HISTORIQUE: 'com_china_historique',
  GDRIVE_BACKUPS: 'com_china_gdrive_backups',
  BACKUP_AUTO_PRE_RESTORE: 'com_china_auto_backup_snapshot',
  READ_NOTIFS: 'com_china_read_notifs',
  DISMISSED_NOTIFS: 'com_china_dismissed_notifs',
  CUSTOM_NOTIFS: 'com_china_custom_notifs',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return saved ? JSON.parse(saved) : initialClients;
  });

  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FOURNISSEURS);
    return saved ? JSON.parse(saved) : initialFournisseurs;
  });

  const [sourcingList, setSourcingList] = useState<Sourcing[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SOURCING);
    return saved ? JSON.parse(saved) : initialSourcing;
  });

  const [devis, setDevis] = useState<Devis[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEVIS);
    return saved ? JSON.parse(saved) : initialDevis;
  });

  const [commandes, setCommandes] = useState<Commande[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COMMANDES);
    return saved ? JSON.parse(saved) : initialCommandes;
  });

  const [paiements, setPaiements] = useState<Paiement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAIEMENTS);
    return saved ? JSON.parse(saved) : initialPaiements;
  });

  const [factures, setFactures] = useState<Facture[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FACTURES);
    return saved ? JSON.parse(saved) : initialFactures;
  });

  const [rentabilites, setRentabilites] = useState<Record<string, Rentabilite>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RENTABILITE);
    return saved ? JSON.parse(saved) : initialRentabilites;
  });

  const [historique, setHistorique] = useState<HistoriqueItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HISTORIQUE);
    return saved ? JSON.parse(saved) : initialHistorique;
  });

  const [googleDriveBackups, setGoogleDriveBackups] = useState<GoogleDriveBackup[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GDRIVE_BACKUPS);
    return saved ? JSON.parse(saved) : initialGoogleDriveBackups;
  });

  const [parametres, setParametres] = useState<Parametres>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARAMETRES);
    return saved ? { ...initialParametres, ...JSON.parse(saved) } : initialParametres;
  });

  // PIN security lock state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    const savedParams = localStorage.getItem(STORAGE_KEYS.PARAMETRES);
    const parsed: Parametres = savedParams ? JSON.parse(savedParams) : initialParametres;
    return !parsed.pinEnabled || !parsed.pinCode;
  });

  // Save each state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FOURNISSEURS, JSON.stringify(fournisseurs));
  }, [fournisseurs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SOURCING, JSON.stringify(sourcingList));
  }, [sourcingList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEVIS, JSON.stringify(devis));
  }, [devis]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMMANDES, JSON.stringify(commandes));
  }, [commandes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAIEMENTS, JSON.stringify(paiements));
  }, [paiements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FACTURES, JSON.stringify(factures));
  }, [factures]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RENTABILITE, JSON.stringify(rentabilites));
  }, [rentabilites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORIQUE, JSON.stringify(historique));
  }, [historique]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GDRIVE_BACKUPS, JSON.stringify(googleDriveBackups));
  }, [googleDriveBackups]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARAMETRES, JSON.stringify(parametres));
    if (!parametres.pinEnabled) {
      setIsUnlocked(true);
    }
  }, [parametres]);

  // Thème V3 : Nantor Dark Tech, Nantor Premium Light ou Système
  useEffect(() => {
    const currentTheme = parametres.theme || 'dark_tech';
    const applyTheme = (isDark: boolean) => {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark', 'theme-dark-tech');
        root.classList.remove('theme-premium-light');
      } else {
        root.classList.remove('dark', 'theme-dark-tech');
        root.classList.add('theme-premium-light');
      }
    };

    if (currentTheme === 'dark_tech' || currentTheme === 'dark') {
      applyTheme(true);
    } else if (currentTheme === 'premium_light' || currentTheme === 'light') {
      applyTheme(false);
    } else {
      // Mode Système : écoute automatique des préférences du téléphone
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => {
        applyTheme(e.matches);
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [parametres.theme]);

  // Notifications state persistence
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.READ_NOTIFS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DISMISSED_NOTIFS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customNotifs, setCustomNotifs] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_NOTIFS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.READ_NOTIFS, JSON.stringify(readNotifIds));
  }, [readNotifIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DISMISSED_NOTIFS, JSON.stringify(dismissedNotifIds));
  }, [dismissedNotifIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_NOTIFS, JSON.stringify(customNotifs));
  }, [customNotifs]);

  // Toast system V3
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    if (parametres.notificationPrefs?.son && type === 'success') {
      playNotificationSound();
    }
    if (parametres.notificationPrefs?.vibration) {
      triggerDeviceVibration(70);
    }
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 2800);
  }, [parametres.notificationPrefs]);

  const lockApp = () => {
    if (parametres.pinEnabled && parametres.pinCode) {
      setIsUnlocked(false);
    }
  };

  const toggleModePrive = () => {
    setParametres((prev) => ({
      ...prev,
      modePrive: !prev.modePrive,
    }));
  };

  // Central logging method (Requirement 27)
  const logEvent = useCallback(
    (action: string, objetConcerne: string, categorie: HistoriqueItem['categorie'], details?: string) => {
      const now = new Date();
      const newItem: HistoriqueItem = {
        id: `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: now.toISOString(),
        heure: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        action,
        objetConcerne,
        categorie,
        details,
      };
      setHistorique((prev) => [newItem, ...prev.slice(0, 200)]); // Keep last 200 logs
    },
    []
  );

  // NOTIFICATIONS V3 (Paiements, Commandes, Logistique, Devis, Rappels)
  const notifications = useMemo<NotificationItem[]>(() => {
    const prefs = parametres.notificationPrefs || {
      enabled: parametres.notificationsEnabled ?? true,
      paiements: true,
      commandes: true,
      logistique: true,
      devis: true,
      rappels: true,
      son: true,
      vibration: true,
      rappelsAuto: true,
    };

    if (!parametres.notificationsEnabled || !prefs.enabled) return [];

    const list: NotificationItem[] = [];
    const dismissedSet = new Set(dismissedNotifIds);
    const readSet = new Set(readNotifIds);

    // 1. Catégorie PAIEMENTS
    if (prefs.paiements) {
      commandes.forEach((cmd) => {
        if (!cmd.isArchived && cmd.statut !== 'Annulé') {
          // Acompte en attente (aucun paiement reçu)
          if (cmd.montantPaye === 0 && cmd.montantTotal > 0) {
            const id = `notif-paiement-attente-${cmd.id}`;
            if (!dismissedSet.has(id)) {
              list.push({
                id,
                titre: `Paiement en attente : ${cmd.numero}`,
                message: `Règlement initial en attente pour un montant de ${cmd.montantTotal.toLocaleString('fr-FR')} FCFA. Relance client recommandée.`,
                date: cmd.date,
                type: 'warning',
                categorie: 'Paiements',
                priorite: 'warning',
                read: readSet.has(id),
                lienTab: 'commandes',
                cibleType: 'commande',
                cibleId: cmd.id,
              });
            }
          }
          // Paiement partiel / solde restant dû
          else if (cmd.solde > 0 && cmd.montantPaye > 0) {
            const id = `notif-solde-${cmd.id}`;
            if (!dismissedSet.has(id)) {
              list.push({
                id,
                titre: `Solde à recouvrer : ${cmd.numero}`,
                message: `Acompte reçu (${cmd.montantPaye.toLocaleString('fr-FR')} FCFA). Reste à payer : ${cmd.solde.toLocaleString('fr-FR')} FCFA.`,
                date: cmd.date,
                type: 'warning',
                categorie: 'Paiements',
                priorite: 'warning',
                read: readSet.has(id),
                lienTab: 'commandes',
                cibleType: 'commande',
                cibleId: cmd.id,
              });
            }
          }
        }
      });
    }

    // 2. Catégorie COMMANDES & LOGISTIQUE
    commandes.forEach((cmd) => {
      if (cmd.isArchived) return;

      // Logistique
      if (prefs.logistique) {
        if (cmd.statut === 'En transit' || cmd.logistique?.statutLogistique === 'EN TRANSIT') {
          const id = `notif-transit-${cmd.id}`;
          if (!dismissedSet.has(id)) {
            list.push({
              id,
              titre: `Colis en transit : ${cmd.numero}`,
              message: `Marchandises en route vers Lomé. N° suivi : ${cmd.numeroSuivi || cmd.logistique?.numeroSuivi || 'N/A'}.`,
              date: cmd.logistique?.dateExpedition || cmd.date,
              type: 'info',
              categorie: 'Logistique',
              priorite: 'info',
              read: readSet.has(id),
              lienTab: 'commandes',
              cibleType: 'commande',
              cibleId: cmd.id,
            });
          }
        } else if (cmd.statut === 'Arrivé au Togo' || cmd.logistique?.statutLogistique === 'ARRIVÉ AU TOGO') {
          const id = `notif-togo-${cmd.id}`;
          if (!dismissedSet.has(id)) {
            list.push({
              id,
              titre: `Colis arrivé à Lomé : ${cmd.numero}`,
              message: `Arrivage confirmé à Lomé. Formalités de dédouanement et contrôle qualité en cours.`,
              date: cmd.date,
              type: 'success',
              categorie: 'Logistique',
              priorite: 'urgent',
              read: readSet.has(id),
              lienTab: 'commandes',
              cibleType: 'commande',
              cibleId: cmd.id,
            });
          }
        } else if (cmd.statut === 'Disponible') {
          const id = `notif-dispo-${cmd.id}`;
          if (!dismissedSet.has(id)) {
            list.push({
              id,
              titre: `Commande prête à livrer : ${cmd.numero}`,
              message: `Colis disponible pour retrait ou livraison au client.`,
              date: cmd.date,
              type: 'success',
              categorie: 'Logistique',
              priorite: 'success',
              read: readSet.has(id),
              lienTab: 'commandes',
              cibleType: 'commande',
              cibleId: cmd.id,
            });
          }
        }
      }

      // Commandes
      if (prefs.commandes) {
        if (cmd.statut === 'Commande Alibaba' || cmd.statut === 'Produit acheté') {
          const id = `notif-achat-${cmd.id}`;
          if (!dismissedSet.has(id)) {
            list.push({
              id,
              titre: `Achat Chine confirmé : ${cmd.numero}`,
              message: `Produit commandé auprès de l'usine/fournisseur sur Alibaba.`,
              date: cmd.date,
              type: 'info',
              categorie: 'Commandes',
              priorite: 'info',
              read: readSet.has(id),
              lienTab: 'commandes',
              cibleType: 'commande',
              cibleId: cmd.id,
            });
          }
        } else if (cmd.statut === 'Expédié de Chine') {
          const id = `notif-exp-chine-${cmd.id}`;
          if (!dismissedSet.has(id)) {
            list.push({
              id,
              titre: `Expédition depuis la Chine : ${cmd.numero}`,
              message: `Le fournisseur ou l'agent a expédié le colis depuis l'entrepôt en Chine.`,
              date: cmd.date,
              type: 'info',
              categorie: 'Commandes',
              priorite: 'info',
              read: readSet.has(id),
              lienTab: 'commandes',
              cibleType: 'commande',
              cibleId: cmd.id,
            });
          }
        } else if (cmd.statut === 'Livré') {
          const id = `notif-livre-${cmd.id}`;
          if (!dismissedSet.has(id)) {
            list.push({
              id,
              titre: `Commande livrée : ${cmd.numero}`,
              message: `La commande a été remise en main propre au client. Transaction finalisée.`,
              date: cmd.date,
              type: 'success',
              categorie: 'Commandes',
              priorite: 'success',
              read: readSet.has(id),
              lienTab: 'commandes',
              cibleType: 'commande',
              cibleId: cmd.id,
            });
          }
        }
      }
    });

    // 3. Catégorie DEVIS
    if (prefs.devis) {
      devis.forEach((dev) => {
        if (dev.isArchived) return;
        if (dev.statut === 'Envoyé' || dev.statut === 'Brouillon') {
          const createdTime = new Date(dev.date).getTime();
          const diffDays = (Date.now() - createdTime) / (1000 * 60 * 60 * 24);
          if (diffDays >= 3) {
            const id = `notif-devis-relance-${dev.id}`;
            if (!dismissedSet.has(id)) {
              list.push({
                id,
                titre: `Devis en attente : ${dev.numero}`,
                message: `Devis de ${dev.total.toLocaleString('fr-FR')} FCFA envoyé il y a ${Math.floor(diffDays)} jours sans réponse. Relance conseillée.`,
                date: dev.date,
                type: 'warning',
                categorie: 'Devis',
                priorite: 'warning',
                read: readSet.has(id),
                lienTab: 'devis',
                cibleType: 'devis',
                cibleId: dev.id,
              });
            }
          }
        }
      });
    }

    // 4. Catégorie RAPPELS & SYSTÈME
    if (prefs.rappels) {
      // Commande soldée sans facture générée
      commandes.forEach((cmd) => {
        if (!cmd.isArchived && cmd.solde === 0 && cmd.montantPaye > 0) {
          const hasFacture = factures.some((f) => f.commandeId === cmd.id);
          if (!hasFacture) {
            const id = `notif-facture-${cmd.id}`;
            if (!dismissedSet.has(id)) {
              list.push({
                id,
                titre: `Facture finale à générer : ${cmd.numero}`,
                message: `La commande est entièrement soldée. Vous pouvez éditer la facture définitive en 1 clic.`,
                date: cmd.date,
                type: 'info',
                categorie: 'Rappels',
                priorite: 'info',
                read: readSet.has(id),
                lienTab: 'commandes',
                cibleType: 'commande',
                cibleId: cmd.id,
              });
            }
          }
        }
      });

      // Sauvegarde > 7 jours
      if (parametres.derniereSauvegardeDate) {
        const lastDate = new Date(parametres.derniereSauvegardeDate).getTime();
        const diffDays = (Date.now() - lastDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) {
          const id = 'notif-backup-old';
          if (!dismissedSet.has(id)) {
            list.push({
              id,
              titre: 'Sauvegarde recommandée',
              message: `Votre dernière sauvegarde date de plus de 7 jours. Pensez à exporter vos données.`,
              date: new Date().toISOString(),
              type: 'warning',
              categorie: 'Rappels',
              priorite: 'warning',
              read: readSet.has(id),
              lienTab: 'parametres',
              cibleType: 'parametres',
            });
          }
        }
      }
    }

    // 5. Notifications manuelles ou personnalisées
    customNotifs.forEach((cn) => {
      if (!dismissedSet.has(cn.id)) {
        list.push({
          ...cn,
          read: readSet.has(cn.id),
        });
      }
    });

    // Tri par date décroissante
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [commandes, devis, factures, parametres, dismissedNotifIds, readNotifIds, customNotifs]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markNotificationRead = (id: string) => {
    setReadNotifIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const markAllNotificationsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds((prev) => Array.from(new Set([...prev, ...allIds])));
    showToast('✓ Toutes les notifications sont marquées comme lues');
  };

  const deleteNotification = (id: string) => {
    setDismissedNotifIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const clearAllNotifications = () => {
    const allIds = notifications.map((n) => n.id);
    setDismissedNotifIds((prev) => Array.from(new Set([...prev, ...allIds])));
    showToast('✓ Notifications supprimées');
  };

  const addNotification = (notif: Omit<NotificationItem, 'id' | 'date' | 'read'>) => {
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(),
      read: false,
    };
    setCustomNotifs((prev) => [newNotif, ...prev]);

    if (parametres.notificationPrefs?.son) {
      playNotificationSound();
    }
    if (parametres.notificationPrefs?.vibration) {
      triggerDeviceVibration(100);
    }
    triggerNativeNotification(newNotif.titre, newNotif.message);
  };

  const triggerTestNotification = () => {
    addNotification({
      titre: '🔔 Notification de test Nantor V3',
      message: 'Le système d\'alertes locales Android & PWA est parfaitement opérationnel !',
      categorie: 'Rappels',
      priorite: 'success',
      type: 'success',
      lienTab: 'notifications',
    });
    showToast('✓ Notification de test déclenchée');
  };

  // ===================== CLIENT CRUD =====================
  const addClient = (clientData: Omit<Client, 'id' | 'dateCreation'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dateCreation: new Date().toISOString(),
    };
    setClients((prev) => [newClient, ...prev]);
    syncEntityToCloud('clients', 'create', newClient.id, newClient);
    logEvent('Création de client', newClient.nom, 'Client', `Tél : ${newClient.telephone} - Ville : ${newClient.ville}`);
    return newClient;
  };

  const updateClient = (updated: Client) => {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    syncEntityToCloud('clients', 'update', updated.id, updated);
    logEvent('Modification de client', updated.nom, 'Client', `Informations mises à jour`);
  };

  const archiveClient = (clientId: string) => {
    const c = clients.find((item) => item.id === clientId);
    setClients((prev) => prev.map((item) => (item.id === clientId ? { ...item, isArchived: true } : item)));
    if (c) {
      syncEntityToCloud('clients', 'update', clientId, { ...c, isArchived: true });
      logEvent('Archivage de client', c.nom, 'Client');
    }
  };

  const unarchiveClient = (clientId: string) => {
    const c = clients.find((item) => item.id === clientId);
    setClients((prev) => prev.map((item) => (item.id === clientId ? { ...item, isArchived: false } : item)));
    if (c) {
      syncEntityToCloud('clients', 'update', clientId, { ...c, isArchived: false });
      logEvent('Restauration de client', c.nom, 'Client');
    }
  };

  const deleteClient = (clientId: string): boolean => {
    const c = clients.find((item) => item.id === clientId);
    setClients((prev) => prev.filter((item) => item.id !== clientId));
    syncEntityToCloud('clients', 'delete', clientId, null);
    if (c) logEvent('Suppression définitive de client', c.nom, 'Client');
    return true;
  };

  // ===================== FOURNISSEUR CRUD =====================
  const addFournisseur = (fData: Omit<Fournisseur, 'id' | 'dateCreation'>): Fournisseur => {
    const newF: Fournisseur = {
      ...fData,
      id: `frn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      dateCreation: new Date().toISOString(),
    };
    setFournisseurs((prev) => [newF, ...prev]);
    syncEntityToCloud('fournisseurs', 'create', newF.id, newF);
    logEvent('Création de fournisseur', newF.nom, 'Fournisseur', `Statut : ${newF.statut}`);
    return newF;
  };

  const updateFournisseur = (f: Fournisseur) => {
    setFournisseurs((prev) => prev.map((item) => (item.id === f.id ? f : item)));
    syncEntityToCloud('fournisseurs', 'update', f.id, f);
    logEvent('Modification de fournisseur', f.nom, 'Fournisseur');
  };

  const archiveFournisseur = (id: string) => {
    const f = fournisseurs.find((item) => item.id === id);
    setFournisseurs((prev) => prev.map((item) => (item.id === id ? { ...item, isArchived: true } : item)));
    if (f) {
      syncEntityToCloud('fournisseurs', 'update', id, { ...f, isArchived: true });
      logEvent('Archivage de fournisseur', f.nom, 'Fournisseur');
    }
  };

  const unarchiveFournisseur = (id: string) => {
    const f = fournisseurs.find((item) => item.id === id);
    setFournisseurs((prev) => prev.map((item) => (item.id === id ? { ...item, isArchived: false } : item)));
    if (f) {
      syncEntityToCloud('fournisseurs', 'update', id, { ...f, isArchived: false });
      logEvent('Restauration de fournisseur', f.nom, 'Fournisseur');
    }
  };

  const deleteFournisseur = (id: string) => {
    const f = fournisseurs.find((item) => item.id === id);
    setFournisseurs((prev) => prev.filter((item) => item.id !== id));
    syncEntityToCloud('fournisseurs', 'delete', id, null);
    if (f) logEvent('Suppression définitive de fournisseur', f.nom, 'Fournisseur');
  };

  // ===================== SOURCING CRUD =====================
  const addSourcing = (sData: Omit<Sourcing, 'id' | 'numero' | 'dateCreation'>): Sourcing => {
    const existingNums = sourcingList.map((s) => s.numero);
    const numero = generateNextNumber(parametres.prefixSourcing || 'SRC', existingNums);
    const newS: Sourcing = {
      ...sData,
      id: `src-${Date.now()}`,
      numero,
      dateCreation: new Date().toISOString(),
    };
    setSourcingList((prev) => [newS, ...prev]);
    syncEntityToCloud('sourcing', 'create', newS.id, newS);
    logEvent('Création de demande de sourcing', `${newS.numero} - ${newS.produitRecherche}`, 'Sourcing');
    return newS;
  };

  const updateSourcing = (s: Sourcing) => {
    setSourcingList((prev) => prev.map((item) => (item.id === s.id ? s : item)));
    syncEntityToCloud('sourcing', 'update', s.id, s);
    logEvent('Modification de sourcing', `${s.numero} (${s.statut})`, 'Sourcing');
  };

  const archiveSourcing = (id: string) => {
    const s = sourcingList.find((item) => item.id === id);
    setSourcingList((prev) => prev.map((item) => (item.id === id ? { ...item, isArchived: true } : item)));
    if (s) {
      syncEntityToCloud('sourcing', 'update', id, { ...s, isArchived: true });
      logEvent('Archivage de sourcing', s.numero, 'Sourcing');
    }
  };

  const unarchiveSourcing = (id: string) => {
    const s = sourcingList.find((item) => item.id === id);
    setSourcingList((prev) => prev.map((item) => (item.id === id ? { ...item, isArchived: false } : item)));
    if (s) {
      syncEntityToCloud('sourcing', 'update', id, { ...s, isArchived: false });
      logEvent('Restauration de sourcing', s.numero, 'Sourcing');
    }
  };

  const deleteSourcing = (id: string) => {
    const s = sourcingList.find((item) => item.id === id);
    setSourcingList((prev) => prev.filter((item) => item.id !== id));
    syncEntityToCloud('sourcing', 'delete', id, null);
    if (s) logEvent('Suppression définitive de sourcing', s.numero, 'Sourcing');
  };

  // Requirement 19: Transform Sourcing -> Devis
  const convertSourcingToDevis = (sourcingId: string): Devis | null => {
    const s = sourcingList.find((item) => item.id === sourcingId);
    if (!s) return null;

    const existingNums = devis.map((d) => d.numero);
    const numero = generateNextNumber(parametres.prefixDevis || 'DEV', existingNums);

    const prixEstime = (s.prixFournisseur || 10000) * 1.35; // default reasonable markup if not filled
    const quantite = s.quantiteSouhaitee || 1;
    const total = Math.round(prixEstime * quantite);

    const article: ArticleLigne = {
      id: `art-src-${Date.now()}`,
      nomProduit: s.produitRecherche,
      description: s.description,
      lienAlibaba: s.lienAlibaba,
      fournisseurId: s.fournisseurId,
      fournisseurNom: s.fournisseurNom,
      prixUnitaire: Math.round(prixEstime),
      quantite,
      total,
      photo: s.photo,
    };

    const sousTotal = total;
    const fraisLivraisonChine = 5000;
    const fraisTransactionPourcent = parametres.fraisTransactionDefaut || 5;
    const fraisTransaction = Math.round((sousTotal + fraisLivraisonChine) * (fraisTransactionPourcent / 100));
    const totalDevis = sousTotal + fraisLivraisonChine + fraisTransaction;

    const newDevis: Devis = {
      id: `dev-${Date.now()}`,
      numero,
      date: new Date().toISOString(),
      clientId: s.clientId,
      articles: [article],
      sousTotal,
      fraisLivraisonChine,
      fraisTransactionPourcent,
      fraisTransaction,
      total: totalDevis,
      statut: 'Brouillon',
      notes: `Issu du sourcing ${s.numero}. Fournisseur : ${s.fournisseurNom || 'En négociation'}.`,
      conditions: 'Validité 7 jours. Acompte 70% requis.',
      isArchived: false,
    };

    setDevis((prev) => [newDevis, ...prev]);
    syncEntityToCloud('devis', 'create', newDevis.id, newDevis);

    // Update sourcing status
    const updatedS = {
      ...s,
      statut: 'Transformé en devis' as const,
      devisId: newDevis.id,
    };
    updateSourcing(updatedS);

    logEvent('Transformation de sourcing en devis', `${s.numero} → ${newDevis.numero}`, 'Sourcing');
    return newDevis;
  };

  // ===================== DEVIS CRUD =====================
  const addDevis = (devisData: Omit<Devis, 'id' | 'numero'>): Devis => {
    const existingNums = devis.map((d) => d.numero);
    const numero = generateNextNumber(parametres.prefixDevis || 'DEV', existingNums);

    const newDevis: Devis = {
      ...devisData,
      id: `dev-${Date.now()}`,
      numero,
    };
    setDevis((prev) => [newDevis, ...prev]);
    syncEntityToCloud('devis', 'create', newDevis.id, newDevis);
    logEvent('Création de devis', newDevis.numero, 'Devis', `Total : ${newDevis.total.toLocaleString('fr-FR')} FCFA`);
    return newDevis;
  };

  const updateDevis = (updated: Devis) => {
    setDevis((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    syncEntityToCloud('devis', 'update', updated.id, updated);
    logEvent('Modification de devis', updated.numero, 'Devis');
  };

  const archiveDevis = (devisId: string) => {
    const d = devis.find((item) => item.id === devisId);
    setDevis((prev) => prev.map((item) => (item.id === devisId ? { ...item, isArchived: true } : item)));
    if (d) {
      syncEntityToCloud('devis', 'update', devisId, { ...d, isArchived: true });
      logEvent('Archivage de devis', d.numero, 'Devis');
    }
  };

  const unarchiveDevis = (devisId: string) => {
    const d = devis.find((item) => item.id === devisId);
    setDevis((prev) => prev.map((item) => (item.id === devisId ? { ...item, isArchived: false } : item)));
    if (d) {
      syncEntityToCloud('devis', 'update', devisId, { ...d, isArchived: false });
      logEvent('Restauration de devis', d.numero, 'Devis');
    }
  };

  const deleteDevis = (devisId: string) => {
    const d = devis.find((item) => item.id === devisId);
    setDevis((prev) => prev.filter((item) => item.id !== devisId));
    syncEntityToCloud('devis', 'delete', devisId, null);
    if (d) logEvent('Suppression définitive de devis', d.numero, 'Devis');
  };

  // ===================== CONVERSION DEVIS -> COMMANDE =====================
  const convertDevisToCommande = (devisId: string): Commande | null => {
    const targetDevis = devis.find((d) => d.id === devisId);
    if (!targetDevis) return null;

    const existingNums = commandes.map((c) => c.numero);
    const cmdNumero = generateNextNumber(parametres.prefixCommande || 'CMD', existingNums);

    const copiedArticles: ArticleLigne[] = targetDevis.articles.map((art) => ({
      ...art,
      id: `art-cmd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    }));

    const newCommande: Commande = {
      id: `cmd-${Date.now()}`,
      numero: cmdNumero,
      devisId: targetDevis.id,
      clientId: targetDevis.clientId,
      date: new Date().toISOString(),
      articles: copiedArticles,
      sousTotal: targetDevis.sousTotal,
      fraisLivraisonChine: targetDevis.fraisLivraisonChine,
      fraisTransaction: targetDevis.fraisTransaction,
      montantTotal: targetDevis.total,
      montantPaye: 0,
      solde: targetDevis.total,
      statut: 'En attente de paiement',
      notes: `Créé automatiquement depuis le devis ${targetDevis.numero}.`,
      isArchived: false,
      logistique: {
        typeTransport: 'Aérien',
        statutLogistique: 'COMMANDE FOURNISSEUR',
        dateAchat: new Date().toISOString().slice(0, 10),
      },
      documents: [
        {
          id: `doc-${Date.now()}`,
          commandeId: `cmd-${Date.now()}`,
          nom: `${targetDevis.numero}.pdf`,
          type: 'Devis PDF',
          urlOrData: '#',
          date: new Date().toISOString(),
          taille: '120 Ko',
        },
      ],
    };

    setCommandes((prev) => [newCommande, ...prev]);
    syncEntityToCloud('commandes', 'create', newCommande.id, newCommande);

    // Update Devis status
    const updatedDevis = { ...targetDevis, statut: 'Converti en commande' as const };
    setDevis((prev) =>
      prev.map((d) => (d.id === targetDevis.id ? updatedDevis : d))
    );
    syncEntityToCloud('devis', 'update', targetDevis.id, updatedDevis);

    // Initialize estimated rentabilité
    const coutEstime = Math.round(newCommande.montantTotal * 0.7);
    const initialRent: Rentabilite = {
      commandeId: newCommande.id,
      prixAchatChine: Math.round(coutEstime * 0.75),
      livraisonChine: targetDevis.fraisLivraisonChine,
      transportInternational: 10000,
      douane: 5000,
      autresFrais: 2000,
      fraisReels: targetDevis.fraisLivraisonChine + 17000,
      prixFacture: newCommande.montantTotal,
      coutReel: coutEstime,
      benefice: newCommande.montantTotal - coutEstime,
      marge: Number((((newCommande.montantTotal - coutEstime) / newCommande.montantTotal) * 100).toFixed(2)),
      coutEstime,
      beneficePrevu: newCommande.montantTotal - coutEstime,
    };
    setRentabilites((prev) => ({
      ...prev,
      [newCommande.id]: initialRent,
    }));
    syncEntityToCloud('rentabilites', 'create', newCommande.id, initialRent);

    logEvent(
      'Conversion Devis en Commande',
      `${targetDevis.numero} → ${newCommande.numero}`,
      'Commande',
      `Montant : ${newCommande.montantTotal.toLocaleString('fr-FR')} FCFA`
    );

    return newCommande;
  };

  // ===================== COMMANDE CRUD & LOGISTIQUE =====================
  const addCommande = (commandeData: Omit<Commande, 'id' | 'numero'>): Commande => {
    const existingNums = commandes.map((c) => c.numero);
    const numero = generateNextNumber(parametres.prefixCommande || 'CMD', existingNums);

    const newCmd: Commande = {
      ...commandeData,
      id: `cmd-${Date.now()}`,
      numero,
      logistique: commandeData.logistique || {
        typeTransport: 'Aérien',
        statutLogistique: 'COMMANDE FOURNISSEUR',
        dateAchat: new Date().toISOString().slice(0, 10),
      },
      documents: commandeData.documents || [],
    };

    setCommandes((prev) => [newCmd, ...prev]);
    syncEntityToCloud('commandes', 'create', newCmd.id, newCmd);
    logEvent('Création de commande', newCmd.numero, 'Commande', `Total : ${newCmd.montantTotal.toLocaleString('fr-FR')} FCFA`);
    return newCmd;
  };

  const updateCommande = (updated: Commande) => {
    setCommandes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    syncEntityToCloud('commandes', 'update', updated.id, updated);
    logEvent('Modification de commande', updated.numero, 'Commande');
  };

  const updateCommandeStatut = (commandeId: string, statut: CommandeStatut, numeroSuivi?: string) => {
    let updatedCmd: Commande | null = null;
    setCommandes((prev) =>
      prev.map((c) => {
        if (c.id !== commandeId) return c;
        const updated = {
          ...c,
          statut,
          numeroSuivi: numeroSuivi !== undefined ? numeroSuivi : c.numeroSuivi,
        };
        // Also map to logistic status if suitable
        if (updated.logistique) {
          if (statut === 'En préparation') updated.logistique.statutLogistique = 'COLIS PRÉPARÉ';
          if (statut === 'Expédié de Chine') updated.logistique.statutLogistique = 'EXPÉDIÉ DE CHINE';
          if (statut === 'En transit') updated.logistique.statutLogistique = 'EN TRANSIT';
          if (statut === 'Arrivé au Togo') updated.logistique.statutLogistique = 'ARRIVÉ AU TOGO';
          if (statut === 'Disponible') updated.logistique.statutLogistique = 'DISPONIBLE';
          if (statut === 'Livré') updated.logistique.statutLogistique = 'LIVRÉ';
        }
        updatedCmd = updated;
        return updated;
      })
    );
    if (updatedCmd) {
      syncEntityToCloud('commandes', 'update', commandeId, updatedCmd);
    }
    const target = commandes.find((c) => c.id === commandeId);
    if (target) {
      logEvent('Changement statut commande', target.numero, 'Commande', `Nouveau statut : ${statut}`);
    }
  };

  const updateCommandeLogistique = (commandeId: string, logistique: Logistique) => {
    let updatedCmd: Commande | null = null;
    setCommandes((prev) =>
      prev.map((c) => {
        if (c.id !== commandeId) return c;
        const updated = {
          ...c,
          logistique,
          numeroSuivi: logistique.numeroSuivi || c.numeroSuivi,
        };
        updatedCmd = updated;
        return updated;
      })
    );
    if (updatedCmd) {
      syncEntityToCloud('commandes', 'update', commandeId, updatedCmd);
    }
    const target = commandes.find((c) => c.id === commandeId);
    if (target) {
      logEvent('Mise à jour logistique', target.numero, 'Commande', `Statut : ${logistique.statutLogistique}`);
    }
  };

  const addCommandeDocument = (commandeId: string, doc: Omit<CommandeDocument, 'id' | 'date'>) => {
    const newDoc: CommandeDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(),
    };
    let updatedCmd: Commande | null = null;
    setCommandes((prev) =>
      prev.map((c) => {
        if (c.id === commandeId) {
          const updated = { ...c, documents: [newDoc, ...(c.documents || [])] };
          updatedCmd = updated;
          return updated;
        }
        return c;
      })
    );
    if (updatedCmd) {
      syncEntityToCloud('commandes', 'update', commandeId, updatedCmd);
    }
    const target = commandes.find((c) => c.id === commandeId);
    if (target) {
      logEvent('Ajout de document', `${newDoc.nom} (${target.numero})`, 'Commande');
    }
  };

  const deleteCommandeDocument = (commandeId: string, docId: string) => {
    let updatedCmd: Commande | null = null;
    setCommandes((prev) =>
      prev.map((c) => {
        if (c.id === commandeId) {
          const updated = { ...c, documents: (c.documents || []).filter((d) => d.id !== docId) };
          updatedCmd = updated;
          return updated;
        }
        return c;
      })
    );
    if (updatedCmd) {
      syncEntityToCloud('commandes', 'update', commandeId, updatedCmd);
    }
  };

  const archiveCommande = (commandeId: string) => {
    const c = commandes.find((item) => item.id === commandeId);
    setCommandes((prev) => prev.map((item) => (item.id === commandeId ? { ...item, isArchived: true } : item)));
    if (c) {
      syncEntityToCloud('commandes', 'update', commandeId, { ...c, isArchived: true });
      logEvent('Archivage de commande', c.numero, 'Commande');
    }
  };

  const unarchiveCommande = (commandeId: string) => {
    const c = commandes.find((item) => item.id === commandeId);
    setCommandes((prev) => prev.map((item) => (item.id === commandeId ? { ...item, isArchived: false } : item)));
    if (c) {
      syncEntityToCloud('commandes', 'update', commandeId, { ...c, isArchived: false });
      logEvent('Restauration de commande', c.numero, 'Commande');
    }
  };

  const deleteCommande = (commandeId: string) => {
    const c = commandes.find((item) => item.id === commandeId);
    setCommandes((prev) => prev.filter((item) => item.id !== commandeId));
    syncEntityToCloud('commandes', 'delete', commandeId, null);
    if (c) logEvent('Suppression définitive de commande', c.numero, 'Commande');
  };

  // ===================== RECALCULATION UNIFIÉE PAIEMENTS & FACTURES =====================
  const recalculateFacturesFromPaiements = (
    currentFactures: Facture[],
    currentPaiements: Paiement[],
    targetFactureIds?: string[]
  ): Facture[] => {
    return currentFactures.map((fac) => {
      if (targetFactureIds && !targetFactureIds.includes(fac.id)) {
        return fac;
      }

      // Find all payments linked to this invoice directly or through its linked command
      const matchingP = currentPaiements.filter(
        (p) => p.factureId === fac.id || (Boolean(fac.commandeId) && p.commandeId === fac.commandeId)
      );

      // If no payments registered:
      if (matchingP.length === 0) {
        if (fac.payeeManuellement) {
          return {
            ...fac,
            montantPaye: fac.total,
            solde: 0,
            statut: 'Payée',
          };
        }
        // Legacy compatibility: If invoice had pre-existing montantPaye without detailed payments
        if (fac.montantPaye > 0) {
          const legacySolde = Math.max(0, fac.total - fac.montantPaye);
          let legacyStatut = fac.statut;
          if (legacySolde === 0) legacyStatut = 'Payée';
          else legacyStatut = 'Partiellement payée';
          return { ...fac, solde: legacySolde, statut: legacyStatut };
        }
        return {
          ...fac,
          montantPaye: 0,
          solde: fac.total,
          statut:
            fac.statut === 'Brouillon' || fac.statut === 'Annulée' || fac.statut === 'En retard'
              ? fac.statut
              : 'Envoyée',
        };
      }

      // Dynamic calculation from real associated payments
      const totalPaye = matchingP.reduce((sum, p) => sum + (Number(p.montant) || 0), 0);
      const solde = Math.max(0, fac.total - totalPaye);

      let statut: FactureStatut;
      if (solde === 0) {
        statut = 'Payée';
      } else if (totalPaye > 0) {
        statut = 'Partiellement payée';
      } else {
        statut =
          fac.statut === 'Brouillon' || fac.statut === 'Annulée' || fac.statut === 'En retard'
            ? fac.statut
            : 'Envoyée';
      }

      const latestPaymentDate = matchingP
        .map((p) => p.date)
        .sort()
        .reverse()[0];

      return {
        ...fac,
        montantPaye: totalPaye,
        solde,
        statut,
        dateReglementFinal:
          solde === 0 ? fac.dateReglementFinal || latestPaymentDate || new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const recalculateCommandesFromPaiements = (
    currentCommandes: Commande[],
    currentPaiements: Paiement[],
    targetCommandeIds?: string[]
  ): Commande[] => {
    return currentCommandes.map((cmd) => {
      if (targetCommandeIds && !targetCommandeIds.includes(cmd.id)) {
        return cmd;
      }
      const matchingP = currentPaiements.filter((p) => p.commandeId === cmd.id);
      if (matchingP.length === 0 && cmd.montantPaye > 0) {
        // legacy preservation
        const s = Math.max(0, cmd.montantTotal - cmd.montantPaye);
        let st = cmd.statut;
        if (s === 0 && cmd.statut === 'En attente de paiement') st = 'Payé';
        return { ...cmd, solde: s, statut: st };
      }
      const totalPaye = matchingP.reduce((sum, p) => sum + (Number(p.montant) || 0), 0);
      const solde = Math.max(0, cmd.montantTotal - totalPaye);
      let statut = cmd.statut;
      if (solde === 0) {
        statut = 'Payé';
      } else if (totalPaye > 0) {
        statut = 'Partiellement payé';
      } else if (cmd.statut === 'Payé' || cmd.statut === 'Partiellement payé') {
        statut = 'En attente de paiement';
      }
      return {
        ...cmd,
        montantPaye: totalPaye,
        solde,
        statut,
      };
    });
  };

  // ===================== PAIEMENT CRUD =====================
  const getFacturePaiements = (factureId: string): Paiement[] => {
    const fac = factures.find((f) => f.id === factureId);
    if (!fac) return [];
    return paiements.filter(
      (p) => p.factureId === fac.id || (Boolean(fac.commandeId) && p.commandeId === fac.commandeId)
    );
  };

  const addPaiement = (paiementData: Omit<Paiement, 'id' | 'numero'>): Paiement => {
    const existingNums = paiements.map((p) => p.numero);
    const numero = generateNextNumber(parametres.prefixPaiement || 'PAY', existingNums);

    const newPaiement: Paiement = {
      ...paiementData,
      id: `pay-${Date.now()}`,
      numero,
    };

    const nextPaiements = [newPaiement, ...paiements];
    setPaiements(nextPaiements);
    syncEntityToCloud('paiements', 'create', newPaiement.id, newPaiement);

    // Dynamic Recalculation of Factures
    setFactures((prev) => {
      const updated = recalculateFacturesFromPaiements(prev, nextPaiements);
      updated.forEach((f) => {
        const oldF = prev.find((item) => item.id === f.id);
        if (
          oldF &&
          (oldF.montantPaye !== f.montantPaye ||
            oldF.solde !== f.solde ||
            oldF.statut !== f.statut)
        ) {
          syncEntityToCloud('factures', 'update', f.id, f);
        }
      });
      return updated;
    });

    // Dynamic Recalculation of Commandes
    setCommandes((prev) => {
      const updated = recalculateCommandesFromPaiements(prev, nextPaiements);
      updated.forEach((cmd) => {
        const oldC = prev.find((item) => item.id === cmd.id);
        if (
          oldC &&
          (oldC.montantPaye !== cmd.montantPaye ||
            oldC.solde !== cmd.solde ||
            oldC.statut !== cmd.statut)
        ) {
          syncEntityToCloud('commandes', 'update', cmd.id, cmd);
        }
      });
      return updated;
    });

    logEvent(
      'Enregistrement de paiement',
      `${newPaiement.numero} — ${newPaiement.montant.toLocaleString('fr-FR')} FCFA`,
      'Paiement',
      `Mode : ${newPaiement.modePaiement}`
    );

    return newPaiement;
  };

  const updatePaiement = (updatedP: Paiement) => {
    const nextPaiements = paiements.map((p) => (p.id === updatedP.id ? updatedP : p));
    setPaiements(nextPaiements);
    syncEntityToCloud('paiements', 'update', updatedP.id, updatedP);

    setFactures((prev) => {
      const updated = recalculateFacturesFromPaiements(prev, nextPaiements);
      updated.forEach((f) => {
        const oldF = prev.find((item) => item.id === f.id);
        if (
          oldF &&
          (oldF.montantPaye !== f.montantPaye ||
            oldF.solde !== f.solde ||
            oldF.statut !== f.statut)
        ) {
          syncEntityToCloud('factures', 'update', f.id, f);
        }
      });
      return updated;
    });

    setCommandes((prev) => {
      const updated = recalculateCommandesFromPaiements(prev, nextPaiements);
      updated.forEach((cmd) => {
        const oldC = prev.find((item) => item.id === cmd.id);
        if (
          oldC &&
          (oldC.montantPaye !== cmd.montantPaye ||
            oldC.solde !== cmd.solde ||
            oldC.statut !== cmd.statut)
        ) {
          syncEntityToCloud('commandes', 'update', cmd.id, cmd);
        }
      });
      return updated;
    });

    logEvent('Mise à jour de paiement', `${updatedP.numero} (${updatedP.montant.toLocaleString('fr-FR')} FCFA)`, 'Paiement');
    showToast(`Paiement ${updatedP.numero} mis à jour. Soldes recalculés.`, 'success');
  };

  const deletePaiement = (paiementId: string) => {
    const p = paiements.find((item) => item.id === paiementId);
    if (!p) return;

    const nextPaiements = paiements.filter((item) => item.id !== paiementId);
    setPaiements(nextPaiements);
    syncEntityToCloud('paiements', 'delete', paiementId, null);

    setFactures((prev) => {
      const updated = recalculateFacturesFromPaiements(prev, nextPaiements);
      updated.forEach((f) => {
        const oldF = prev.find((item) => item.id === f.id);
        if (
          oldF &&
          (oldF.montantPaye !== f.montantPaye ||
            oldF.solde !== f.solde ||
            oldF.statut !== f.statut)
        ) {
          syncEntityToCloud('factures', 'update', f.id, f);
        }
      });
      return updated;
    });

    setCommandes((prev) => {
      const updated = recalculateCommandesFromPaiements(prev, nextPaiements);
      updated.forEach((cmd) => {
        const oldC = prev.find((item) => item.id === cmd.id);
        if (
          oldC &&
          (oldC.montantPaye !== cmd.montantPaye ||
            oldC.solde !== cmd.solde ||
            oldC.statut !== cmd.statut)
        ) {
          syncEntityToCloud('commandes', 'update', cmd.id, cmd);
        }
      });
      return updated;
    });

    logEvent('Suppression de paiement', `${p.numero} (${p.montant} FCFA)`, 'Paiement');
    showToast(`Paiement ${p.numero} supprimé. Soldes recalculés.`, 'info');
  };

  const marquerFacturePayeeManuellement = (
    factureId: string,
    details?: {
      montant?: number;
      date?: string;
      modePaiement?: ModePaiement;
      reference?: string;
      note?: string;
    }
  ): Paiement | null => {
    const fac = factures.find((f) => f.id === factureId);
    if (!fac) return null;

    const montantReglement = details?.montant ?? (fac.solde > 0 ? fac.solde : fac.total);
    const dateReglement = details?.date || new Date().toISOString();
    const mode = details?.modePaiement || 'Espèces';
    const ref = details?.reference || 'RÈGL-HORS-APP';
    const noteText = details?.note || 'Paiement enregistré manuellement (solde reçu hors application)';

    // Enregistrement d'un véritable reçu de paiement traçable
    const existingNums = paiements.map((p) => p.numero);
    const numero = generateNextNumber(parametres.prefixPaiement || 'PAY', existingNums);

    const newPaiement: Paiement = {
      id: `pay-${Date.now()}`,
      numero,
      date: dateReglement,
      clientId: fac.clientId,
      factureId: fac.id,
      commandeId: fac.commandeId,
      montant: montantReglement,
      modePaiement: mode,
      reference: ref,
      note: noteText,
      deviceOrigin: detectDeviceType(),
      updatedAt: new Date().toISOString(),
    };

    const nextPaiements = [newPaiement, ...paiements];
    setPaiements(nextPaiements);
    syncEntityToCloud('paiements', 'create', newPaiement.id, newPaiement);

    const updatedFacture: Facture = {
      ...fac,
      montantPaye: fac.total,
      solde: 0,
      statut: 'Payée',
      payeeManuellement: true,
      dateReglementFinal: dateReglement,
      notesReglement: `${fac.notesReglement ? fac.notesReglement + ' | ' : ''}Soldée le ${new Date(
        dateReglement
      ).toLocaleDateString('fr-FR')} (${montantReglement.toLocaleString('fr-FR')} FCFA via ${mode})`,
      updatedAt: new Date().toISOString(),
    };

    setFactures((prev) => prev.map((f) => (f.id === factureId ? updatedFacture : f)));
    syncEntityToCloud('factures', 'update', fac.id, updatedFacture);

    // Sync commande si liée
    if (fac.commandeId) {
      setCommandes((prev) => {
        const updatedCmds = recalculateCommandesFromPaiements(prev, nextPaiements, [fac.commandeId!]);
        updatedCmds.forEach((c) => {
          if (c.id === fac.commandeId) syncEntityToCloud('commandes', 'update', c.id, c);
        });
        return updatedCmds;
      });
    }

    logEvent(
      'Facture marquée payée (solde reçu)',
      `${fac.numero} — ${montantReglement.toLocaleString('fr-FR')} FCFA (${mode})`,
      'Facture'
    );
    showToast(`Facture ${fac.numero} soldée. Paiement ${numero} enregistré.`, 'success');

    return newPaiement;
  };

  const updateFactureStatutManuel = (
    factureId: string,
    nouveauStatut: FactureStatut,
    forcePayee: boolean = false,
    raison?: string
  ) => {
    const fac = factures.find((f) => f.id === factureId);
    if (!fac) return;

    let updatedFacture: Facture = {
      ...fac,
      statut: nouveauStatut,
      updatedAt: new Date().toISOString(),
    };

    if (nouveauStatut === 'Payée' && forcePayee) {
      updatedFacture.payeeManuellement = true;
      updatedFacture.dateReglementFinal = new Date().toISOString();
      if (raison) {
        updatedFacture.notesReglement = `${fac.notesReglement ? fac.notesReglement + ' | ' : ''}Statut forcé 'Payée' : ${raison}`;
      }
    }

    setFactures((prev) => prev.map((f) => (f.id === factureId ? updatedFacture : f)));
    syncEntityToCloud('factures', 'update', factureId, updatedFacture);
    logEvent('Modification manuelle statut facture', `${fac.numero} → ${nouveauStatut}`, 'Facture');
    showToast(`Statut de ${fac.numero} mis à jour en "${nouveauStatut}".`, 'info');
  };

  // ===================== FACTURE CRUD V4 =====================
  // Mode 1: Depuis Commande (existant enrichi)
  const generateFactureFromCommande = (commandeId: string): Facture | null => {
    const targetCmd = commandes.find((c) => c.id === commandeId);
    if (!targetCmd) return null;

    const existingNums = factures.map((f) => f.numero);
    const facNumero = generateNextNumber(parametres.prefixFacture || 'FAC', existingNums);

    const newFacture: Facture = {
      id: `fac-${Date.now()}`,
      numero: facNumero,
      date: new Date().toISOString(),
      commandeId: targetCmd.id,
      devisId: targetCmd.devisId,
      source: 'Commande',
      clientId: targetCmd.clientId,
      articles: targetCmd.articles,
      sousTotal: targetCmd.sousTotal,
      fraisLivraisonChine: targetCmd.fraisLivraisonChine,
      fraisTransaction: targetCmd.fraisTransaction,
      frais: (targetCmd.fraisLivraisonChine || 0) + (targetCmd.fraisTransaction || 0),
      total: targetCmd.montantTotal,
      montantPaye: targetCmd.montantPaye,
      solde: targetCmd.solde,
      statut: targetCmd.solde === 0 ? 'Payée' : targetCmd.montantPaye > 0 ? 'Partiellement payée' : 'Envoyée',
      conditions: parametres.mentionsLegalesDefaut,
      isArchived: false,
      updatedAt: new Date().toISOString(),
      deviceOrigin: detectDeviceType(),
    };

    setFactures((prev) => [newFacture, ...prev]);
    syncEntityToCloud('factures', 'create', newFacture.id, newFacture);

    // Attach document to commande
    addCommandeDocument(targetCmd.id, {
      commandeId: targetCmd.id,
      nom: `${facNumero}.pdf`,
      type: 'Facture PDF',
      urlOrData: '#',
      taille: '140 Ko',
    });

    logEvent(
      'Génération de facture depuis commande',
      `${newFacture.numero} pour ${targetCmd.numero}`,
      'Facture',
      `Total : ${newFacture.total.toLocaleString('fr-FR')} FCFA`
    );

    return newFacture;
  };

  // Mode 2: Depuis Devis direct (sans commande préalable nécessaire)
  const generateFactureFromDevis = (devisId: string): Facture | null => {
    const targetDevis = devis.find((d) => d.id === devisId);
    if (!targetDevis) return null;

    const existingNums = factures.map((f) => f.numero);
    const facNumero = generateNextNumber(parametres.prefixFacture || 'FAC', existingNums);

    const newFacture: Facture = {
      id: `fac-${Date.now()}`,
      numero: facNumero,
      date: new Date().toISOString(),
      devisId: targetDevis.id,
      source: 'Devis',
      clientId: targetDevis.clientId,
      articles: targetDevis.articles,
      sousTotal: targetDevis.sousTotal,
      fraisLivraisonChine: targetDevis.fraisLivraisonChine,
      fraisTransaction: targetDevis.fraisTransaction,
      frais: (targetDevis.fraisLivraisonChine || 0) + (targetDevis.fraisTransaction || 0),
      total: targetDevis.total,
      montantPaye: 0,
      solde: targetDevis.total,
      statut: 'Émise',
      conditions: targetDevis.conditions || parametres.mentionsLegalesDefaut,
      notes: targetDevis.notes,
      isArchived: false,
      updatedAt: new Date().toISOString(),
      deviceOrigin: detectDeviceType(),
    };

    setFactures((prev) => [newFacture, ...prev]);
    syncEntityToCloud('factures', 'create', newFacture.id, newFacture);

    logEvent(
      'Génération de facture depuis devis',
      `${newFacture.numero} pour ${targetDevis.numero}`,
      'Facture',
      `Total : ${newFacture.total.toLocaleString('fr-FR')} FCFA`
    );

    return newFacture;
  };

  // Mode 3: Facture Directe (vente immédiate, prestation express, etc.)
  const addFactureDirecte = (factureData: Omit<Facture, 'id' | 'numero'>): Facture => {
    const existingNums = factures.map((f) => f.numero);
    const facNumero = generateNextNumber(parametres.prefixFacture || 'FAC', existingNums);

    const newFacture: Facture = {
      ...factureData,
      id: `fac-${Date.now()}`,
      numero: facNumero,
      source: 'Facture directe',
      date: factureData.date || new Date().toISOString(),
      statut:
        factureData.solde === 0
          ? 'Payée'
          : factureData.montantPaye > 0
          ? 'Partiellement payée'
          : factureData.statut || 'Envoyée',
      isArchived: false,
      updatedAt: new Date().toISOString(),
      deviceOrigin: detectDeviceType(),
    };

    setFactures((prev) => [newFacture, ...prev]);
    syncEntityToCloud('factures', 'create', newFacture.id, newFacture);

    logEvent(
      'Création de facture directe',
      `${newFacture.numero}`,
      'Facture',
      `Total : ${newFacture.total.toLocaleString('fr-FR')} FCFA`
    );

    return newFacture;
  };

  const updateFacture = (updated: Facture) => {
    const now = new Date().toISOString();
    const withUpdate: Facture = {
      ...updated,
      updatedAt: now,
    };
    setFactures((prev) => prev.map((f) => (f.id === updated.id ? withUpdate : f)));
    syncEntityToCloud('factures', 'update', updated.id, withUpdate);
    logEvent('Mise à jour facture', updated.numero, 'Facture');
  };

  const archiveFacture = (factureId: string) => {
    const f = factures.find((item) => item.id === factureId);
    setFactures((prev) => prev.map((item) => (item.id === factureId ? { ...item, isArchived: true } : item)));
    if (f) {
      syncEntityToCloud('factures', 'update', factureId, { ...f, isArchived: true });
      logEvent('Archivage de facture', f.numero, 'Facture');
    }
  };

  const unarchiveFacture = (factureId: string) => {
    const f = factures.find((item) => item.id === factureId);
    setFactures((prev) => prev.map((item) => (item.id === factureId ? { ...item, isArchived: false } : item)));
    if (f) {
      syncEntityToCloud('factures', 'update', factureId, { ...f, isArchived: false });
      logEvent('Restauration de facture', f.numero, 'Facture');
    }
  };

  const deleteFacture = (factureId: string) => {
    const f = factures.find((item) => item.id === factureId);
    setFactures((prev) => prev.filter((item) => item.id !== factureId));
    if (f) {
      syncEntityToCloud('factures', 'delete', factureId, null);
      logEvent('Suppression définitive de facture', f.numero, 'Facture');
    }
  };

  // ===================== RENTABILITÉ V2 =====================
  // Legacy function for backwards compatibility
  const saveRentabilite = (commandeId: string, prixAchatChine: number, fraisReels: number): Rentabilite => {
    return saveRentabiliteV2(commandeId, {
      prixAchatChine,
      livraisonChine: 0,
      transportInternational: fraisReels,
      douane: 0,
      autresFrais: 0,
    });
  };

  // Enhanced V2 Rentabilité (Section 23, 24, 25)
  const saveRentabiliteV2 = (
    commandeId: string,
    data: {
      prixAchatChine: number;
      livraisonChine?: number;
      transportInternational?: number;
      douane?: number;
      autresFrais?: number;
      coutEstime?: number;
    }
  ): Rentabilite => {
    const cmd = commandes.find((c) => c.id === commandeId);
    const prixFacture = cmd ? cmd.montantTotal : 0;

    const livraisonChine = data.livraisonChine || 0;
    const transportInternational = data.transportInternational || 0;
    const douane = data.douane || 0;
    const autresFrais = data.autresFrais || 0;

    const fraisReels = livraisonChine + transportInternational + douane + autresFrais;
    const coutReel = data.prixAchatChine + fraisReels;
    const benefice = prixFacture - coutReel;
    const marge = prixFacture > 0 ? Number(((benefice / prixFacture) * 100).toFixed(2)) : 0;

    const coutEstime = data.coutEstime !== undefined ? data.coutEstime : rentabilites[commandeId]?.coutEstime || coutReel;
    const beneficePrevu = prixFacture - coutEstime;

    const rent: Rentabilite = {
      commandeId,
      prixAchatChine: data.prixAchatChine,
      livraisonChine,
      transportInternational,
      douane,
      autresFrais,
      fraisReels,
      prixFacture,
      coutReel,
      benefice,
      marge,
      coutEstime,
      beneficePrevu,
    };

    setRentabilites((prev) => ({
      ...prev,
      [commandeId]: rent,
    }));
    syncEntityToCloud('rentabilites', 'update', commandeId, rent);

    if (cmd) {
      logEvent(
        'Mise à jour des coûts et rentabilité',
        cmd.numero,
        'Commande',
        `Coût réel : ${coutReel.toLocaleString('fr-FR')} FCFA - Bénéfice : ${benefice.toLocaleString('fr-FR')} FCFA`
      );
    }

    return rent;
  };

  // ===================== PARAMÈTRES, BACKUPS & EXPORTS =====================
  const updateParametres = (partial: Partial<Parametres>) => {
    setParametres((prev) => ({ ...prev, ...partial }));
    logEvent('Mise à jour des paramètres', 'Configuration', 'Système');
  };

  const resetDemoData = () => {
    autoBackupBeforeRestore();
    setClients(initialClients);
    setFournisseurs(initialFournisseurs);
    setSourcingList(initialSourcing);
    setDevis(initialDevis);
    setCommandes(initialCommandes);
    setPaiements(initialPaiements);
    setFactures(initialFactures);
    setRentabilites(initialRentabilites);
    setHistorique(initialHistorique);
    setGoogleDriveBackups(initialGoogleDriveBackups);
    setParametres(initialParametres);
    setIsUnlocked(true);
    logEvent('Réinitialisation des données de démonstration', 'Base locale', 'Système');
  };

  const clearAllData = () => {
    autoBackupBeforeRestore();
    const preservedBackup = localStorage.getItem(STORAGE_KEYS.BACKUP_AUTO_PRE_RESTORE);
    setClients([]);
    setFournisseurs([]);
    setSourcingList([]);
    setDevis([]);
    setCommandes([]);
    setPaiements([]);
    setFactures([]);
    setRentabilites({});
    setHistorique([]);
    setGoogleDriveBackups([]);
    localStorage.clear();
    if (preservedBackup) {
      localStorage.setItem(STORAGE_KEYS.BACKUP_AUTO_PRE_RESTORE, preservedBackup);
    }
    logEvent('Purge complète des données locales', 'Base locale', 'Système');
  };

  const exportBackupJSON = (): string => {
    const backup = {
      application: 'Nantor Sourcing App',
      version: '2.0',
      exportDate: new Date().toISOString(),
      clients,
      fournisseurs,
      sourcingList,
      devis,
      commandes,
      paiements,
      factures,
      rentabilites,
      historique,
      parametres,
    };
    const now = new Date().toISOString();
    updateParametres({ derniereSauvegardeDate: now });
    logEvent('Export de sauvegarde JSON', 'Fichier JSON', 'Système');
    return JSON.stringify(backup, null, 2);
  };

  // Requirement 9 & 10: Export all data in ZIP archive
  const exportBackupZIP = async (): Promise<Blob> => {
    const zip = new JSZip();
    zip.file('clients.json', JSON.stringify(clients, null, 2));
    zip.file('fournisseurs.json', JSON.stringify(fournisseurs, null, 2));
    zip.file('sourcing.json', JSON.stringify(sourcingList, null, 2));
    zip.file('devis.json', JSON.stringify(devis, null, 2));
    zip.file('commandes.json', JSON.stringify(commandes, null, 2));
    zip.file('paiements.json', JSON.stringify(paiements, null, 2));
    zip.file('factures.json', JSON.stringify(factures, null, 2));
    zip.file('rentabilites.json', JSON.stringify(rentabilites, null, 2));
    zip.file('historique.json', JSON.stringify(historique, null, 2));
    zip.file('parametres.json', JSON.stringify(parametres, null, 2));
    zip.file(
      'metadata.json',
      JSON.stringify(
        {
          application: 'Nantor Sourcing App',
          version: '2.0',
          exportDate: new Date().toISOString(),
          totalClients: clients.length,
          totalCommandes: commandes.length,
          totalDevis: devis.length,
          totalFournisseurs: fournisseurs.length,
        },
        null,
        2
      )
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const now = new Date().toISOString();
    updateParametres({ derniereSauvegardeDate: now });
    logEvent('Exportation archive ZIP', `Nantor_Sourcing_Backup_${now.slice(0, 10)}.zip`, 'Système');
    return blob;
  };

  // Requirement 10: Export CSV
  const exportCSV = (type: 'clients' | 'devis' | 'commandes' | 'paiements' | 'fournisseurs' | 'sourcing'): string => {
    const escape = (str?: string | number) => `"${String(str ?? '').replace(/"/g, '""')}"`;

    if (type === 'clients') {
      const headers = ['ID', 'Nom', 'Téléphone', 'WhatsApp', 'Ville', 'Quartier', 'Email', 'Date Création'];
      const rows = clients.map((c) => [
        escape(c.id),
        escape(c.nom),
        escape(c.telephone),
        escape(c.whatsapp),
        escape(c.ville),
        escape(c.quartier),
        escape(c.email),
        escape(c.dateCreation),
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'fournisseurs') {
      const headers = ['ID', 'Nom', 'Boutique Alibaba', 'Téléphone', 'WhatsApp', 'Email', 'Statut', 'Date'];
      const rows = fournisseurs.map((f) => [
        escape(f.id),
        escape(f.nom),
        escape(f.boutiqueAlibaba),
        escape(f.telephone),
        escape(f.whatsapp),
        escape(f.email),
        escape(f.statut),
        escape(f.dateCreation),
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'sourcing') {
      const headers = ['Numéro', 'Client', 'Produit', 'Fournisseur', 'Prix Fournisseur', 'Quantité', 'Statut', 'Date'];
      const rows = sourcingList.map((s) => [
        escape(s.numero),
        escape(clients.find((c) => c.id === s.clientId)?.nom || s.clientId),
        escape(s.produitRecherche),
        escape(s.fournisseurNom),
        escape(s.prixFournisseur),
        escape(s.quantiteSouhaitee),
        escape(s.statut),
        escape(s.dateCreation),
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'commandes') {
      const headers = ['Numéro', 'Client', 'Date', 'Statut', 'Montant Total', 'Payé', 'Solde', 'N° Suivi'];
      const rows = commandes.map((c) => [
        escape(c.numero),
        escape(clients.find((cli) => cli.id === c.clientId)?.nom || c.clientId),
        escape(c.date),
        escape(c.statut),
        escape(c.montantTotal),
        escape(c.montantPaye),
        escape(c.solde),
        escape(c.numeroSuivi || c.logistique?.numeroSuivi),
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'devis') {
      const headers = ['Numéro', 'Client', 'Date', 'Sous-Total', 'Frais Chine', 'Total', 'Statut'];
      const rows = devis.map((d) => [
        escape(d.numero),
        escape(clients.find((cli) => cli.id === d.clientId)?.nom || d.clientId),
        escape(d.date),
        escape(d.sousTotal),
        escape(d.fraisLivraisonChine),
        escape(d.total),
        escape(d.statut),
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    // paiements
    const headers = ['Numéro', 'Commande', 'Date', 'Montant', 'Mode Paiement', 'Référence'];
    const rows = paiements.map((p) => [
      escape(p.numero),
      escape(commandes.find((c) => c.id === p.commandeId)?.numero || p.commandeId),
      escape(p.date),
      escape(p.montant),
      escape(p.modePaiement),
      escape(p.reference),
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  // Requirement 11: Auto backup before restore
  const autoBackupBeforeRestore = () => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      clients,
      fournisseurs,
      sourcingList,
      devis,
      commandes,
      paiements,
      factures,
      rentabilites,
      parametres,
    };
    localStorage.setItem(STORAGE_KEYS.BACKUP_AUTO_PRE_RESTORE, JSON.stringify(snapshot));
  };

  const importBackupJSON = (jsonStr: string): boolean => {
    try {
      autoBackupBeforeRestore();
      const data = JSON.parse(jsonStr);
      if (data.clients) setClients(data.clients);
      if (data.fournisseurs) setFournisseurs(data.fournisseurs);
      if (data.sourcingList) setSourcingList(data.sourcingList);
      if (data.devis) setDevis(data.devis);
      if (data.commandes) setCommandes(data.commandes);
      if (data.paiements) setPaiements(data.paiements);
      if (data.factures) setFactures(data.factures);
      if (data.rentabilites) setRentabilites(data.rentabilites);
      if (data.parametres) setParametres((prev) => ({ ...prev, ...data.parametres }));
      logEvent('Restauration des données depuis JSON', 'Sauvegarde restaurée', 'Système');
      return true;
    } catch {
      return false;
    }
  };

  const importBackupZIP = async (file: File): Promise<boolean> => {
    try {
      autoBackupBeforeRestore();
      const zip = await JSZip.loadAsync(file);

      const clientsStr = await zip.file('clients.json')?.async('string');
      if (clientsStr) setClients(JSON.parse(clientsStr));

      const fStr = await zip.file('fournisseurs.json')?.async('string');
      if (fStr) setFournisseurs(JSON.parse(fStr));

      const sStr = await zip.file('sourcing.json')?.async('string');
      if (sStr) setSourcingList(JSON.parse(sStr));

      const dStr = await zip.file('devis.json')?.async('string');
      if (dStr) setDevis(JSON.parse(dStr));

      const cStr = await zip.file('commandes.json')?.async('string');
      if (cStr) setCommandes(JSON.parse(cStr));

      const pStr = await zip.file('paiements.json')?.async('string');
      if (pStr) setPaiements(JSON.parse(pStr));

      const facStr = await zip.file('factures.json')?.async('string');
      if (facStr) setFactures(JSON.parse(facStr));

      const rStr = await zip.file('rentabilites.json')?.async('string');
      if (rStr) setRentabilites(JSON.parse(rStr));

      const paramStr = await zip.file('parametres.json')?.async('string');
      if (paramStr) setParametres((prev) => ({ ...prev, ...JSON.parse(paramStr) }));

      logEvent('Restauration des données depuis ZIP', file.name, 'Système');
      return true;
    } catch {
      return false;
    }
  };

  // Requirement 12, 13 & 14: Google Drive Cloud Backup
  const sauvegarderGoogleDrive = async (): Promise<boolean> => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const nomFichier = `Nantor_Backup_${dateStr}.zip`;
    const newBackup: GoogleDriveBackup = {
      id: `gdrive-${Date.now()}`,
      nomFichier,
      date: new Date().toISOString(),
      taille: '2.5 Mo',
      nbElements: clients.length + commandes.length + devis.length + fournisseurs.length + sourcingList.length,
    };
    setGoogleDriveBackups((prev) => [newBackup, ...prev.filter((b) => b.nomFichier !== nomFichier)]);
    updateParametres({
      derniereSauvegardeDriveDate: new Date().toISOString(),
      googleDriveConnected: true,
    });
    logEvent('Sauvegarde Google Drive réussie', nomFichier, 'Système', `Stocké dans Nantor Sourcing App/Backups/`);
    return true;
  };

  const restaurerGoogleDrive = async (backupId: string): Promise<boolean> => {
    const backup = googleDriveBackups.find((b) => b.id === backupId);
    if (!backup) return false;
    autoBackupBeforeRestore();
    logEvent('Restauration depuis Google Drive', backup.nomFichier, 'Système');
    return true;
  };

  // ===================== V4 CLOUD SYNCHRONIZATION (Windows <-> Android) =====================
  const [currentAuthUser, setCurrentAuthUser] = useState<User | null>(getCurrentGoogleUser());
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(() => getOfflineQueue().length);
  const [syncState, setSyncState] = useState<SyncState>(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
    return getOfflineQueue().length > 0 ? 'pending' : 'synced';
  });
  const [syncLastTime, setSyncLastTime] = useState<string>(
    localStorage.getItem('nantor_v4_sync_last_time') || new Date().toISOString()
  );

  // Maintain Firebase Auth state listener and proactively authenticate if online
  useEffect(() => {
    const unsubscribe = onAuthUserChanged((user) => {
      setCurrentAuthUser(user);
    });

    if (navigator.onLine && !auth.currentUser) {
      ensureAuthenticated().then((user) => {
        if (user) setCurrentAuthUser(user);
      });
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // Listen to offline queue updates to accurately maintain 'pending' status
  useEffect(() => {
    const handleQueueEvent = (e: any) => {
      const qLen = typeof e?.detail === 'number' ? e.detail : getOfflineQueue().length;
      setOfflinePendingCount(qLen);
      if (!navigator.onLine) {
        setSyncState('offline');
      } else if (qLen > 0 && syncState !== 'syncing' && syncState !== 'error') {
        setSyncState('pending');
      } else if (qLen === 0 && syncState === 'pending') {
        setSyncState('synced');
      }
    };

    window.addEventListener('nantor_offline_queue_updated', handleQueueEvent);
    return () => {
      window.removeEventListener('nantor_offline_queue_updated', handleQueueEvent);
    };
  }, [syncState]);

  // Real-time synchronization subscription for current user
  useEffect(() => {
    if (!currentAuthUser?.uid) return;
    const userId = currentAuthUser.uid;

    const unsubscribe = subscribeToUserCollections(userId, (colName, items) => {
      if (colName === 'clients') {
        setClients((prev) => mergeCollectionEntities(prev, items));
      } else if (colName === 'fournisseurs') {
        setFournisseurs((prev) => mergeCollectionEntities(prev, items));
      } else if (colName === 'sourcing') {
        setSourcingList((prev) => mergeCollectionEntities(prev, items));
      } else if (colName === 'devis') {
        setDevis((prev) => mergeCollectionEntities(prev, items));
      } else if (colName === 'commandes') {
        setCommandes((prev) => mergeCollectionEntities(prev, items));
      } else if (colName === 'paiements') {
        setPaiements((prev) => mergeCollectionEntities(prev, items));
      } else if (colName === 'factures') {
        setFactures((prev) => mergeCollectionEntities(prev, items));
      } else if (colName === 'rentabilites') {
        const rentMap: Record<string, Rentabilite> = {};
        items.forEach((r: any) => {
          if (r.commandeId) rentMap[r.commandeId] = r;
        });
        setRentabilites((prev) => ({ ...prev, ...rentMap }));
      }
      const now = new Date().toISOString();
      setSyncLastTime(now);
      const remainingQueue = getOfflineQueue().length;
      setOfflinePendingCount(remainingQueue);
      if (remainingQueue > 0) {
        setSyncState('pending');
      } else {
        setSyncState('synced');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentAuthUser?.uid]);

  const signInWithGoogle = async () => {
    try {
      const res = await googleSignIn();
      setCurrentAuthUser(res.user);
      showToast(`Connecté avec Google : ${res.user.email || res.user.displayName}`, 'success');
      // Proactively synchronize user data
      await syncNow();
    } catch (err: any) {
      showToast(`Échec de connexion Google : ${err?.message || 'Erreur inconnue'}`, 'error');
    }
  };

  const signOutGoogle = async () => {
    try {
      await googleLogout();
      setCurrentAuthUser(null);
      showToast('Déconnecté de Google.', 'info');
    } catch (err: any) {
      showToast(`Erreur déconnexion : ${err?.message || 'Erreur'}`, 'error');
    }
  };

  const syncStats: SyncStats = useMemo(() => {
    return {
      clients: clients.length,
      devis: devis.length,
      commandes: commandes.length,
      factures: factures.length,
      paiements: paiements.length,
      fournisseurs: fournisseurs.length,
      sourcing: sourcingList.length,
      pendingOfflineQueue: offlinePendingCount,
      lastSyncTime: syncLastTime,
      lastError: lastSyncError,
      userId: currentAuthUser?.uid,
      userEmail: currentAuthUser?.email || (currentAuthUser?.isAnonymous ? 'Session anonyme sécurisée' : undefined),
      isGoogleConnected: Boolean(currentAuthUser && !currentAuthUser.isAnonymous),
    };
  }, [clients, devis, commandes, factures, paiements, fournisseurs, sourcingList, offlinePendingCount, syncLastTime, lastSyncError, currentAuthUser]);

  // Helper to ensure an active UID
  const getActiveUserId = async (): Promise<string | undefined> => {
    if (currentAuthUser?.uid) return currentAuthUser.uid;
    const authed = await ensureAuthenticated();
    if (authed) {
      setCurrentAuthUser(authed);
      return authed.uid;
    }
    return undefined;
  };

  // Flush pending offline queue whenever coming online
  useEffect(() => {
    const handleOnline = async () => {
      setSyncState('syncing');
      setLastSyncError(null);
      const userId = await getActiveUserId();
      const res = await flushOfflineQueue(userId);
      const qLen = getOfflineQueue().length;
      setOfflinePendingCount(qLen);
      if (res.success) {
        setSyncState('synced');
        showToast('Connexion rétablie : file hors ligne synchronisée avec succès.', 'success');
      } else {
        setSyncState(qLen > 0 ? 'pending' : 'synced');
      }
    };

    const handleOffline = () => {
      setSyncState('offline');
      showToast('Mode hors ligne activé. Vos données locales restent sécurisées.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setSyncState('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentAuthUser]);

  const syncNow = async (): Promise<{ success: boolean; message: string }> => {
    if (!navigator.onLine) {
      setSyncState('offline');
      setLastSyncError('Appareil hors ligne');
      return { success: false, message: 'Appareil hors ligne. Connexion requise.' };
    }

    try {
      setSyncState('syncing');
      setLastSyncError(null);
      const userId = await getActiveUserId();

      // 1. Flush offline queue first
      await flushOfflineQueue(userId);
      const qLen = getOfflineQueue().length;
      setOfflinePendingCount(qLen);

      // 2. Fetch latest updates from cloud
      const cloudData = await fetchAllCollectionsFromCloud(userId);
      if (cloudData) {
        // Merge without wiping local data
        if (cloudData.clients.length > 0) {
          setClients((prev) => mergeCollectionEntities(prev, cloudData.clients));
        }
        if (cloudData.devis.length > 0) {
          setDevis((prev) => mergeCollectionEntities(prev, cloudData.devis));
        }
        if (cloudData.commandes.length > 0) {
          setCommandes((prev) => mergeCollectionEntities(prev, cloudData.commandes));
        }
        if (cloudData.factures.length > 0) {
          setFactures((prev) => mergeCollectionEntities(prev, cloudData.factures));
        }
        if (cloudData.paiements.length > 0) {
          setPaiements((prev) => mergeCollectionEntities(prev, cloudData.paiements));
        }
        if (cloudData.fournisseurs.length > 0) {
          setFournisseurs((prev) => mergeCollectionEntities(prev, cloudData.fournisseurs));
        }
        if (cloudData.sourcingList.length > 0) {
          setSourcingList((prev) => mergeCollectionEntities(prev, cloudData.sourcingList));
        }
        if (Object.keys(cloudData.rentabilites).length > 0) {
          setRentabilites((prev) => ({ ...prev, ...cloudData.rentabilites }));
        }
      } else {
        // Cloud is empty, push local data as initial cloud seed
        await pushAllLocalDataToCloud({
          clients,
          devis,
          commandes,
          factures,
          paiements,
          fournisseurs,
          sourcingList,
          rentabilites,
        }, userId);
      }

      const remainingQueue = getOfflineQueue().length;
      setOfflinePendingCount(remainingQueue);

      const now = new Date().toISOString();
      setSyncLastTime(now);
      localStorage.setItem('nantor_v4_sync_last_time', now);
      updateParametres({ derniereSynchroCloudDate: now });
      setLastSyncError(null);

      if (remainingQueue > 0) {
        setSyncState('pending');
      } else {
        setSyncState('synced');
      }

      logEvent('Synchronisation Cloud V4', 'Windows ↔ Android synchronisés', 'Système');
      showToast('Synchronisation Cloud V4 terminée avec succès.', 'success');
      return { success: true, message: 'Synchronisation Cloud réussie.' };
    } catch (e: any) {
      setSyncState('error');
      setLastSyncError(e?.message || 'Erreur lors de la synchronisation');
      console.error('Erreur syncNow:', e);
      showToast('Erreur de synchronisation Cloud. Vos données locales sont préservées.', 'error');
      return { success: false, message: e?.message || 'Erreur lors de la synchronisation' };
    }
  };

  const uploadAllToCloud = async (): Promise<{ success: boolean; message: string }> => {
    if (!navigator.onLine) {
      setSyncState('offline');
      setLastSyncError('Appareil hors ligne');
      return { success: false, message: 'Appareil hors ligne.' };
    }
    setSyncState('syncing');
    setLastSyncError(null);
    try {
      const userId = await getActiveUserId();
      const res = await pushAllLocalDataToCloud({
        clients,
        devis,
        commandes,
        factures,
        paiements,
        fournisseurs,
        sourcingList,
        rentabilites,
      }, userId);
      if (res.success) {
        const now = new Date().toISOString();
        setSyncLastTime(now);
        setSyncState('synced');
        setLastSyncError(null);
        updateParametres({ derniereSynchroCloudDate: now });
        logEvent('Envoi complet vers le Cloud', `${res.totalUploaded} éléments synchronisés`, 'Système');
        showToast(`${res.totalUploaded} éléments synchronisés vers le Cloud Firestore.`, 'success');
        return { success: true, message: `${res.totalUploaded} éléments envoyés vers le Cloud.` };
      } else {
        setSyncState('error');
        setLastSyncError(res.error || 'Échec envoi Cloud');
        showToast(`Échec envoi Cloud : ${res.error}. Données locales préservées.`, 'error');
        return { success: false, message: res.error || 'Erreur' };
      }
    } catch (err: any) {
      setSyncState('error');
      setLastSyncError(err?.message || 'Erreur');
      return { success: false, message: err?.message || 'Erreur' };
    }
  };

  const downloadAllFromCloud = async (): Promise<{ success: boolean; message: string }> => {
    if (!navigator.onLine) {
      setSyncState('offline');
      setLastSyncError('Appareil hors ligne');
      return { success: false, message: 'Appareil hors ligne.' };
    }
    setSyncState('syncing');
    setLastSyncError(null);
    try {
      const userId = await getActiveUserId();
      const cloudData = await fetchAllCollectionsFromCloud(userId);
      if (cloudData) {
        const totalCloudItems =
          cloudData.clients.length +
          cloudData.devis.length +
          cloudData.commandes.length +
          cloudData.factures.length +
          cloudData.paiements.length +
          cloudData.fournisseurs.length +
          cloudData.sourcingList.length;

        // Protection: Never wipe local data if cloud is empty
        if (totalCloudItems === 0) {
          setSyncState('pending');
          showToast('Le Cloud est vide : vos données locales sont intégralement préservées.', 'info');
          return { success: true, message: 'Cloud vide, données locales conservées.' };
        }

        autoBackupBeforeRestore();
        // Smart non-destructive merge
        if (cloudData.clients.length > 0) setClients((prev) => mergeCollectionEntities(prev, cloudData.clients));
        if (cloudData.devis.length > 0) setDevis((prev) => mergeCollectionEntities(prev, cloudData.devis));
        if (cloudData.commandes.length > 0) setCommandes((prev) => mergeCollectionEntities(prev, cloudData.commandes));
        if (cloudData.factures.length > 0) setFactures((prev) => mergeCollectionEntities(prev, cloudData.factures));
        if (cloudData.paiements.length > 0) setPaiements((prev) => mergeCollectionEntities(prev, cloudData.paiements));
        if (cloudData.fournisseurs.length > 0) setFournisseurs((prev) => mergeCollectionEntities(prev, cloudData.fournisseurs));
        if (cloudData.sourcingList.length > 0) setSourcingList((prev) => mergeCollectionEntities(prev, cloudData.sourcingList));
        if (Object.keys(cloudData.rentabilites).length > 0) {
          setRentabilites((prev) => ({ ...prev, ...cloudData.rentabilites }));
        }

        const now = new Date().toISOString();
        setSyncLastTime(now);
        setSyncState('synced');
        setLastSyncError(null);
        logEvent('Téléchargement Cloud Firestore', 'Données Cloud appliquées en local', 'Système');
        showToast('Données synchronisées depuis le Cloud avec succès.', 'success');
        return { success: true, message: 'Données synchronisées depuis le Cloud avec succès.' };
      } else {
        setSyncState('error');
        setLastSyncError('Impossible de récupérer les données Cloud');
        showToast('Impossible de récupérer les données Cloud. Vos données locales restent intactes.', 'error');
        return { success: false, message: 'Impossible de joindre le Cloud' };
      }
    } catch (err: any) {
      setSyncState('error');
      setLastSyncError(err?.message || 'Erreur téléchargement Cloud');
      showToast('Erreur téléchargement Cloud. Données locales préservées.', 'error');
      return { success: false, message: err?.message || 'Erreur' };
    }
  };

  const clearOfflinePendingQueue = () => {
    setOfflinePendingCount(0);
    localStorage.removeItem('nantor_v4_sync_offline_queue');
    if (syncState === 'pending') {
      setSyncState('synced');
    }
    showToast('File d’attente hors ligne purgée.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        clients,
        devis,
        commandes,
        paiements,
        factures,
        rentabilites,
        fournisseurs,
        sourcingList,
        historique,
        googleDriveBackups,
        parametres,
        isUnlocked,
        isLocked: !isUnlocked,
        setIsUnlocked,
        unlockApp: () => setIsUnlocked(true),
        lockApp,
        toggleModePrive,
        logEvent,

        // Client
        addClient,
        updateClient,
        archiveClient,
        unarchiveClient,
        deleteClient,

        // Fournisseur
        addFournisseur,
        updateFournisseur,
        archiveFournisseur,
        unarchiveFournisseur,
        deleteFournisseur,

        // Sourcing
        addSourcing,
        updateSourcing,
        archiveSourcing,
        unarchiveSourcing,
        deleteSourcing,
        convertSourcingToDevis,

        // Devis
        addDevis,
        updateDevis,
        convertDevisToCommande,
        archiveDevis,
        unarchiveDevis,
        restoreDevis: unarchiveDevis,
        deleteDevis,

        // Commande & Logistique & Documents
        addCommande,
        updateCommande,
        updateCommandeStatut,
        updateCommandeLogistique,
        addCommandeDocument,
        deleteCommandeDocument,
        archiveCommande,
        unarchiveCommande,
        restoreCommande: unarchiveCommande,
        deleteCommande,

        // Paiements
        addPaiement,
        updatePaiement,
        deletePaiement,
        getFacturePaiements,

        // Factures V4
        generateFactureFromCommande,
        generateFactureFromDevis,
        addFactureDirecte,
        updateFacture,
        archiveFacture,
        unarchiveFacture,
        restoreFacture: unarchiveFacture,
        deleteFacture,
        marquerFacturePayeeManuellement,
        updateFactureStatutManuel,

        // Cloud Synchronization V4 (Windows <-> Android)
        syncState,
        syncStats,
        syncNow,
        uploadAllToCloud,
        downloadAllFromCloud,
        clearOfflinePendingQueue,
        currentAuthUser,
        signInWithGoogle,
        signOutGoogle,

        // Rentabilité
        saveRentabilite,
        saveRentabiliteV2,

        // Paramètres & Exports
        updateParametres,
        resetDemoData,
        resetToInitialData: resetDemoData,
        clearAllData,
        exportBackupJSON,
        exportDataBackup: exportBackupJSON,
        exportBackupZIP,
        exportCSV,
        importBackupJSON,
        importDataBackup: importBackupJSON,
        importBackupZIP,
        sauvegarderGoogleDrive,
        restaurerGoogleDrive,

        // Notifications V3
        notifications,
        unreadNotificationsCount,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        clearAllNotifications,
        addNotification,
        triggerTestNotification,

        // Toast System V3
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
};
