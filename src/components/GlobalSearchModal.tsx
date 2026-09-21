import React, { useState } from 'react';
import { Search, X, Users, FileSpreadsheet, Package, CreditCard, Receipt } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Client, Devis, Commande, Facture } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: (client: Client) => void;
  onSelectDevis: (devis: Devis) => void;
  onSelectCommande: (commande: Commande) => void;
  onSelectFacture: (facture: Facture) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectClient,
  onSelectDevis,
  onSelectCommande,
  onSelectFacture,
}) => {
  const { clients, devis, commandes, factures, parametres } = useApp();
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchingClients = q
    ? clients.filter(
        (c) =>
          c.nom.toLowerCase().includes(q) ||
          c.telephone.includes(q) ||
          (c.ville && c.ville.toLowerCase().includes(q))
      )
    : [];

  const matchingDevis = q
    ? devis.filter(
        (d) =>
          d.numero.toLowerCase().includes(q) ||
          d.articles.some((a) => a.nomProduit.toLowerCase().includes(q))
      )
    : [];

  const matchingCommandes = q
    ? commandes.filter(
        (c) =>
          c.numero.toLowerCase().includes(q) ||
          (c.numeroSuivi && c.numeroSuivi.toLowerCase().includes(q)) ||
          c.articles.some((a) => a.nomProduit.toLowerCase().includes(q))
      )
    : [];

  const matchingFactures = q
    ? factures.filter((f) => f.numero.toLowerCase().includes(q))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-12 sm:pt-20 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Search Input */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Search className="w-5 h-5 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Recherche globale (nom, N° DEV/CMD/FAC, article, téléphone)..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="p-3 overflow-y-auto space-y-3 flex-1 text-xs">
          {!q ? (
            <p className="text-center py-8 text-slate-400">
              Tapez un mot-clé pour lancer la recherche transversale.
            </p>
          ) : matchingClients.length === 0 &&
            matchingDevis.length === 0 &&
            matchingCommandes.length === 0 &&
            matchingFactures.length === 0 ? (
            <p className="text-center py-8 text-slate-400">
              Aucun résultat correspondant à "{query}".
            </p>
          ) : (
            <>
              {matchingClients.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Clients ({matchingClients.length})
                  </span>
                  <div className="space-y-1">
                    {matchingClients.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onSelectClient(c);
                          onClose();
                        }}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {c.nom}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">{c.telephone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchingCommandes.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Commandes ({matchingCommandes.length})
                  </span>
                  <div className="space-y-1">
                    {matchingCommandes.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onSelectCommande(c);
                          onClose();
                        }}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-900/30 cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {c.numero}
                          </span>
                          <span className="text-[10px] text-slate-400">({c.statut})</span>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(c.montantTotal, parametres.devise)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchingDevis.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Devis ({matchingDevis.length})
                  </span>
                  <div className="space-y-1">
                    {matchingDevis.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          onSelectDevis(d);
                          onClose();
                        }}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {d.numero}
                          </span>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(d.total, parametres.devise)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchingFactures.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Factures ({matchingFactures.length})
                  </span>
                  <div className="space-y-1">
                    {matchingFactures.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          onSelectFacture(f);
                          onClose();
                        }}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {f.numero}
                          </span>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(f.total, parametres.devise)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
