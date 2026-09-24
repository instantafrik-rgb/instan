import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Settings,
  Lock,
  Search,
  Archive,
  Moon,
  Sun,
  Smartphone,
  Bell,
  BarChart3,
  FileSpreadsheet,
  MoreVertical,
  X,
  Compass,
  Building2,
  History,
  RefreshCw,
  Check,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TabType } from '../types';

interface NavbarProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  onOpenSearch: () => void;
  onOpenAndroidInstall?: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenSearch,
  onOpenAndroidInstall,
  onBack,
  canGoBack,
}) => {
  const {
    parametres,
    updateParametres,
    lockApp,
    unreadNotificationsCount,
    syncState,
    syncStats,
    syncNow,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fermeture par la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const formattedLastSync = React.useMemo(() => {
    if (!syncStats?.lastSyncTime) return null;
    try {
      const d = new Date(syncStats.lastSyncTime);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  }, [syncStats?.lastSyncTime]);

  const isCurrentlyDark =
    parametres.theme === 'dark_tech' ||
    parametres.theme === 'dark' ||
    (parametres.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    const nextTheme = isCurrentlyDark ? 'premium_light' : 'dark_tech';
    updateParametres({ theme: nextTheme });
  };

  const titles: Record<TabType, string> = {
    dashboard: 'Tableau de bord',
    clients: 'Gestion Clients',
    sourcing: 'Recherches Sourcing',
    fournisseurs: 'Fournisseurs Chine',
    devis: 'Devis Sourcing',
    commandes: 'Suivi Commandes',
    paiements: 'Règlements & Paiements',
    factures: 'Factures Clients (V4)',
    statistiques: 'Statistiques & KPI',
    notifications: 'Notifications',
    historique: 'Journal d’Audit',
    sheets: 'Google Sheets (NantorApp → Sheets)',
    parametres: 'Paramètres & Entreprise',
    archives: 'Archives',
  };

  // Détermine si un onglet secondaire accessible via le menu Plus est actuellement ouvert
  const isSecondaryTabActive = [
    'statistiques',
    'sheets',
    'archives',
    'parametres',
    'sourcing',
    'fournisseurs',
    'historique',
  ].includes(currentTab);

  const handleNavigate = (tab: TabType) => {
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        id="app-top-header"
        className="sticky top-0 z-30 bg-white dark:bg-[#0e1422] text-neutral-900 dark:text-white border-b border-neutral-200/80 dark:border-neutral-800 shadow-xs transition-colors"
      >
        {/* Micro bandeau de statut Android / PWA - compact et responsive */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50 dark:bg-[#080b12]">
          {!syncStats?.isGoogleConnected ? (
            <button
              id="status-sync-btn"
              onClick={() => setCurrentTab('parametres')}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-85 active:scale-98 transition py-0.5 text-neutral-600 dark:text-neutral-400"
              title="Cloud non connecté. Cliquez pour connecter un compte Google et activer la synchronisation multi-appareils."
            >
              <span className="text-[11px]">☁️</span>
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                Cloud non connecté
                <span className="hidden sm:inline font-normal text-neutral-500 dark:text-neutral-400"> • Données locales sécurisées</span>
              </span>
            </button>
          ) : (
            <button
              id="status-sync-btn"
              onClick={() => syncNow()}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-85 active:scale-98 transition py-0.5"
              title={`Cliquez pour forcer la synchronisation. Dernière synchronisation : ${
                syncStats?.lastSyncTime ? new Date(syncStats.lastSyncTime).toLocaleString('fr-FR') : 'Non renseignée'
              }`}
            >
              {syncState === 'synced' && (
                <>
                  <span className="text-[10px]">🟢</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Cloud connecté
                    <span className="hidden sm:inline"> • Synchronisé</span>
                  </span>
                </>
              )}
              {syncState === 'pending' && (
                <>
                  <span className="text-[10px]">🟡</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    Cloud connecté
                    <span className="hidden sm:inline"> • En attente ({syncStats?.pendingOfflineQueue || 1})</span>
                  </span>
                </>
              )}
              {syncState === 'syncing' && (
                <>
                  <span className="text-[10px] animate-spin">🔄</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    Synchronisation en cours...
                  </span>
                </>
              )}
              {syncState === 'error' && (
                <>
                  <span className="text-[10px]">🔴</span>
                  <span className="font-semibold text-rose-700 dark:text-rose-400 underline decoration-rose-400 underline-offset-2">
                    Erreur de synchronisation
                    <span className="hidden sm:inline"> — Réessayer</span>
                  </span>
                </>
              )}
              {syncState === 'offline' && (
                <>
                  <span className="text-[10px]">⚪</span>
                  <span className="font-semibold text-neutral-600 dark:text-neutral-400">
                    Hors connexion
                    <span className="hidden sm:inline"> • Données locales</span>
                  </span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {formattedLastSync && (
              <span className="hidden md:inline text-[10px] text-neutral-500 dark:text-neutral-400">
                Synchro : {formattedLastSync}
              </span>
            )}
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 text-[10px]">
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
                V4
              </span>
              <span className="hidden sm:inline font-sans">NANTOR SOURCING</span>
            </span>
            <span className="text-[10px] text-neutral-600 dark:text-neutral-300 font-bold tracking-wider">
              {parametres.devise}
            </span>
          </div>
        </div>

        {/* Barre principale de navigation */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5">
          {/* Logo & Titre */}
          <div className="flex items-center gap-2 select-none min-w-0 pr-2">
            {canGoBack && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 transition font-semibold text-xs cursor-pointer border border-neutral-200/80 dark:border-neutral-700/80 shrink-0"
                title="Retour à l'écran précédent"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Retour</span>
              </button>
            )}
            <div
              id="nav-logo-title"
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer min-w-0"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-cyan-500 dark:from-blue-600 dark:to-cyan-400 flex items-center justify-center font-bold text-white shadow-xs text-xs tracking-wider border border-blue-600/30 shrink-0">
                NSA
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-neutral-900 dark:text-white leading-tight truncate">
                  {titles[currentTab] || 'Nantor Sourcing App'}
                </h1>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:block truncate max-w-[220px]">
                  {parametres.entreprise.nom}
                </p>
              </div>
            </div>
          </div>

          {/* ACTIONS SUR DESKTOP (md: et plus grand) : Barre complète et confortable */}
          <div className="hidden md:flex items-center gap-1 sm:gap-1.5">
            {/* Bouton direct d'installation Android / PWA */}
            {onOpenAndroidInstall && (
              <button
                id="desktop-install-btn"
                onClick={onOpenAndroidInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black hover:opacity-90 transition font-medium text-xs shadow-xs cursor-pointer min-h-[36px]"
                title="Télécharger et installer l'application sur Android"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="font-semibold">Installer App</span>
              </button>
            )}

            {/* Statistiques & KPI */}
            <button
              id="desktop-nav-stats"
              onClick={() => setCurrentTab('statistiques')}
              className={`p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                currentTab === 'statistiques'
                  ? 'text-blue-600 bg-blue-50 dark:text-cyan-400 dark:bg-cyan-950/40 font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title="Statistiques & KPI"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            {/* Recherche globale */}
            <button
              id="desktop-nav-search"
              onClick={onOpenSearch}
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Recherche globale"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Centre de Notifications avec badge */}
            <button
              id="desktop-nav-notifications"
              onClick={() => setCurrentTab('notifications')}
              className={`p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl relative transition-colors cursor-pointer ${
                currentTab === 'notifications'
                  ? 'text-blue-600 bg-blue-50 dark:text-cyan-400 dark:bg-cyan-950/40'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title="Centre de Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 px-1 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-bold rounded-full bg-rose-500 text-white shadow-xs animate-pulse">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Bascule Thème */}
            <button
              id="desktop-nav-theme"
              onClick={toggleTheme}
              className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Basculer Thème (Nantor Dark Tech / Premium Light)"
            >
              {isCurrentlyDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-700" />
              )}
            </button>

            {/* Google Sheets (NantorApp → Sheets) */}
            <button
              id="desktop-nav-sheets"
              onClick={() => setCurrentTab('sheets')}
              className={`p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl transition-colors cursor-pointer relative ${
                currentTab === 'sheets'
                  ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50 font-semibold'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title="Google Sheets (NantorApp → Sheets)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {parametres.googleSheetsSpreadsheetId && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Archives */}
            <button
              id="desktop-nav-archives"
              onClick={() => setCurrentTab('archives')}
              className={`p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                currentTab === 'archives'
                  ? 'text-black bg-neutral-200 dark:text-white dark:bg-neutral-800'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title="Archives"
            >
              <Archive className="w-4 h-4" />
            </button>

            {/* Verrouillage PIN */}
            {parametres.pinEnabled && (
              <button
                id="desktop-nav-lock"
                onClick={lockApp}
                className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                title="Verrouiller avec code PIN"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}

            {/* Paramètres */}
            <button
              id="desktop-nav-settings"
              onClick={() => setCurrentTab('parametres')}
              className={`p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                currentTab === 'parametres'
                  ? 'text-black bg-neutral-200 dark:text-white dark:bg-neutral-800'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title="Paramètres"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* ACTIONS SUR MOBILE (< md:) : 3 actions confortables et espacées avec zone tactile >= 44px */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            {/* 1. Recherche essentielle (zone tactile 44x44px) */}
            <button
              id="mobile-nav-search"
              onClick={onOpenSearch}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer"
              title="Rechercher"
              aria-label="Recherche globale"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* 2. Notifications essentielles (zone tactile 44x44px) */}
            <button
              id="mobile-nav-notifications"
              onClick={() => setCurrentTab('notifications')}
              className={`w-11 h-11 relative flex items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 ${
                currentTab === 'notifications'
                  ? 'text-blue-600 bg-blue-50 dark:text-cyan-400 dark:bg-cyan-950/40'
                  : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title="Centre de Notifications"
              aria-label="Centre de Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-2 px-1 min-w-[15px] h-[15px] flex items-center justify-center text-[9px] font-bold rounded-full bg-rose-500 text-white shadow-xs">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* 3. Menu "Plus" / Actions secondaires regroupées (zone tactile 44x44px) */}
            <button
              id="mobile-nav-menu-more"
              onClick={() => setIsMobileMenuOpen(true)}
              className={`w-11 h-11 relative flex items-center justify-center rounded-xl border transition-all cursor-pointer active:scale-95 ${
                isMobileMenuOpen || isSecondaryTabActive
                  ? 'border-blue-500/50 bg-blue-50/80 text-blue-700 dark:border-cyan-500/50 dark:bg-cyan-950/40 dark:text-cyan-400 font-semibold'
                  : 'border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200/80 dark:hover:bg-neutral-700'
              }`}
              title="Menu et actions secondaires"
              aria-label="Menu et actions secondaires"
            >
              <MoreVertical className="w-5 h-5" />
              {/* Pastille indiquant qu'un module secondaire est actif ou nécessite attention */}
              {(isSecondaryTabActive || (parametres.pinEnabled && false)) && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 dark:bg-cyan-400 ring-2 ring-white dark:ring-neutral-900" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* TIROIR MODAL MOBILE "PLUS" : Toutes les actions secondaires regroupées avec ergonomie tactile */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu-overlay"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {/* Contenu du tiroir glissant depuis le bas */}
          <div
            id="mobile-menu-sheet"
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white dark:bg-[#0e1422] rounded-t-3xl border-t border-neutral-200 dark:border-neutral-800 shadow-2xl max-h-[88vh] flex flex-col pb-[max(env(safe-area-inset-bottom),16px)] overflow-hidden transition-all duration-250 ease-out"
          >
            {/* Barre de préhension tactile */}
            <div className="w-12 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700 mx-auto my-3 shrink-0" />

            {/* En-tête du tiroir */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Menu & Actions Rapides
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {parametres.entreprise.nom} • Nantor Sourcing
                </p>
              </div>
              <button
                id="close-mobile-menu-btn"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-11 h-11 flex items-center justify-center rounded-full text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 cursor-pointer"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps défilant du menu */}
            <div className="overflow-y-auto p-4 space-y-4 max-h-[calc(88vh-80px)]">
              {/* 1. Carte Thème Rapide */}
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-neutral-900 flex items-center justify-center shadow-xs border border-neutral-200 dark:border-neutral-700 shrink-0">
                    {isCurrentlyDark ? (
                      <Sun className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Moon className="w-5 h-5 text-neutral-700" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                      Thème d'affichage
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                      Actuel : {isCurrentlyDark ? 'Nantor Dark Tech' : 'Premium Light'}
                    </span>
                  </div>
                </div>
                <button
                  id="mobile-theme-toggle-btn"
                  onClick={toggleTheme}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 active:scale-95 transition cursor-pointer min-h-[44px] flex items-center"
                >
                  Basculer
                </button>
              </div>

              {/* 2. Bouton Téléchargement / Installation Android PWA (si disponible) */}
              {onOpenAndroidInstall && (
                <button
                  id="mobile-install-app-card"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAndroidInstall();
                  }}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-sm active:scale-98 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">Installer l'App Android</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-white/25 font-bold uppercase tracking-wider">
                          PWA / APK
                        </span>
                      </div>
                      <span className="text-xs text-blue-100">
                        Accès hors-ligne direct & plein écran
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/80" />
                </button>
              )}

              {/* 3. Section Utilitaires & Gestion */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-1 mb-2 block">
                  Utilitaires & Données
                </span>
                <div className="space-y-1.5">
                  {/* Google Sheets & Drive */}
                  <button
                    id="mobile-menu-sheets"
                    onClick={() => handleNavigate('sheets')}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition cursor-pointer active:scale-98 ${
                      currentTab === 'sheets'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60'
                        : 'bg-neutral-50/90 dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-150 dark:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold block">Google Sheets (NantorApp → Sheets)</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                          {parametres.googleSheetsSpreadsheetId
                            ? 'Tableur miroir • NantorApp → Google Sheets'
                            : 'Export tableur • NantorApp → Google Sheets'}
                        </span>
                      </div>
                    </div>
                    {parametres.googleSheetsSpreadsheetId && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                        Actif
                      </span>
                    )}
                  </button>

                  {/* Statistiques & KPI */}
                  <button
                    id="mobile-menu-stats"
                    onClick={() => handleNavigate('statistiques')}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition cursor-pointer active:scale-98 ${
                      currentTab === 'statistiques'
                        ? 'bg-blue-50 dark:bg-cyan-950/40 text-blue-800 dark:text-cyan-300 border border-blue-300 dark:border-cyan-700/60'
                        : 'bg-neutral-50/90 dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-150 dark:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold block">Statistiques & Marges</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                          Analyses financières, marges et graphiques
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Archives */}
                  <button
                    id="mobile-menu-archives"
                    onClick={() => handleNavigate('archives')}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition cursor-pointer active:scale-98 ${
                      currentTab === 'archives'
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-950 dark:text-white border border-neutral-300 dark:border-neutral-700'
                        : 'bg-neutral-50/90 dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-150 dark:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0">
                        <Archive className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold block">Archives Dossiers</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                          Consulter les devis, commandes et factures archivés
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Paramètres & Entreprise */}
                  <button
                    id="mobile-menu-settings"
                    onClick={() => handleNavigate('parametres')}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition cursor-pointer active:scale-98 ${
                      currentTab === 'parametres'
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-950 dark:text-white border border-neutral-300 dark:border-neutral-700'
                        : 'bg-neutral-50/90 dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-150 dark:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0">
                        <Settings className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold block">Paramètres & Entreprise</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                          Coordonnées, devise, sécurité et sauvegardes
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Verrouillage PIN (si configuré) */}
                  {parametres.pinEnabled && (
                    <button
                      id="mobile-menu-lock"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        lockApp();
                      }}
                      className="w-full p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center justify-between transition cursor-pointer active:scale-98"
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold block">Verrouiller l'écran</span>
                          <span className="text-xs opacity-80 block">
                            Protection immédiate par code PIN
                          </span>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Section Autres Modules Métier */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-1 mb-2 block">
                  Autres Modules Métier
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Sourcing */}
                  <button
                    id="mobile-menu-sourcing"
                    onClick={() => handleNavigate('sourcing')}
                    className={`p-3 rounded-2xl flex items-center gap-3 text-left transition cursor-pointer active:scale-98 ${
                      currentTab === 'sourcing'
                        ? 'bg-blue-50 dark:bg-cyan-950/40 text-blue-800 dark:text-cyan-300 border border-blue-300 dark:border-cyan-700/60'
                        : 'bg-neutral-50/90 dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-150 dark:border-neutral-800'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Compass className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Recherches Sourcing</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                        Cotations 1688 & articles
                      </span>
                    </div>
                  </button>

                  {/* Fournisseurs */}
                  <button
                    id="mobile-menu-fournisseurs"
                    onClick={() => handleNavigate('fournisseurs')}
                    className={`p-3 rounded-2xl flex items-center gap-3 text-left transition cursor-pointer active:scale-98 ${
                      currentTab === 'fournisseurs'
                        ? 'bg-blue-50 dark:bg-cyan-950/40 text-blue-800 dark:text-cyan-300 border border-blue-300 dark:border-cyan-700/60'
                        : 'bg-neutral-50/90 dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-150 dark:border-neutral-800'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Building2 className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Fournisseurs Chine</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                        Usines & contacts WeChat
                      </span>
                    </div>
                  </button>

                  {/* Journal d'Audit */}
                  <button
                    id="mobile-menu-historique"
                    onClick={() => handleNavigate('historique')}
                    className={`p-3 rounded-2xl flex items-center gap-3 text-left transition cursor-pointer active:scale-98 col-span-1 sm:col-span-2 ${
                      currentTab === 'historique'
                        ? 'bg-blue-50 dark:bg-cyan-950/40 text-blue-800 dark:text-cyan-300 border border-blue-300 dark:border-cyan-700/60'
                        : 'bg-neutral-50/90 dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-150 dark:border-neutral-800'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <History className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Journal d'Audit</span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                        Historique des modifications & traçabilité
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 5. Pied du menu avec statut et forçage de synchronisation */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-2">
                <button
                  id="mobile-menu-force-sync"
                  onClick={() => syncNow()}
                  className="w-full py-2.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100/70 dark:bg-neutral-800/70 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>Forcer la synchronisation cloud</span>
                </button>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 px-1 font-mono">
                  <span>NANTOR SOURCING V4</span>
                  <span>DEVISE : {parametres.devise}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
