import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Users,
  FileSpreadsheet,
  Package,
  CreditCard,
  Receipt,
  Building2,
  Compass,
  Settings,
  Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HistoriqueItem } from '../types';
import { formatDate } from '../utils/formatters';

export const HistoriqueView: React.FC = () => {
  const { historique } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUTES');

  const filteredHistory = useMemo(() => {
    return historique.filter((item) => {
      const matchSearch =
        item.action.toLowerCase().includes(search.toLowerCase()) ||
        item.objetConcerne.toLowerCase().includes(search.toLowerCase()) ||
        (item.details && item.details.toLowerCase().includes(search.toLowerCase()));
      const matchCat = selectedCategory === 'TOUTES' || item.categorie === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [historique, search, selectedCategory]);

  const getCategoryIcon = (cat: HistoriqueItem['categorie']) => {
    switch (cat) {
      case 'Client':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'Devis':
        return <FileSpreadsheet className="w-4 h-4 text-amber-500" />;
      case 'Commande':
        return <Package className="w-4 h-4 text-indigo-500" />;
      case 'Paiement':
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'Facture':
        return <Receipt className="w-4 h-4 text-purple-500" />;
      case 'Fournisseur':
        return <Building2 className="w-4 h-4 text-orange-500" />;
      case 'Sourcing':
        return <Compass className="w-4 h-4 text-cyan-500" />;
      case 'Système':
      default:
        return <Settings className="w-4 h-4 text-slate-500" />;
    }
  };

  const categories = ['TOUTES', 'Client', 'Devis', 'Commande', 'Paiement', 'Facture', 'Fournisseur', 'Sourcing', 'Système'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-[#0B192C] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Journal des Activités</h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              {filteredHistory.length} événements
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Traçabilité intégrale de toutes les opérations effectuées dans Nantor Sourcing App.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher dans le journal d'audit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-[#0B192C] rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#0B192C] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events Timeline List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#0B192C] rounded-2xl border border-slate-200 dark:border-slate-800">
          <History className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-300 font-bold text-sm">Aucun événement répertorié</p>
          <p className="text-xs text-slate-400 mt-1">Les actions courantes apparaîtront ici automatiquement.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0B192C] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {filteredHistory.map((item) => (
            <div key={item.id} className="p-3.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                  {getCategoryIcon(item.categorie)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{item.action}</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.categorie}
                    </span>
                  </div>
                  <p className="text-blue-600 dark:text-blue-400 font-medium mt-0.5">{item.objetConcerne}</p>
                  {item.details && <p className="text-slate-500 dark:text-slate-400 mt-0.5">{item.details}</p>}
                </div>
              </div>

              <div className="text-right shrink-0 text-slate-400 text-[11px]">
                <div className="flex items-center gap-1 justify-end font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{item.heure}</span>
                </div>
                <span>{formatDate(item.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
