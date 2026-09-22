import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Package,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { TabType } from '../types';
import { useApp } from '../context/AppContext';

interface BottomNavProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  setCurrentTab,
}) => {
  const { clients, devis, commandes, paiements, factures } = useApp();

  // Nombre total de chaque entité (compteurs informatifs sans alarme)
  const totalClients = clients.length;
  const totalDevis = useMemo(() => devis.filter((d) => !d.isArchived).length, [devis]);
  const totalCommandes = useMemo(() => commandes.filter((c) => !c.isArchived).length, [commandes]);
  const totalPaiements = paiements.length;
  const totalFactures = useMemo(() => factures.filter((f) => !f.isArchived).length, [factures]);

  // Nombre d'éléments nécessitant une action (alertes réelles)
  // Devis en attente de validation/retour client
  const devisActionCount = useMemo(
    () => devis.filter((d) => !d.isArchived && d.statut === 'Envoyé').length,
    [devis]
  );

  // Commandes actives avec solde à recouvrer
  const commandesActionCount = useMemo(
    () =>
      commandes.filter(
        (c) =>
          !c.isArchived &&
          c.statut !== 'Livré' &&
          c.statut !== 'Annulé' &&
          (c.solde > 0 || c.statut === 'En attente de paiement' || c.statut === 'Partiellement payé')
      ).length,
    [commandes]
  );

  // Factures non réglées / impayées nécessitant encaissement
  const facturesActionCount = useMemo(
    () =>
      factures.filter((f) => {
        if (f.isArchived || f.statut === 'Annulée' || f.statut === 'Payée' || f.statut === 'PAYÉ') {
          return false;
        }
        const solde = f.solde ?? Math.max(0, f.total - (f.montantPaye || 0));
        return (
          solde > 0 ||
          f.statut === 'Partiellement payée' ||
          f.statut === 'PARTIELLEMENT PAYÉ' ||
          f.statut === 'Émise' ||
          f.statut === 'Envoyée'
        );
      }).length,
    [factures]
  );

  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Accueil',
      icon: LayoutDashboard,
      totalCount: null,
      actionCount: 0,
      title: 'Tableau de bord principal',
    },
    {
      id: 'clients' as TabType,
      label: 'Clients',
      icon: Users,
      totalCount: totalClients,
      actionCount: 0, // Les clients sont un répertoire, pas une alerte
      title: `Clients : ${totalClients} enregistré(s)`,
    },
    {
      id: 'devis' as TabType,
      label: 'Devis',
      icon: FileSpreadsheet,
      totalCount: totalDevis,
      actionCount: devisActionCount,
      title: `Devis : ${totalDevis} au total${devisActionCount > 0 ? ` • ${devisActionCount} en attente client` : ''}`,
    },
    {
      id: 'commandes' as TabType,
      label: 'Commandes',
      icon: Package,
      totalCount: totalCommandes,
      actionCount: commandesActionCount,
      title: `Commandes : ${totalCommandes} au total${commandesActionCount > 0 ? ` • ${commandesActionCount} avec solde à percevoir` : ''}`,
    },
    {
      id: 'paiements' as TabType,
      label: 'Paiements',
      icon: CreditCard,
      totalCount: totalPaiements,
      actionCount: 0, // Les règlements enregistrés ne sont pas des alertes
      title: `Paiements : ${totalPaiements} versement(s) enregistré(s)`,
    },
    {
      id: 'factures' as TabType,
      label: 'Factures',
      icon: Receipt,
      totalCount: totalFactures,
      actionCount: facturesActionCount,
      title: `Factures : ${totalFactures} au total${facturesActionCount > 0 ? ` • ${facturesActionCount} impayée(s) à recouvrer` : ' • toutes réglées'}`,
    },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Navigation principale mobile"
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-t border-neutral-200/90 dark:border-neutral-800/90 shadow-lg pb-[max(env(safe-area-inset-bottom),0px)] transition-colors"
    >
      <div className="max-w-lg mx-auto grid grid-cols-6 h-16 px-1">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              onClick={() => setCurrentTab(item.id)}
              title={item.title}
              className={`flex flex-col items-center justify-center relative w-full h-full min-h-[50px] py-1 cursor-pointer select-none active:scale-95 transition-all duration-150 ${
                isActive
                  ? 'text-neutral-950 dark:text-white font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              {/* Conteneur d'icône avec zone tactile adaptée */}
              <div
                className={`relative px-2.5 py-1 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />

                {/* Badge d'action requise : uniquement si des éléments nécessitent une intervention (ex: factures impayées) */}
                {item.actionCount > 0 && (
                  <span
                    id={`badge-action-${item.id}`}
                    className="absolute -top-1 -right-1 px-1 min-w-[16px] h-[16px] flex items-center justify-center text-[9.5px] font-bold rounded-full bg-amber-500 text-white shadow-xs animate-none"
                    title={`${item.actionCount} action(s) requise(s)`}
                  >
                    {item.actionCount > 9 ? '9+' : item.actionCount}
                  </span>
                )}
              </div>

              {/* Libellé avec compteur total discret (non alarmiste) */}
              <div className="flex items-center justify-center gap-1 mt-0.5 max-w-full px-0.5">
                <span className="text-[11px] tracking-tight truncate font-medium">
                  {item.label}
                </span>

                {/* Compteur total neutre : informationnel, jamais confondu avec une alerte */}
                {item.totalCount !== null && item.totalCount > 0 && (
                  <span
                    id={`badge-total-${item.id}`}
                    className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded-full font-medium leading-none ${
                      isActive
                        ? 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80'
                    }`}
                  >
                    {item.totalCount > 99 ? '99+' : item.totalCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
