import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Wallet,
  FileText,
  Trash2,
} from 'lucide-react';
import { Paiement, Client, Commande, Facture, ModePaiement } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PaiementFormModal } from './PaiementFormModal';

interface PaiementsViewProps {
  onSelectCommande: (commande: Commande) => void;
}

export const PaiementsView: React.FC<PaiementsViewProps> = ({ onSelectCommande }) => {
  const { paiements, clients, commandes, factures, addPaiement, deletePaiement, parametres } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const getClient = (clientId?: string) => {
    if (!clientId) return undefined;
    return clients.find((c) => c.id === clientId);
  };

  const getCommande = (commandeId?: string) => {
    if (!commandeId) return undefined;
    return commandes.find((c) => c.id === commandeId);
  };

  const getFacture = (factureId?: string) => {
    if (!factureId) return undefined;
    return factures.find((f) => f.id === factureId);
  };

  const filteredPaiements = paiements.filter((p) => {
    const q = searchTerm.toLowerCase();
    const client = getClient(p.clientId);
    const commande = getCommande(p.commandeId);
    const facture = getFacture(p.factureId);
    const clientName = client ? client.nom.toLowerCase() : '';
    const matchesQuery =
      p.numero.toLowerCase().includes(q) ||
      clientName.includes(q) ||
      (commande && commande.numero.toLowerCase().includes(q)) ||
      (facture && facture.numero.toLowerCase().includes(q)) ||
      (p.reference && p.reference.toLowerCase().includes(q)) ||
      (p.note && p.note.toLowerCase().includes(q));

    const matchesMode = selectedMode === 'all' || p.modePaiement === selectedMode;
    return matchesQuery && matchesMode;
  });

  const totalEncaisse = paiements.reduce((acc, p) => acc + (p.montant || 0), 0);

  const handleSave = (data: Omit<Paiement, 'id' | 'numero'>) => {
    addPaiement(data);
  };

  const modesList: { id: string; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'TMoney', label: 'TMoney' },
    { id: 'Flooz', label: 'Flooz' },
    { id: 'Espèces', label: 'Espèces' },
    { id: 'Virement bancaire', label: 'Virement' },
    { id: 'Chèque', label: 'Chèque' },
  ];

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Paiements Reçus ({paiements.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total encaissé : <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(totalEncaisse, parametres.devise)}</span>
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          + Nouveau paiement
        </button>
      </div>

      {/* Search & Mode Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° reçu, facture, commande, client, référence..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#112238] border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {modesList.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMode(m.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                selectedMode === m.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#112238] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filteredPaiements.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#112238] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Aucun versement trouvé
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Enregistrez les acomptes et règlements de vos clients pour ajuster automatiquement les soldes des commandes et factures.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPaiements.map((p) => {
            const client = getClient(p.clientId);
            const commande = getCommande(p.commandeId);
            const facture = getFacture(p.factureId);
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-[#112238] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-400 transition-all flex items-center justify-between gap-3 group"
              >
                <div
                  className="space-y-1 min-w-0 flex-1 cursor-pointer"
                  onClick={() => commande && onSelectCommande(commande)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {p.numero}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {p.modePaiement}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                    {client?.nom || 'Client inconnu'}
                  </h3>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                    <span>{formatDate(p.date)}</span>
                    {commande && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                          Cmd: {commande.numero}
                        </span>
                      </>
                    )}
                    {facture && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Fact: {facture.numero}
                        </span>
                      </>
                    )}
                    {p.reference && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[140px]">Réf: {p.reference}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(p.montant, parametres.devise)}
                    </div>
                    {p.note && (
                      <span className="text-[11px] text-slate-400 italic block truncate max-w-[140px]">
                        {p.note}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Supprimer le versement ${p.numero} de ${formatCurrency(p.montant, parametres.devise)} ? Les soldes associés seront recalculés.`)) {
                        deletePaiement(p.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-60 group-hover:opacity-100"
                    title="Supprimer ce paiement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paiement Form Modal */}
      <PaiementFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};
