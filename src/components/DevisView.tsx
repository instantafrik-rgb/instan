import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  ChevronRight,
  Filter,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Devis, Client, DevisStatut, Commande } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { DevisFormModal } from './DevisFormModal';
import { DevisDetailModal } from './DevisDetailModal';

interface DevisViewProps {
  onConvertedToCommande: (commande: Commande) => void;
  preselectedClient?: Client | null;
  initialFilter?: string | null;
}

export const DevisView: React.FC<DevisViewProps> = ({
  onConvertedToCommande,
  preselectedClient,
  initialFilter,
}) => {
  const { devis, clients, addDevis, updateDevis, parametres } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>(initialFilter || 'all');
  const [selectedDevis, setSelectedDevis] = useState<Devis | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDevis, setEditingDevis] = useState<Devis | null>(null);

  React.useEffect(() => {
    if (initialFilter) {
      setSelectedStatut(initialFilter);
    }
  }, [initialFilter]);

  // Active devis (not archived)
  const activeDevis = devis.filter((d) => !d.isArchived);

  const statutsList: { id: string; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'Brouillon', label: 'Brouillon' },
    { id: 'Envoyé', label: 'Envoyé' },
    { id: 'Accepté', label: 'Accepté' },
    { id: 'Converti en commande', label: 'Converti' },
    { id: 'Refusé', label: 'Refusé' },
  ];

  const getClient = (clientId: string) => {
    return clients.find((c) => c.id === clientId);
  };

  const filteredDevis = activeDevis.filter((d) => {
    const q = searchTerm.toLowerCase();
    const client = getClient(d.clientId);
    const clientName = client ? client.nom.toLowerCase() : '';
    const matchesQuery =
      d.numero.toLowerCase().includes(q) ||
      clientName.includes(q) ||
      d.articles.some((a) => a.nomProduit.toLowerCase().includes(q));

    const matchesStatut = selectedStatut === 'all' || d.statut === selectedStatut;
    return matchesQuery && matchesStatut;
  });

  const handleOpenAdd = () => {
    setEditingDevis(null);
    setIsFormOpen(true);
  };

  const handleEdit = (d: Devis) => {
    setEditingDevis(d);
    setIsFormOpen(true);
  };

  const handleSave = (data: Omit<Devis, 'id' | 'numero'>) => {
    if (editingDevis) {
      updateDevis({
        ...editingDevis,
        ...data,
      });
      if (selectedDevis && selectedDevis.id === editingDevis.id) {
        setSelectedDevis({
          ...editingDevis,
          ...data,
        });
      }
    } else {
      const created = addDevis(data);
      setSelectedDevis(created);
    }
  };

  const getStatutBadge = (st: string) => {
    switch (st) {
      case 'Converti en commande':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300';
      case 'Accepté':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300';
      case 'Envoyé':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300';
      case 'Refusé':
      case 'Expiré':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300';
      case 'Brouillon':
      default:
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300';
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Devis Sourcing ({activeDevis.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Établissez des cotations précises incluant transport Chine et frais
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {parametres.googleSheetsSpreadsheetUrl && (
            <a
              href={parametres.googleSheetsSpreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors"
              title="Ouvrir la feuille Devis dans Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Google Sheets</span>
              <ExternalLink className="w-3 h-3 text-emerald-500" />
            </a>
          )}
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Nouveau devis
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher numéro DEV, nom du client, article..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#112238] border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {statutsList.map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatut(st.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedStatut === st.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#112238] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Devis List */}
      {filteredDevis.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#112238] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {searchTerm || selectedStatut !== 'all'
              ? 'Aucun devis ne correspond aux critères'
              : 'Aucun devis créé'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Établissez des cotations précises avec calcul automatique de fret et marges.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Créer un nouveau devis
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredDevis.map((d) => {
            const client = getClient(d.clientId);
            return (
              <div
                key={d.id}
                onClick={() => setSelectedDevis(d)}
                className="bg-white dark:bg-[#112238] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 cursor-pointer transition-all flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {d.numero}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatutBadge(d.statut)}`}>
                      {d.statut}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {client?.nom || 'Client Inconnu'}
                  </h3>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                    <span>{formatDate(d.date)}</span>
                    <span>•</span>
                    <span>{d.articles.length} article(s)</span>
                    <span>•</span>
                    <span className="truncate max-w-[160px]">{d.articles[0]?.nomProduit}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right shrink-0">
                  <div>
                    <div className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white">
                      {formatCurrency(d.total, parametres.devise)}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Livraison: {formatCurrency(d.fraisLivraisonChine, parametres.devise)}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Devis Form Modal */}
      <DevisFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={editingDevis}
        initialClient={preselectedClient}
      />

      {/* Devis Detail Modal */}
      <DevisDetailModal
        devis={selectedDevis}
        onClose={() => setSelectedDevis(null)}
        onEdit={(d) => {
          setSelectedDevis(null);
          handleEdit(d);
        }}
        onConverted={(cmd) => {
          onConvertedToCommande(cmd);
        }}
      />
    </div>
  );
};
