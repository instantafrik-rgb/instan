import React from 'react';
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

  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Accueil',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'clients' as TabType,
      label: 'Clients',
      icon: Users,
      badge: clients.length,
    },
    {
      id: 'devis' as TabType,
      label: 'Devis',
      icon: FileSpreadsheet,
      badge: devis.filter((d) => !d.isArchived).length,
    },
    {
      id: 'commandes' as TabType,
      label: 'Commandes',
      icon: Package,
      badge: commandes.filter((c) => !c.isArchived).length,
    },
    {
      id: 'paiements' as TabType,
      label: 'Paiements',
      icon: CreditCard,
      badge: paiements.length,
    },
    {
      id: 'factures' as TabType,
      label: 'Factures',
      icon: Receipt,
      badge: factures.filter((f) => !f.isArchived).length,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-t border-neutral-200/90 dark:border-neutral-800/90 shadow-lg safe-area-bottom transition-colors">
      <div className="max-w-md mx-auto grid grid-cols-6 h-16 px-1">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center relative transition-all duration-150 ${
                isActive
                  ? 'text-neutral-950 dark:text-white font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              {/* Minimalist modern pill */}
              <div
                className={`relative px-3 py-1 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.75]'}`} />
                {item.badge !== null && item.badge > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-bold rounded-full ${
                      isActive
                        ? 'bg-white text-black dark:bg-black dark:text-white border border-neutral-300 dark:border-neutral-700'
                        : 'bg-neutral-900 text-white dark:bg-neutral-200 dark:text-black'
                    }`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[54px] font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
