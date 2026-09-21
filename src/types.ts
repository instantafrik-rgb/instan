export type Currency = 'FCFA';

export type DevisStatut = 
  | 'Brouillon'
  | 'Envoyé'
  | 'Accepté'
  | 'Refusé'
  | 'Expiré'
  | 'Converti en commande';

export type CommandeStatut =
  | 'En attente de paiement'
  | 'Partiellement payé'
  | 'Payé'
  | 'Commande Alibaba'
  | 'Produit acheté'
  | 'En préparation'
  | 'Expédié de Chine'
  | 'En transit'
  | 'Arrivé au Togo'
  | 'Disponible'
  | 'Livré'
  | 'Annulé';

export type LogistiqueStatut =
  | 'COMMANDE FOURNISSEUR'
  | 'PRODUIT REÇU EN CHINE'
  | 'COLIS PRÉPARÉ'
  | 'EXPÉDIÉ DE CHINE'
  | 'EN TRANSIT'
  | 'ARRIVÉ AU TOGO'
  | 'DÉDOUANEMENT'
  | 'DISPONIBLE'
  | 'LIVRÉ';

export type TypeTransport = 'Maritime' | 'Aérien' | 'Routier' | 'Autre';

export type FactureStatut =
  | 'Brouillon'
  | 'Émise'
  | 'Envoyée'
  | 'Partiellement payée'
  | 'Payée'
  | 'Annulée'
  | 'PAYÉ'
  | 'PARTIELLEMENT PAYÉ';

export type FactureSource = 'Devis' | 'Commande' | 'Facture directe';

export type ModePaiement =
  | 'Espèces'
  | 'TMoney'
  | 'Flooz'
  | 'Virement bancaire'
  | 'Autre';

export type FournisseurStatut = 'Actif' | 'Inactif' | 'À vérifier' | 'Favori' | 'En négociation';

export interface Fournisseur {
  id: string;
  nom: string;
  contactNom?: string;
  boutiqueAlibaba?: string;
  lienAlibaba?: string;
  telephone?: string;
  whatsapp?: string;
  wechat?: string;
  email?: string;
  adresse?: string;
  villeChine?: string;
  categorieProduits?: string;
  noteFiabilite?: number; // 1 à 5 étoiles
  delaiMoyenExpeditionJours?: number;
  notes?: string;
  statut: FournisseurStatut;
  dateCreation: string;
  isArchived?: boolean;
}

export type SourcingStatut =
  | 'Recherche'
  | 'À chercher'
  | 'Fournisseur trouvé'
  | 'En contact fournisseur'
  | 'Prix reçu'
  | 'Prix validé'
  | 'Échantillon demandé'
  | 'Validé'
  | 'Refusé'
  | 'Abandonné'
  | 'Transformé en devis';

export interface Sourcing {
  id: string;
  numero: string; // SRC-2026-0001
  clientId: string;
  produitRecherche: string;
  photo?: string;
  description?: string;
  lienAlibaba?: string;
  fournisseurId?: string;
  fournisseurNom?: string;
  prixFournisseur?: number;
  quantiteSouhaitee?: number;
  moq?: number;
  notes?: string;
  statut: SourcingStatut;
  dateCreation: string;
  devisId?: string;
  isArchived?: boolean;
}

export interface ArticleLigne {
  id: string;
  nomProduit: string;
  description?: string;
  lienAlibaba?: string;
  fournisseurId?: string;
  fournisseurNom?: string;
  prixUnitaire: number;
  quantite: number;
  total: number;
  photo?: string; // Base64 data URL
}

export interface Client {
  id: string;
  nom: string;
  prenom?: string;
  telephone: string;
  whatsapp: string;
  ville: string;
  quartier: string;
  adresse?: string;
  email?: string;
  notes?: string;
  dateCreation: string; // ISO string
  isArchived?: boolean;
}

export interface Devis {
  id: string;
  numero: string; // DEV-2026-0001
  date: string;
  clientId: string;
  articles: ArticleLigne[];
  sousTotal: number;
  fraisLivraisonChine: number;
  fraisTransactionPourcent: number; // e.g. 5
  fraisTransaction: number;
  total: number;
  statut: DevisStatut;
  notes?: string;
  conditions?: string;
  isArchived?: boolean;
}

export interface Logistique {
  typeTransport: TypeTransport;
  transporteur?: string;
  numeroSuivi?: string;
  entrepotChine?: string;
  poidsKg?: number;
  volumeCbm?: number;
  dateAchat?: string;
  dateReceptionChine?: string;
  dateExpedition?: string;
  dateArriveePrevue?: string;
  dateArriveeTogo?: string;
  dateLivraisonClient?: string;
  notes?: string;
  statutLogistique: LogistiqueStatut;
}

export interface CommandeDocument {
  id: string;
  commandeId: string;
  nom: string;
  type: 'Devis PDF' | 'Facture PDF' | 'Preuve de paiement' | 'Photo produit' | 'Document transport' | 'Autre';
  urlOrData: string;
  date: string;
  taille?: string;
}

export interface Commande {
  id: string;
  numero: string; // CMD-2026-0001
  devisId?: string;
  clientId: string;
  date: string;
  articles: ArticleLigne[];
  sousTotal: number;
  fraisLivraisonChine: number;
  fraisTransaction: number;
  montantTotal: number;
  montantPaye: number;
  solde: number;
  statut: CommandeStatut;
  numeroSuivi?: string;
  notes?: string;
  logistique?: Logistique;
  documents?: CommandeDocument[];
  isArchived?: boolean;
}

