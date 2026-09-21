import React, { useState } from 'react';
import {
  Receipt,
  Search,
  ChevronRight,
  Filter,
  FileDown,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { Facture, Client, Commande } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FactureDetailModal } from './FactureDetailModal';
import { CreateFactureModal } from './CreateFactureModal';

interface FacturesViewProps {
  onSelectCommande: (commande: Commande) => void;
}

export const FacturesView: React.FC<FacturesViewProps> = ({ onSelectCommande }) => {
  const { factures, clients, commandes, parametres } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getClient = (clientId?: string) => {
    if (!clientId) return undefined;
    return clients.find((c) => c.id === clientId);
  };

  const getCommande = (commandeId?: string) => {
    if (!commandeId) return undefined;
    return commandes.find((c) => c.id === commandeId);
  };

  const filteredFactures = factures.filter((f) => {
    const q = searchTerm.toLowerCase();
    const client = getClient(f.clientId);
    const clientName = client ? client.nom.toLowerCase() : '';
    const matchesQuery =
      f.numero.toLowerCase().includes(q) ||
      clientName.includes(q) ||
      f.articles.some((a) => a.nomProduit.toLowerCase().includes(q));

    const matchesStatut = selectedStatut === 'all' || f.statut === selectedStatut;
    return matchesQuery && matchesStatut;
  });

  const getStatutBadge = (st: string) => {
    switch (st) {
      case 'Payé':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
      case 'Partiellement payé':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300';
      case 'Non payé':
      default:
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Factures Officielles ({factures.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Factures flexibles : directes, issues de devis ou de commandes
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Facture</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° facture FAC, client, article..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#112238] border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'all', label: 'Toutes' },
            { id: 'Non payé', label: 'Non payé' },
            { id: 'Partiellement payé', label: 'Partiel' },
            { id: 'Payé', label: 'Soldé' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatut(st.id)}
              className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                selectedStatut === st.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#112238] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filteredFactures.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#112238] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Aucune facture trouvée
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Les factures sont générées en un clic depuis les fiches de commandes.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredFactures.map((f) => {
            const client = getClient(f.clientId);
            const commande = getCommande(f.commandeId);
            return (
              <div
                key={f.id}
                onClick={() => setSelectedFacture(f)}
                className="bg-white dark:bg-[#112238] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-400 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {f.numero}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatutBadge(f.statut)}`}>
                      {f.statut}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 transition-colors">
                    {client?.nom || 'Client inconnu'}
                  </h3>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>{formatDate(f.date)}</span>
                    {commande && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                          {commande.numero}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>{f.articles.length} article(s)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                      {formatCurrency(f.total, parametres.devise)}
                    </div>
                    <div className="text-[11px] font-semibold">
                      {f.solde <= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Payé intégralement</span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400">
                          Reste : {formatCurrency(f.solde, parametres.devise)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <FactureDetailModal
        facture={selectedFacture}
        onClose={() => setSelectedFacture(null)}
        onSelectCommande={(cmd) => {
          setSelectedFacture(null);
          onSelectCommande(cmd);
        }}
      />

      {/* Create Facture Modal V4 */}
      <CreateFactureModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onFactureCreated={(newFac) => {
          setSelectedFacture(newFac);
        }}
      />
    </div>
  );
};
