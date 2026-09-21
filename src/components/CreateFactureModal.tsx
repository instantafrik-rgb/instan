import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Receipt,
  FileText,
  ShoppingBag,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Facture, ArticleLigne } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CreateFactureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFactureCreated: (facture: Facture) => void;
}

export const CreateFactureModal: React.FC<CreateFactureModalProps> = ({
  isOpen,
  onClose,
  onFactureCreated,
}) => {
  const { clients, devis, commandes, parametres, addFactureDirecte, generateFactureFromDevis, generateFactureFromCommande, showToast } = useApp();

  // Mode: 'direct' | 'from_devis' | 'from_commande'
  const [mode, setMode] = useState<'direct' | 'from_devis' | 'from_commande'>('direct');

  // For from_devis & from_commande modes
  const [selectedDevisId, setSelectedDevisId] = useState('');
  const [selectedCommandeId, setSelectedCommandeId] = useState('');

  // For direct mode
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fraisLivraison, setFraisLivraison] = useState<number>(0);
  const [fraisAutres, setFraisAutres] = useState<number>(0);
  const [montantPayeInitial, setMontantPayeInitial] = useState<number>(0);
  const [conditions, setConditions] = useState(parametres.mentionsLegalesDefaut || '');
  const [notes, setNotes] = useState('');

  const [articles, setArticles] = useState<ArticleLigne[]>([
    {
      id: `art-${Date.now()}`,
      nomProduit: '',
      description: '',
      prixUnitaire: 0,
      quantite: 1,
      total: 0,
    },
  ]);

  if (!isOpen) return null;

  // Article handlers for direct mode
  const handleAddArticle = () => {
    setArticles((prev) => [
      ...prev,
      {
        id: `art-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nomProduit: '',
        description: '',
        prixUnitaire: 0,
        quantite: 1,
        total: 0,
      },
    ]);
  };

  const handleRemoveArticle = (index: number) => {
    if (articles.length === 1) return;
    setArticles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleArticleChange = (index: number, field: keyof ArticleLigne, value: any) => {
    setArticles((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: value };
      if (field === 'prixUnitaire' || field === 'quantite') {
        const pu = field === 'prixUnitaire' ? Number(value) || 0 : target.prixUnitaire;
        const qte = field === 'quantite' ? Number(value) || 0 : target.quantite;
        target.total = pu * qte;
      }
      next[index] = target;
      return next;
    });
  };

  const sousTotal = articles.reduce((sum, a) => sum + (a.total || 0), 0);
  const totalFrais = Number(fraisLivraison || 0) + Number(fraisAutres || 0);
  const totalGeneral = sousTotal + totalFrais;
  const solde = Math.max(0, totalGeneral - Number(montantPayeInitial || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'from_devis') {
      if (!selectedDevisId) {
        showToast('Veuillez sélectionner un devis', 'error');
        return;
      }
      const created = generateFactureFromDevis(selectedDevisId);
      if (created) {
        onFactureCreated(created);
        onClose();
      }
      return;
    }

    if (mode === 'from_commande') {
      if (!selectedCommandeId) {
        showToast('Veuillez sélectionner une commande', 'error');
        return;
      }
      const created = generateFactureFromCommande(selectedCommandeId);
      if (created) {
        onFactureCreated(created);
        onClose();
      }
      return;
    }

    // Direct mode validation
    if (!clientId) {
      showToast('Veuillez sélectionner un client destinataire', 'error');
      return;
    }

    const validArticles = articles.filter((a) => a.nomProduit.trim() !== '');
    if (validArticles.length === 0) {
      showToast('Veuillez saisir au moins un article avec une désignation', 'error');
      return;
    }

    const newFactureData: Omit<Facture, 'id' | 'numero'> = {
      date: new Date(date).toISOString(),
      clientId,
      source: 'Facture directe',
      articles: validArticles,
      sousTotal,
      fraisLivraison: Number(fraisLivraison || 0),
      fraisAutres: Number(fraisAutres || 0),
      frais: totalFrais,
      total: totalGeneral,
      montantPaye: Number(montantPayeInitial || 0),
      solde,
      statut: solde === 0 ? 'PAYÉ' : Number(montantPayeInitial || 0) > 0 ? 'PARTIELLEMENT PAYÉ' : 'Émise',
      conditions,
      notes,
    };

    const created = addFactureDirecte(newFactureData);
    onFactureCreated(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Nouvelle Facture
              </h3>
              <p className="text-xs text-slate-500">
                Choix flexible : Facture directe, depuis Devis ou depuis Commande
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Section 26 & V4 Rules) */}
        <div className="p-3 bg-slate-100 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMode('direct')}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                mode === 'direct'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>1. Facture Directe</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('from_devis')}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                mode === 'from_devis'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>2. Depuis un Devis</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('from_commande')}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                mode === 'from_commande'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>3. Depuis Commande</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Mode 2: DEPUIS UN DEVIS */}
          {mode === 'from_devis' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <FileText className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-bold text-xs">Génération directe sans commande intermédiaire</p>
                  <p className="text-[11px] mt-0.5">
                    Sélectionnez un devis validé ou proposé au client. Les articles, tarifs et frais seront automatiquement intégrés dans la facture officielle.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Sélectionner le devis source *
                </label>
                <select
                  value={selectedDevisId}
                  onChange={(e) => setSelectedDevisId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Choisir un devis ({devis.length} disponibles) --</option>
                  {devis.map((d) => {
                    const cli = clients.find((c) => c.id === d.clientId);
                    return (
                      <option key={d.id} value={d.id}>
                        {d.numero} — {cli?.nom || 'Client'} ({formatCurrency(d.total, parametres.devise)}) — {d.statut}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedDevisId && (
                (() => {
                  const target = devis.find((d) => d.id === selectedDevisId);
                  const cli = clients.find((c) => c.id === target?.clientId);
                  if (!target) return null;
                  return (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between font-bold">
                        <span>Client : {cli?.nom}</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(target.total, parametres.devise)}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        {target.articles.length} article(s) • Frais : {formatCurrency(target.fraisLivraisonChine + target.fraisTransaction, parametres.devise)}
                      </p>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* Mode 3: DEPUIS UNE COMMANDE */}
          {mode === 'from_commande' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                <ShoppingBag className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-bold text-xs">Facture adossée à une commande existante</p>
                  <p className="text-[11px] mt-0.5">
                    Sélectionnez une commande client (qu'elle soit issue d'un devis ou créée directement sans devis). Les paiements déjà encaissés seront déduits.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Sélectionner la commande *
                </label>
                <select
                  value={selectedCommandeId}
                  onChange={(e) => setSelectedCommandeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Choisir une commande ({commandes.length} disponibles) --</option>
                  {commandes.map((c) => {
                    const cli = clients.find((cl) => cl.id === c.clientId);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.numero} — {cli?.nom || 'Client'} ({formatCurrency(c.montantTotal, parametres.devise)}) — Statut : {c.statut}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedCommandeId && (
                (() => {
                  const target = commandes.find((c) => c.id === selectedCommandeId);
                  const cli = clients.find((cl) => cl.id === target?.clientId);
                  if (!target) return null;
                  return (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between font-bold">
                        <span>Client : {cli?.nom}</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(target.montantTotal, parametres.devise)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Déjà réglé : {formatCurrency(target.montantPaye, parametres.devise)}</span>
                        <span className="font-bold text-rose-600">
                          Reste à payer : {formatCurrency(target.solde, parametres.devise)}
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* Mode 1: FACTURE DIRECTE (Formulaire complet) */}
          {mode === 'direct' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Client destinataire *
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">-- Sélectionner un client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} ({c.telephone || c.ville || 'Lomé'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date de la facture *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Articles direct input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Articles & Prestations ({articles.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddArticle}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1 hover:bg-indigo-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter un article
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {articles.map((art, index) => (
                    <div
                      key={art.id || index}
                      className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Désignation du produit ou prestation *"
                          value={art.nomProduit}
                          onChange={(e) => handleArticleChange(index, 'nomProduit', e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                          required
                        />
                        {articles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveArticle(index)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                            Prix Unit. (FCFA)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={art.prixUnitaire || ''}
                            onChange={(e) => handleArticleChange(index, 'prixUnitaire', Number(e.target.value))}
                            placeholder="0"
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                            Quantité
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={art.quantite || 1}
                            onChange={(e) => handleArticleChange(index, 'quantite', Number(e.target.value))}
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                            Total Ligne
                          </label>
                          <div className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(art.total, parametres.devise)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Frais et Règlement initial */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Frais annexes & Paiement initial
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                      Frais de livraison ({parametres.devise})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={fraisLivraison || ''}
                      onChange={(e) => setFraisLivraison(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                      Autres frais annexes ({parametres.devise})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={fraisAutres || ''}
                      onChange={(e) => setFraisAutres(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                      Acompte / Montant payé ({parametres.devise})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={totalGeneral}
                      value={montantPayeInitial || ''}
                      onChange={(e) => setMontantPayeInitial(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-emerald-600"
                    />
                  </div>
                </div>

                {/* Recap */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Total Facture : </span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white text-sm">
                      {formatCurrency(totalGeneral, parametres.devise)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Reste à payer (Solde) : </span>
                    <span className={`font-bold font-mono text-sm ${solde === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(solde, parametres.devise)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              Générer la facture
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
