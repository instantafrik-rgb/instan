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
  initialFilter?: string | null;
}

export const FacturesView: React.FC<FacturesViewProps> = ({ onSelectCommande, initialFilter }) => {
  const { factures, clients, commandes, parametres } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>(initialFilter || 'all');
  const [selectedFactureId, setSelectedFactureId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  React.useEffect(() => {
    if (initialFilter) {
      setSelectedStatut(initialFilter);
    }
  }, [initialFilter]);

  const selectedFacture = selectedFactureId
    ? factures.find((f) => f.id === selectedFactureId) || null
    : null;

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

    let matchesStatut = true;
    if (selectedStatut === 'Payée') {
      matchesStatut = f.statut === 'Payée' || (f.statut as any) === 'Payé' || f.solde <= 0;
    } else if (selectedStatut === 'Partiellement payée') {
      matchesStatut = f.statut === 'Partiellement payée' || (f.statut as any) === 'Partiellement payé';
    } else if (selectedStatut === 'Envoyée') {
      matchesStatut = f.statut === 'Envoyée' || (f.statut as any) === 'Non payé';
    } else if (selectedStatut === 'En retard') {
      matchesStatut = f.statut === 'En retard';
    } else if (selectedStatut !== 'all') {
      matchesStatut = f.statut === selectedStatut;
    }

    return matchesQuery && matchesStatut;
  });

  const getStatutBadge = (st: string, solde: number) => {
    if (st === 'Payée' || st === 'Payé' || solde <= 0) {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
    }
    if (st === 'Partiellement payée' || st === 'Partiellement payé') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
    }
    if (st === 'En retard') {
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
    }
    if (st === 'Annulée') {
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300';
    }
    return 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300';
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
            Factures clients : suivi des règlements, acomptes et soldes en temps réel
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
            { id: 'Envoyée', label: 'En attente' },
            { id: 'Partiellement payée', label: 'Partiellement payées' },
            { id: 'Payée', label: 'Payées' },
            { id: 'En retard', label: 'En retard' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatut(st.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedStatut === st.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#112238] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filteredFactures.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#112238] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Receipt className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Aucune facture trouvée
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Les factures sont générées en un clic depuis les fiches de commandes ou créées directement.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredFactures.map((f) => {
            const client = getClient(f.clientId);
            const commande = getCommande(f.commandeId);
            const isPayee = f.statut === 'Payée' || (f.statut as any) === 'Payé' || f.solde <= 0;
            return (
              <div
                key={f.id}
                onClick={() => setSelectedFactureId(f.id)}
                className="bg-white dark:bg-[#112238] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-400 cursor-pointer transition-all flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {f.numero}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatutBadge(f.statut, f.solde)}`}>
                      {f.statut}
                    </span>
                    {f.payeeManuellement && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Acquittée manuel
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                    {client?.nom || 'Client inconnu'}
                  </h3>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
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

                <div className="flex items-center gap-3 text-right shrink-0">
                  <div>
                    <div className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white">
                      {formatCurrency(f.total, parametres.devise)}
                    </div>
                    <div className="text-[11px] font-semibold">
                      {isPayee ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Payée
                        </span>
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
        onClose={() => setSelectedFactureId(null)}
        onSelectCommande={(cmd) => {
          setSelectedFactureId(null);
          onSelectCommande(cmd);
        }}
      />

      {/* Create Facture Modal V4 */}
      <CreateFactureModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onFactureCreated={(newFac) => {
          setSelectedFactureId(newFac.id);
        }}
      />
    </div>
  );
};
