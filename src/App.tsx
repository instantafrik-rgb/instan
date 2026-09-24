import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { ClientsView } from './components/ClientsView';
import { DevisView } from './components/DevisView';
import { CommandesView } from './components/CommandesView';
import { PaiementsView } from './components/PaiementsView';
import { FacturesView } from './components/FacturesView';
import { ParametresView } from './components/ParametresView';
import { NotificationsView } from './components/NotificationsView';
import { SourcingView } from './components/SourcingView';
import { FournisseursView } from './components/FournisseursView';
import { StatistiquesView } from './components/StatistiquesView';
import { HistoriqueView } from './components/HistoriqueView';
import { DevisFormModal } from './components/DevisFormModal';
import { DevisDetailModal } from './components/DevisDetailModal';
import { CommandeDetailModal } from './components/CommandeDetailModal';
import { FactureDetailModal } from './components/FactureDetailModal';
import { ClientDetailModal } from './components/ClientDetailModal';
import { PaiementFormModal } from './components/PaiementFormModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { PinLockModal } from './components/PinLockModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { GoogleSheetsView } from './components/GoogleSheetsView';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { TabType, Commande, Devis, Client, Facture } from './types';

interface NavigationScreen {
  tab: TabType;
  filter?: string | null;
  // Detail modals state
  selectedCommandeId?: string | null;
  selectedDevisId?: string | null;
  selectedFactureId?: string | null;
  selectedClientId?: string | null;
  isSearchOpen?: boolean;
  isInstallModalOpen?: boolean;
  isNewDevisModalOpen?: boolean;
  preselectedClientIdForDevis?: string | null;
  isNewPaiementModalOpen?: boolean;
  preselectedCommandeIdForPaiement?: string | null;
}

const initialScreen: NavigationScreen = {
  tab: 'dashboard',
  filter: null,
  selectedCommandeId: null,
  selectedDevisId: null,
  selectedFactureId: null,
  selectedClientId: null,
  isSearchOpen: false,
  isInstallModalOpen: false,
  isNewDevisModalOpen: false,
  preselectedClientIdForDevis: null,
  isNewPaiementModalOpen: false,
  preselectedCommandeIdForPaiement: null,
};

