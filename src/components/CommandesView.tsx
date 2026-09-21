import React, { useState } from 'react';
import {
  Package,
  Search,
  ChevronRight,
  Filter,
  CreditCard,
  Receipt,
  Clock,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';
import { Commande, Client, CommandeStatut, Facture } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CommandeDetailModal } from './CommandeDetailModal';

interface CommandesViewProps {
  onNewPaiement: (commande: Commande) => void;
  onViewFacture: (facture: Facture) => void;
}

export const CommandesView: React.FC<CommandesViewProps> = ({
  onNewPaiement,
  onViewFacture,
}) => {
  const { commandes, clients, parametres } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);

  // Active commandes (not archived)
  const activeCommandes = commandes.filter((c) => !c.isArchived);

  const statutsFilterList = [
    { id: 'all', label: 'Toutes' },
    { id: 'En attente de paiement', label: 'En attente' },
    { id: 'Partiellement payé', label: 'Partiel' },
    { id: 'Payé', label: 'Payé' },
    { id: 'Expédié de Chine', label: 'Expédié Chine' },
    { id: 'Arrivé au Togo', label: 'Au Togo' },
    { id: 'Livré', label: 'Livré' },
  ];

  const getClient = (clientId: string) => {
    return clients.find((c) => c.id === clientId);
  };

  const filteredCommandes = activeCommandes.filter((c) => {
    const q = searchTerm.toLowerCase();
    const client = getClient(c.clientId);
    const clientName = client ? client.nom.toLowerCase() : '';
    const matchesQuery =
      c.numero.toLowerCase().includes(q) ||
      clientName.includes(q) ||
      (c.numeroSuivi && c.numeroSuivi.toLowerCase().includes(q)) ||
      c.articles.some((a) => a.nomProduit.toLowerCase().includes(q));

    const matchesStatut = selectedStatut === 'all' || c.statut === selectedStatut;
    return matchesQuery && matchesStatut;
  });

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'Payé':
      case 'Livré':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300';
      case 'Partiellement payé':
      case 'Expédié de Chine':
      case 'En transit':
      case 'Arrivé au Togo':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300';
      case 'Commande Alibaba':
      case 'Produit acheté':
      case 'En préparation':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300';
      case 'Annulé':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300';
      case 'En attente de paiement':
      default:
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300';
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Gestion des Commandes ({activeCommandes.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Suivez les étapes d'achat Alibaba, expédition maritime/aérienne et solde financier
          </p>
        </div>

        {parametres.googleSheetsSpreadsheetUrl && (
          <a
            href={parametres.googleSheetsSpreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
            title="Ouvrir la feuille Commandes dans Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Google Sheets</span>
            <ExternalLink className="w-3 h-3 text-emerald-500" />
          </a>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° commande, client, article, N° de suivi..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#112238] border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {statutsFilterList.map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatut(st.id)}
              className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                selectedStatut === st.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#112238] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Commandes List */}
      {filteredCommandes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#112238] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {searchTerm || selectedStatut !== 'all'
              ? 'Aucune commande ne correspond aux critères'
              : 'Aucune commande enregistrée'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Les commandes sont générées en 1 clic par conversion d'un devis accepté.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCommandes.map((cmd) => {
            const client = getClient(cmd.clientId);
            return (
              <div
                key={cmd.id}
                onClick={() => setSelectedCommande(cmd)}
                className="bg-white dark:bg-[#112238] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                      {cmd.numero}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatutBadge(cmd.statut)}`}>
                      {cmd.statut}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors">
                    {client?.nom || 'Client inconnu'}
                  </h3>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>{formatDate(cmd.date)}</span>
                    <span>•</span>
                    <span>{cmd.articles.length} article(s)</span>
                    {cmd.numeroSuivi && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {cmd.numeroSuivi}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                      {formatCurrency(cmd.montantTotal, parametres.devise)}
                    </div>
                    <div className="text-[11px] font-semibold">
                      {cmd.solde <= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Soldé (0 FCFA)</span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400">
                          Reste : {formatCurrency(cmd.solde, parametres.devise)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Commande Detail Modal */}
      <CommandeDetailModal
        commande={selectedCommande}
        onClose={() => setSelectedCommande(null)}
        onNewPaiement={(cmd) => {
          setSelectedCommande(null);
          onNewPaiement(cmd);
        }}
        onViewFacture={(fac) => {
          setSelectedCommande(null);
          onViewFacture(fac);
        }}
      />
    </div>
  );
};