export interface Paiement {
  id: string;
  numero: string; // PAY-2026-0001
  date: string;
  clientId: string;
  commandeId?: string; // Optionnel si lié directement à une facture
  factureId?: string; // Optionnel : lien direct avec une facture
  montant: number;
  modePaiement: ModePaiement;
  reference?: string;
  note?: string;
  updatedAt?: string;
  deviceOrigin?: 'windows' | 'android';
}

export interface Facture {
  id: string;
  numero: string; // FAC-2026-0001
  date: string;
  clientId: string;
  commandeId?: string; // Optionnel : présent si issu d'une commande
  devisId?: string; // Optionnel : présent si issu d'un devis
  source?: FactureSource; // 'Devis' | 'Commande' | 'Facture directe'
  articles: ArticleLigne[];
  sousTotal: number;
  fraisLivraisonChine?: number;
  fraisTransaction?: number;
  fraisLivraison?: number; // Frais de livraison directe (ex: Lomé ou transport)
  fraisAutres?: number; // Autres frais annexes
  frais: number;
  total: number;
  montantPaye: number;
  solde: number;
  statut: FactureStatut;
  conditions?: string;
  notes?: string;
  isArchived?: boolean;
  updatedAt?: string;
  deviceOrigin?: 'windows' | 'android';
}

export interface Rentabilite {
  commandeId: string;
  prixAchatChine: number;
  livraisonChine?: number;
  transportInternational?: number;
  douane?: number;
  autresFrais?: number;
  fraisReels: number; // Frais réels supplémentaires
  prixFacture: number;
  coutReel: number; // prixAchatChine + fraisReels
  benefice: number; // prixFacture - coutReel
  marge: number; // (benefice / prixFacture) * 100
  coutEstime?: number; // Coût prévu
  beneficePrevu?: number; // Prix facturé - coût prévu
}

export interface HistoriqueItem {
  id: string;
  date: string; // ISO
  heure: string; // HH:mm
  action: string;
  objetConcerne: string;
  details?: string;
  categorie: 'Client' | 'Devis' | 'Commande' | 'Paiement' | 'Facture' | 'Sourcing' | 'Fournisseur' | 'Système';
}

export type NotificationCategorie = 'Paiements' | 'Commandes' | 'Logistique' | 'Devis' | 'Rappels' | 'Système';
export type NotificationPriorite = 'info' | 'warning' | 'success' | 'urgent';

export interface NotificationItem {
  id: string;
  titre: string;
  message: string;
  date: string; // ISO string
  type?: 'info' | 'warning' | 'success' | 'urgent';
  categorie?: NotificationCategorie;
  priorite?: NotificationPriorite;
  read: boolean;
  lienTab?: TabType;
  cibleType?: 'commande' | 'devis' | 'paiement' | 'client' | 'parametres';
  cibleId?: string;
}

export interface NotificationPrefs {
  enabled: boolean;
  paiements: boolean;
  commandes: boolean;
  logistique: boolean;
  devis: boolean;
  rappels: boolean;
  son: boolean;
  vibration: boolean;
  rappelsAuto: boolean;
}

export type ThemeOption = 'dark_tech' | 'premium_light' | 'system' | 'dark' | 'light';

export interface GoogleDriveBackup {
  id: string;
  nomFichier: string;
  date: string;
  taille: string;
  nbElements: number;
}

export interface Parametres {
  entreprise: {
    nom: string;
    logo?: string;
    telephone: string;
    whatsapp: string;
    email: string;
    adresse: string;
    ville: string;
    pays?: string;
    siteInternet?: string;
  };
  devise: string; // 'FCFA'
  fraisTransactionDefaut: number; // 5
  mentionsLegalesDefaut?: string;
  prefixDevis: string;
  prefixCommande: string;
  prefixFacture: string;
  prefixPaiement: string;
  prefixSourcing: string;
  theme: ThemeOption;
  pinEnabled: boolean;
  pinCode?: string; // 4 digits
  codePin?: string;
  modePrive: boolean; // Masquage données sensibles en présence client
  notificationsEnabled: boolean;
  notificationPrefs?: NotificationPrefs;
  autoBackupFrequency: 'Désactivée' | 'Quotidienne' | 'Hebdomadaire';
  derniereSauvegardeDate?: string;
  derniereSauvegardeDriveDate?: string;
  googleDriveConnected?: boolean;
  googleDriveEmail?: string;
  googleSheetsSpreadsheetId?: string;
  googleSheetsSpreadsheetUrl?: string;
  derniereSynchroSheetsDate?: string;
  // V4 Cloud Sync (Windows <-> Android)
  syncEnabled?: boolean;
  syncDeviceName?: string;
  syncDeviceType?: 'windows' | 'android';
  derniereSynchroCloudDate?: string;
  cloudSyncUserEmail?: string;
}

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncStats {
  clients: number;
  devis: number;
  commandes: number;
  factures: number;
  paiements: number;
  fournisseurs: number;
  sourcing: number;
  pendingOfflineQueue: number;
  lastSyncTime?: string;
  lastError?: string;
}

export interface OfflineQueueItem {
  id: string;
  collection: 'clients' | 'devis' | 'commandes' | 'factures' | 'paiements' | 'fournisseurs' | 'sourcing' | 'rentabilites';
  action: 'create' | 'update' | 'delete';
  documentId: string;
  payload: any;
  timestamp: string;
}

export type TabType = 
  | 'dashboard'
  | 'clients'
  | 'sourcing'
  | 'fournisseurs'
  | 'devis'
  | 'commandes'
  | 'paiements'
  | 'factures'
  | 'statistiques'
  | 'notifications'
  | 'historique'
  | 'sheets'
  | 'parametres'
  | 'archives';