const MainAppContent: React.FC = () => {
  const {
    parametres,
    isLocked,
    unlockApp,
    addDevis,
    addPaiement,
    commandes,
    devis,
    factures,
    clients,
  } = useApp();

  // Internal Navigation History Stack
  const [navStack, setNavStack] = useState<NavigationScreen[]>([initialScreen]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const navStackRef = useRef(navStack);
  navStackRef.current = navStack;
  const showExitConfirmRef = useRef(showExitConfirm);
  showExitConfirmRef.current = showExitConfirm;

  // Active Screen is always the top of the stack
  const currentScreen = navStack[navStack.length - 1] || initialScreen;
  const currentTab = currentScreen.tab;
  const facturesFilter = currentTab === 'factures' ? currentScreen.filter || null : null;
  const devisFilter = currentTab === 'devis' ? currentScreen.filter || null : null;
  const commandesFilter = currentTab === 'commandes' ? currentScreen.filter || null : null;
  const sourcingFilter = currentTab === 'sourcing' ? currentScreen.filter || null : null;

  // Active items resolved reactively by ID
  const selectedCommandeForDetail = currentScreen.selectedCommandeId
    ? commandes.find((c) => c.id === currentScreen.selectedCommandeId) || null
    : null;
  const selectedDevisForDetail = currentScreen.selectedDevisId
    ? devis.find((d) => d.id === currentScreen.selectedDevisId) || null
    : null;
  const selectedFactureForDetail = currentScreen.selectedFactureId
    ? factures.find((f) => f.id === currentScreen.selectedFactureId) || null
    : null;
  const selectedClientForDetail = currentScreen.selectedClientId
    ? clients.find((c) => c.id === currentScreen.selectedClientId) || null
    : null;

  const isSearchOpen = !!currentScreen.isSearchOpen;
  const isInstallModalOpen = !!currentScreen.isInstallModalOpen;
  const isNewDevisModalOpen = !!currentScreen.isNewDevisModalOpen;
  const preselectedClientForDevis = currentScreen.preselectedClientIdForDevis
    ? clients.find((c) => c.id === currentScreen.preselectedClientIdForDevis) || null
    : null;
  const isNewPaiementModalOpen = !!currentScreen.isNewPaiementModalOpen;
  const preselectedCommandeForPaiement = currentScreen.preselectedCommandeIdForPaiement
    ? commandes.find((c) => c.id === currentScreen.preselectedCommandeIdForPaiement) || null
    : null;

  // Push new state to history
  const pushScreen = useCallback((screen: NavigationScreen) => {
    setNavStack((prev) => {
      const next = [...prev, screen];
      try {
        window.history.pushState({ nantorStep: next.length - 1 }, '', window.location.href);
      } catch {}
      return next;
    });
  }, []);

  // Back navigation function
  const handleBack = useCallback((isFromPopstate = false) => {
    if (showExitConfirmRef.current) {
      setShowExitConfirm(false);
      return;
    }

    const stack = navStackRef.current;
    if (stack.length > 1) {
      setNavStack((prev) => prev.slice(0, prev.length - 1));
      if (!isFromPopstate) {
        try {
          window.history.back();
        } catch {}
      }
    } else {
      // Reached the root of the app (Dashboard with no modals) -> Request exit confirmation
      setShowExitConfirm(true);
    }
  }, []);

  // Synchronize Browser History / Popstate (PWA, Desktop, Mobile Web)
  useEffect(() => {
    if (!window.history.state || typeof window.history.state.nantorStep !== 'number') {
      try {
        window.history.replaceState({ nantorStep: 0 }, '', window.location.href);
      } catch {}
    }

    const handlePopState = () => {
      if (showExitConfirmRef.current) {
        setShowExitConfirm(false);
        try {
          window.history.pushState({ nantorStep: 0 }, '', window.location.href);
        } catch {}
        return;
      }

      if (navStackRef.current.length > 1) {
        handleBack(true);
      } else {
        // At root: re-arm history so user is not evicted without confirmation
        try {
          window.history.pushState({ nantorStep: 0 }, '', window.location.href);
        } catch {}
        setShowExitConfirm(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleBack]);

  // Support Capacitor Native Android Back Button
  useEffect(() => {
    let removeListener: (() => void) | null = null;
    const setupCapacitor = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { App: CapApp } = await import('@capacitor/app');
          const listener = await CapApp.addListener('backButton', () => {
            handleBack(false);
          });
          removeListener = () => {
            listener.remove();
          };
        }
      } catch {}
    };
    setupCapacitor();
    return () => {
      if (removeListener) removeListener();
    };
  }, [handleBack]);

  // Handle Exit Confirmation
  const handleConfirmExit = useCallback(async () => {
    setShowExitConfirm(false);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { App: CapApp } = await import('@capacitor/app');
        await CapApp.exitApp();
        return;
      }
    } catch {}
    try {
      window.close();
    } catch {}
    window.history.go(-(window.history.length || 1));
  }, []);

  // Navigation handlers
  const handleNavigateTab = (tab: TabType) => {
    if (
      currentScreen.tab === tab &&
      !currentScreen.selectedCommandeId &&
      !currentScreen.selectedDevisId &&
      !currentScreen.selectedFactureId &&
      !currentScreen.selectedClientId &&
      !currentScreen.isSearchOpen &&
      !currentScreen.isInstallModalOpen &&
      !currentScreen.isNewDevisModalOpen &&
      !currentScreen.isNewPaiementModalOpen &&
      !currentScreen.filter
    ) {
      return;
    }
    pushScreen({
      tab,
      filter: null,
    });
  };

  const handleDashboardNavigate = (tab: TabType, filter?: string) => {
    pushScreen({
      tab,
      filter: filter || null,
    });
  };

  const handleOpenNewDevis = (client?: Client) => {
    pushScreen({
      ...currentScreen,
      isNewDevisModalOpen: true,
      preselectedClientIdForDevis: client?.id || null,
    });
  };

  const handleOpenNewPaiement = (commande?: Commande) => {
    pushScreen({
      ...currentScreen,
      isNewPaiementModalOpen: true,
      preselectedCommandeIdForPaiement: commande?.id || null,
    });
  };

  const handleConvertedToCommande = (cmd: Commande) => {
    pushScreen({
      tab: 'commandes',
      selectedCommandeId: cmd.id,
    });
  };

  const handleSelectCommande = (cmd: Commande) => {
    pushScreen({
      ...currentScreen,
      selectedCommandeId: cmd.id,
    });
  };

  const handleSelectDevis = (d: Devis) => {
    pushScreen({
      ...currentScreen,
      selectedDevisId: d.id,
    });
  };

  const handleSelectFacture = (fac: Facture) => {
    pushScreen({
      ...currentScreen,
      selectedFactureId: fac.id,
    });
  };

  const handleSelectClient = (c: Client) => {
    pushScreen({
      ...currentScreen,
      selectedClientId: c.id,
    });
  };

  const handleOpenSearch = () => {
    pushScreen({
      ...currentScreen,
      isSearchOpen: true,
    });
  };

  const handleOpenAndroidInstall = () => {
    pushScreen({
      ...currentScreen,
      isInstallModalOpen: true,
    });
  };

  // Synchronize theme with DOM (Supports 'dark_tech', 'premium_light', 'system', 'dark', 'light')
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const theme = parametres.theme || 'dark_tech';

      // Clean all theme classes first
      root.classList.remove('dark', 'theme-dark-tech', 'theme-premium-light');

      let isDark = false;
      if (theme === 'dark_tech' || theme === 'dark') {
        isDark = true;
        root.classList.add('dark', 'theme-dark-tech');
      } else if (theme === 'premium_light' || theme === 'light') {
        isDark = false;
        root.classList.add('theme-premium-light');
      } else if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        isDark = systemPrefersDark;
        if (systemPrefersDark) {
          root.classList.add('dark', 'theme-dark-tech');
        } else {
          root.classList.add('theme-premium-light');
        }
      }

      // Sync Android PWA status bar / theme-color meta tag
      const metaThemeColor = document.querySelector("meta[name='theme-color']");
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#080b12' : '#ffffff');
      }
    };

    applyTheme();

    // Listen to system theme change if theme === 'system'
    if (parametres.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [parametres.theme]);

  // Handle PIN Lock
  if (parametres.pinEnabled && isLocked) {
    return <PinLockModal onUnlock={unlockApp} />;
  }

  return (
    <div className="min-h-screen bg-[#f8f8fa] dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Mobile/Desktop Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={handleNavigateTab}
        onOpenSearch={handleOpenSearch}
        onOpenAndroidInstall={handleOpenAndroidInstall}
        onBack={() => handleBack(false)}
        canGoBack={navStack.length > 1}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3.5 sm:p-5 md:p-6 pb-24 sm:pb-28">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigate={handleDashboardNavigate}
            onNewDevis={() => handleOpenNewDevis()}
            onSelectCommande={handleSelectCommande}
            onSelectDevis={handleSelectDevis}
            onSelectFacture={handleSelectFacture}
          />
        )}

        {currentTab === 'clients' && (
          <ClientsView
            onNewDevis={(client) => handleOpenNewDevis(client)}
            onSelectDevis={handleSelectDevis}
            onSelectCommande={handleSelectCommande}
            onSelectFacture={handleSelectFacture}
            onNavigateToTab={handleNavigateTab}
          />
        )}

        {currentTab === 'devis' && (
          <DevisView
            onConvertedToCommande={handleConvertedToCommande}
            preselectedClient={preselectedClientForDevis}
            initialFilter={devisFilter}
          />
        )}

        {currentTab === 'commandes' && (
          <CommandesView
            onNewPaiement={(cmd) => handleOpenNewPaiement(cmd)}
            onViewFacture={handleSelectFacture}
            initialFilter={commandesFilter}
          />
        )}

        {currentTab === 'paiements' && (
          <PaiementsView
            onSelectCommande={handleSelectCommande}
          />
        )}

        {currentTab === 'factures' && (
          <FacturesView
            onSelectCommande={handleSelectCommande}
            initialFilter={facturesFilter}
          />
        )}

        {currentTab === 'sourcing' && (
          <SourcingView
            onSelectDevis={handleSelectDevis}
            onNavigateToDevis={() => handleNavigateTab('devis')}
            initialFilter={sourcingFilter}
          />
        )}

        {currentTab === 'fournisseurs' && (
          <FournisseursView />
        )}

        {currentTab === 'statistiques' && (
          <StatistiquesView />
        )}

        {currentTab === 'notifications' && (
          <NotificationsView
            onNavigateTab={handleNavigateTab}
            onOpenCommande={(cmdId) => {
              const cmd = commandes.find((c) => c.id === cmdId);
              if (cmd) handleSelectCommande(cmd);
              else handleNavigateTab('commandes');
            }}
            onOpenDevis={(devisId) => {
              const dev = devis.find((d) => d.id === devisId);
              if (dev) handleSelectDevis(dev);
              else handleNavigateTab('devis');
            }}
          />
        )}

        {currentTab === 'historique' && (
          <HistoriqueView />
        )}

        {currentTab === 'sheets' && (
          <GoogleSheetsView onNavigateTab={handleNavigateTab} />
        )}

        {currentTab === 'parametres' && (
          <ParametresView initialTab="apparence" />
        )}

        {currentTab === 'archives' && (
          <ParametresView initialTab="archives" />
        )}
      </main>

      {/* Bottom Floating Navigation (Mobile-first Android UX) */}
      <BottomNav currentTab={currentTab} setCurrentTab={handleNavigateTab} />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => handleBack(false)}
        onSelectClient={handleSelectClient}
        onSelectDevis={handleSelectDevis}
        onSelectCommande={handleSelectCommande}
        onSelectFacture={handleSelectFacture}
      />

      {/* Global Devis Form Modal */}
      <DevisFormModal
        isOpen={isNewDevisModalOpen}
        onClose={() => handleBack(false)}
        initialClient={preselectedClientForDevis}
        onSave={(data) => {
          const created = addDevis(data);
          handleSelectDevis(created);
        }}
      />

      {/* Global Paiement Form Modal */}
      <PaiementFormModal
        isOpen={isNewPaiementModalOpen}
        onClose={() => handleBack(false)}
        preselectedCommande={preselectedCommandeForPaiement}
        onSave={(data) => {
          addPaiement(data);
        }}
      />

      {/* Detail Modals for cross-linking */}
      <DevisDetailModal
        devis={selectedDevisForDetail}
        onClose={() => handleBack(false)}
        onEdit={() => {
          handleNavigateTab('devis');
        }}
        onConverted={handleConvertedToCommande}
        onFactureGenerated={(fac) => {
          pushScreen({
            tab: 'factures',
            selectedFactureId: fac.id,
          });
        }}
      />

      <CommandeDetailModal
        commande={selectedCommandeForDetail}
        onClose={() => handleBack(false)}
        onNewPaiement={(cmd) => handleOpenNewPaiement(cmd)}
        onViewFacture={handleSelectFacture}
      />

      <FactureDetailModal
        facture={selectedFactureForDetail}
        onClose={() => handleBack(false)}
        onSelectCommande={handleSelectCommande}
      />

      <ClientDetailModal
        client={selectedClientForDetail}
        onClose={() => handleBack(false)}
        onEdit={() => {
          handleNavigateTab('clients');
        }}
        onNewDevis={(c) => handleOpenNewDevis(c)}
        onSelectDevis={handleSelectDevis}
        onSelectCommande={handleSelectCommande}
        onSelectFacture={handleSelectFacture}
        onNavigateToTab={handleNavigateTab}
      />

      {/* Android Installation Modal */}
      <AndroidInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => handleBack(false)}
      />

      {/* Exit Confirmation Dialog when reaching root level */}
      <ExitConfirmModal
        isOpen={showExitConfirm}
        onCancel={() => setShowExitConfirm(false)}
        onConfirmExit={handleConfirmExit}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
