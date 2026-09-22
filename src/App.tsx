import React, { useState, useEffect } from 'react';
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
import { TabType, Commande, Devis, Client, Facture } from './types';

const MainAppContent: React.FC = () => {
  const {
    parametres,
    isLocked,
    unlockApp,
    addDevis,
    addPaiement,
    commandes,
    devis,
  } = useApp();

  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  // Filter states for navigation from Dashboard to modules
  const [facturesFilter, setFacturesFilter] = useState<string | null>(null);
  const [devisFilter, setDevisFilter] = useState<string | null>(null);
  const [commandesFilter, setCommandesFilter] = useState<string | null>(null);
  const [sourcingFilter, setSourcingFilter] = useState<string | null>(null);

  const handleDashboardNavigate = (tab: TabType, filter?: string) => {
    if (tab === 'factures') setFacturesFilter(filter || null);
    if (tab === 'devis') setDevisFilter(filter || null);
    if (tab === 'commandes') setCommandesFilter(filter || null);
    if (tab === 'sourcing') setSourcingFilter(filter || null);
    setCurrentTab(tab);
  };

  // Modal active states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isNewDevisModalOpen, setIsNewDevisModalOpen] = useState(false);
  const [preselectedClientForDevis, setPreselectedClientForDevis] = useState<Client | null>(null);

  const [isNewPaiementModalOpen, setIsNewPaiementModalOpen] = useState(false);
  const [preselectedCommandeForPaiement, setPreselectedCommandeForPaiement] = useState<Commande | null>(null);

  const [selectedCommandeForDetail, setSelectedCommandeForDetail] = useState<Commande | null>(null);
  const [selectedDevisForDetail, setSelectedDevisForDetail] = useState<Devis | null>(null);
  const [selectedFactureForDetail, setSelectedFactureForDetail] = useState<Facture | null>(null);
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<Client | null>(null);

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

  // Quick action triggers
  const handleOpenNewDevis = (client?: Client) => {
    setPreselectedClientForDevis(client || null);
    setIsNewDevisModalOpen(true);
  };

  const handleOpenNewPaiement = (commande?: Commande) => {
    setPreselectedCommandeForPaiement(commande || null);
    setIsNewPaiementModalOpen(true);
  };

  const handleConvertedToCommande = (cmd: Commande) => {
    setSelectedCommandeForDetail(cmd);
    setCurrentTab('commandes');
  };

  return (
    <div className="min-h-screen bg-[#f8f8fa] dark:bg-[#09090b] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Mobile/Desktop Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAndroidInstall={() => setIsInstallModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3.5 sm:p-5 md:p-6 pb-24 sm:pb-28">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigate={handleDashboardNavigate}
            onNewDevis={() => handleOpenNewDevis()}
            onSelectCommande={(cmd) => setSelectedCommandeForDetail(cmd)}
            onSelectDevis={(d) => setSelectedDevisForDetail(d)}
            onSelectFacture={(f) => setSelectedFactureForDetail(f)}
          />
        )}

        {currentTab === 'clients' && (
          <ClientsView
            onNewDevis={(client) => handleOpenNewDevis(client)}
            onSelectDevis={(d) => setSelectedDevisForDetail(d)}
            onSelectCommande={(c) => setSelectedCommandeForDetail(c)}
            onSelectFacture={(f) => setSelectedFactureForDetail(f)}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
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
            onViewFacture={(fac) => setSelectedFactureForDetail(fac)}
            initialFilter={commandesFilter}
          />
        )}

        {currentTab === 'paiements' && (
          <PaiementsView
            onSelectCommande={(cmd) => setSelectedCommandeForDetail(cmd)}
          />
        )}

        {currentTab === 'factures' && (
          <FacturesView
            onSelectCommande={(cmd) => setSelectedCommandeForDetail(cmd)}
            initialFilter={facturesFilter}
          />
        )}

        {currentTab === 'sourcing' && (
          <SourcingView
            onSelectDevis={(d) => setSelectedDevisForDetail(d)}
            onNavigateToDevis={() => setCurrentTab('devis')}
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
            onNavigateTab={(t) => setCurrentTab(t)}
            onOpenCommande={(cmdId) => {
              const cmd = commandes.find((c) => c.id === cmdId);
              if (cmd) setSelectedCommandeForDetail(cmd);
              else setCurrentTab('commandes');
            }}
            onOpenDevis={(devisId) => {
              const dev = devis.find((d) => d.id === devisId);
              if (dev) setSelectedDevisForDetail(dev);
              else setCurrentTab('devis');
            }}
          />
        )}

        {currentTab === 'historique' && (
          <HistoriqueView />
        )}

        {currentTab === 'sheets' && (
          <GoogleSheetsView onNavigateTab={(t) => setCurrentTab(t)} />
        )}

        {currentTab === 'parametres' && (
          <ParametresView initialTab="apparence" />
        )}

        {currentTab === 'archives' && (
          <ParametresView initialTab="archives" />
        )}
      </main>

      {/* Bottom Floating Navigation (Mobile-first Android UX) */}
      <BottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectClient={(c) => setSelectedClientForDetail(c)}
        onSelectDevis={(d) => setSelectedDevisForDetail(d)}
        onSelectCommande={(cmd) => setSelectedCommandeForDetail(cmd)}
        onSelectFacture={(f) => setSelectedFactureForDetail(f)}
      />

      {/* Global Devis Form Modal */}
      <DevisFormModal
        isOpen={isNewDevisModalOpen}
        onClose={() => {
          setIsNewDevisModalOpen(false);
          setPreselectedClientForDevis(null);
        }}
        initialClient={preselectedClientForDevis}
        onSave={(data) => {
          const created = addDevis(data);
          setSelectedDevisForDetail(created);
        }}
      />

      {/* Global Paiement Form Modal */}
      <PaiementFormModal
        isOpen={isNewPaiementModalOpen}
        onClose={() => {
          setIsNewPaiementModalOpen(false);
          setPreselectedCommandeForPaiement(null);
        }}
        preselectedCommande={preselectedCommandeForPaiement}
        onSave={(data) => {
          addPaiement(data);
        }}
      />

      {/* Detail Modals for cross-linking */}
      <DevisDetailModal
        devis={selectedDevisForDetail}
        onClose={() => setSelectedDevisForDetail(null)}
        onEdit={() => {
          // Open edit in DevisView
          setCurrentTab('devis');
        }}
        onConverted={handleConvertedToCommande}
        onFactureGenerated={(fac) => {
          setSelectedFactureForDetail(fac);
          setCurrentTab('factures');
        }}
      />

      <CommandeDetailModal
        commande={selectedCommandeForDetail}
        onClose={() => setSelectedCommandeForDetail(null)}
        onNewPaiement={(cmd) => handleOpenNewPaiement(cmd)}
        onViewFacture={(fac) => setSelectedFactureForDetail(fac)}
      />

      <FactureDetailModal
        facture={selectedFactureForDetail}
        onClose={() => setSelectedFactureForDetail(null)}
        onSelectCommande={(cmd) => setSelectedCommandeForDetail(cmd)}
      />

      <ClientDetailModal
        client={selectedClientForDetail}
        onClose={() => setSelectedClientForDetail(null)}
        onEdit={() => {
          setCurrentTab('clients');
        }}
        onNewDevis={(c) => handleOpenNewDevis(c)}
        onSelectDevis={(d) => setSelectedDevisForDetail(d)}
        onSelectCommande={(cmd) => setSelectedCommandeForDetail(cmd)}
        onSelectFacture={(f) => setSelectedFactureForDetail(f)}
        onNavigateToTab={(tab) => setCurrentTab(tab)}
      />

      {/* Android Installation Modal */}
      <AndroidInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
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
