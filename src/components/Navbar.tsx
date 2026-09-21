import React from 'react';
import {
  Settings,
  Lock,
  Search,
  Archive,
  Moon,
  Sun,
  Smartphone,
  Cable,
  Bell,
  BarChart3,
  FileSpreadsheet,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TabType } from '../types';

interface NavbarProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  onOpenSearch: () => void;
  onOpenAndroidInstall?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenSearch,
  onOpenAndroidInstall,
}) => {
  const { parametres, updateParametres, lockApp, unreadNotificationsCount, syncState, syncNow } = useApp();

  const toggleTheme = () => {
    const isCurrentlyDark =
      parametres.theme === 'dark_tech' ||
      parametres.theme === 'dark' ||
      (parametres.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
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
    sheets: 'Google Sheets & Drive',
    parametres: 'Paramètres & Entreprise',
    archives: 'Archives',
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#0e1422] text-neutral-900 dark:text-white border-b border-neutral-200/80 dark:border-neutral-800 shadow-xs transition-colors">
      {/* Android-style micro status strip */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50 dark:bg-[#080b12]">
        <button
          onClick={() => {
            syncNow();
          }}
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition"
          title="Cliquez pour synchroniser le Cloud maintenant"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full inline-block ${
              syncState === 'synced'
                ? 'bg-emerald-500'
                : syncState === 'syncing'
                ? 'bg-blue-500 animate-spin'
                : syncState === 'offline'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
          />
          <span className="font-semibold">
            {syncState === 'synced'
              ? 'CLOUD SYNC ACTIF • WIN ↔ ANDROID'
              : syncState === 'syncing'
              ? 'SYNCHRONISATION EN COURS...'
              : syncState === 'offline'
              ? 'MODE HORS LIGNE • ATTENTE CONNEXION'
              : 'ERREUR CLOUD • LOCAL OK'}
          </span>
        </button>
        <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
            V4
          </span>
          NANTOR SOURCING APP
        </span>
        <span className="text-[10px] text-neutral-600 dark:text-neutral-300 font-medium tracking-wider">
          {parametres.devise}
        </span>
      </div>

      {/* Main Top App Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3">
        <div
          onClick={() => setCurrentTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-cyan-500 dark:from-blue-600 dark:to-cyan-400 flex items-center justify-center font-bold text-white shadow-xs text-xs tracking-wider border border-blue-600/30">
            NSA
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
              {titles[currentTab] || 'Nantor Sourcing App'}
            </h1>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:block truncate max-w-[220px]">
              {parametres.entreprise.nom}
            </p>
          </div>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Direct Android APK Install Action Button */}
          {onOpenAndroidInstall && (
            <button
              onClick={onOpenAndroidInstall}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black hover:opacity-90 transition font-medium text-xs shadow-xs cursor-pointer"
              title="Télécharger et installer l'application sur Android"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="font-semibold">Installer App</span>
            </button>
          )}

          {/* Quick Stats tab access */}
          <button
            onClick={() => setCurrentTab('statistiques')}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              currentTab === 'statistiques'
                ? 'text-blue-600 bg-blue-50 dark:text-cyan-400 dark:bg-cyan-950/40 font-semibold'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Statistiques & KPI"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          {/* Global Search */}
          <button
            onClick={onOpenSearch}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            title="Recherche globale"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Center of Notifications Button with Badge */}
          <button
            onClick={() => setCurrentTab('notifications')}
            className={`p-2 rounded-xl relative transition-colors cursor-pointer ${
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

          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            title="Basculer Thème (Nantor Dark Tech / Premium Light)"
          >
            {parametres.theme === 'premium_light' || parametres.theme === 'light' ? (
              <Moon className="w-4 h-4 text-neutral-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Quick Google Sheets & Drive access */}
          <button
            onClick={() => setCurrentTab('sheets')}
            className={`p-2 rounded-xl transition-colors cursor-pointer relative ${
              currentTab === 'sheets'
                ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50 font-semibold'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Google Sheets & Drive Workspace"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {parametres.googleSheetsSpreadsheetId && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          <button
            onClick={() => setCurrentTab('archives')}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              currentTab === 'archives'
                ? 'text-black bg-neutral-200 dark:text-white dark:bg-neutral-800'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Archives"
          >
            <Archive className="w-4 h-4" />
          </button>

          {parametres.pinEnabled && (
            <button
              onClick={lockApp}
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
              title="Verrouiller avec code PIN"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setCurrentTab('parametres')}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              currentTab === 'parametres'
                ? 'text-black bg-neutral-200 dark:text-white dark:bg-neutral-800'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

