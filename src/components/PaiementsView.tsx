import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Wallet,
} from 'lucide-react';
import { Paiement, Client, Commande, ModePaiement } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PaiementFormModal } from './PaiementFormModal';

interface PaiementsViewProps {
  onSelectCommande: (commande: Commande) => void;
}

export const PaiementsView: React.FC<PaiementsViewProps> = ({ onSelectCommande }) => {
  const { paiements, clients, commandes, addPaiement, parametres } = useApp();
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

  const filteredPaiements = paiements.filter((p) => {
    const q = searchTerm.toLowerCase();
    const client = getClient(p.clientId);
    const clientName = client ? client.nom.toLowerCase() : '';
    const matchesQuery =
      p.numero.toLowerCase().includes(q) ||
      clientName.includes(q) ||
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
            placeholder="Rechercher par N° reçu, client, référence TMoney/Flooz..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#112238] border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {modesList.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMode(m.id)}
              className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                selectedMode === m.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#112238] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filteredPaiements.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#112238] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <CreditCard className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Aucun versement trouvé
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enregistrez les acomptes et règlements de vos clients pour ajuster automatiquement les soldes.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPaiements.map((p) => {
            const client = getClient(p.clientId);
            const commande = getCommande(p.commandeId);
            return (
              <div
                key={p.id}
                onClick={() => commande && onSelectCommande(commande)}
                className="bg-white dark:bg-[#112238] rounded-xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-400 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {p.numero}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {p.modePaiement}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-emerald-600 transition-colors">
                    {client?.nom || 'Client inconnu'}
                  </h3>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>{formatDate(p.date)}</span>
                    {commande && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                          {commande.numero}
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

                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(p.montant, parametres.devise)}
                  </div>
                  {p.note && (
                    <span className="text-[10px] text-slate-400 italic block truncate max-w-[120px]">
                      {p.note}
                    </span>
                  )}
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
