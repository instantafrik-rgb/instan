import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Camera,
  Image as ImageIcon,
  ExternalLink,
  Check,
  Calculator,
} from 'lucide-react';
import { Devis, Client, ArticleLigne, DevisStatut } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';

interface DevisFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (devisData: Omit<Devis, 'id' | 'numero'>) => void;
  initialData?: Devis | null;
  initialClient?: Client | null;
}

export const DevisFormModal: React.FC<DevisFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  initialClient,
}) => {
  const { clients, parametres } = useApp();

  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [articles, setArticles] = useState<ArticleLigne[]>([]);
  const [fraisLivraisonChine, setFraisLivraisonChine] = useState<number>(0);
  const [fraisTransactionPourcent, setFraisTransactionPourcent] = useState<number>(
    parametres.fraisTransactionDefaut || 5
  );
  const [statut, setStatut] = useState<DevisStatut>('Brouillon');
  const [notes, setNotes] = useState('');
  const [conditions, setConditions] = useState(
    'Validité 7 jours. Acompte de 70% requis pour validation de la commande auprès des fournisseurs en Chine.'
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setClientId(initialData.clientId);
      setDate(initialData.date ? initialData.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setArticles(initialData.articles || []);
      setFraisLivraisonChine(initialData.fraisLivraisonChine || 0);
      setFraisTransactionPourcent(
        initialData.fraisTransactionPourcent !== undefined
          ? initialData.fraisTransactionPourcent
          : parametres.fraisTransactionDefaut || 5
      );
      setStatut(initialData.statut || 'Brouillon');
      setNotes(initialData.notes || '');
      setConditions(initialData.conditions || '');
    } else {
      setClientId(initialClient ? initialClient.id : clients[0]?.id || '');
      setDate(new Date().toISOString().slice(0, 10));
      setArticles([
        {
          id: `art-${Date.now()}-1`,
          nomProduit: '',
          description: '',
          lienAlibaba: '',
          prixUnitaire: 0,
          quantite: 1,
          total: 0,
        },
      ]);
      setFraisLivraisonChine(0);
      setFraisTransactionPourcent(parametres.fraisTransactionDefaut || 5);
      setStatut('Brouillon');
      setNotes('');
      setConditions(
        'Validité 7 jours. Acompte de 70% requis pour validation de la commande auprès des fournisseurs en Chine.'
      );
    }
    setError('');
  }, [initialData, initialClient, isOpen, parametres]);

  if (!isOpen) return null;

  // Real-time calculations (Section 11)
  const sousTotal = articles.reduce((acc, art) => acc + (art.total || 0), 0);
  const fraisTransaction = Math.round(sousTotal * (fraisTransactionPourcent / 100));
  const total = sousTotal + (Number(fraisLivraisonChine) || 0) + fraisTransaction;

  // Article handlers
  const handleAddArticle = () => {
    setArticles((prev) => [
      ...prev,
      {
        id: `art-${Date.now()}-${prev.length + 1}`,
        nomProduit: '',
        description: '',
        lienAlibaba: '',
        prixUnitaire: 0,
        quantite: 1,
        total: 0,
      },
    ]);
  };

  const handleUpdateArticle = (
    index: number,
    field: keyof ArticleLigne,
    value: string | number
  ) => {
    setArticles((prev) => {
      const updated = [...prev];
      const art = { ...updated[index], [field]: value };

      if (field === 'prixUnitaire' || field === 'quantite') {
        const pu = Number(field === 'prixUnitaire' ? value : art.prixUnitaire) || 0;
        const qte = Number(field === 'quantite' ? value : art.quantite) || 0;
        art.total = pu * qte;
      }

      updated[index] = art;
      return updated;
    });
  };

  const handleRemoveArticle = (index: number) => {
    if (articles.length === 1) {
      setError('Un devis doit comporter au moins un article');
      return;
    }
    setArticles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        handleUpdateArticle(index, 'photo', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Veuillez sélectionner un client');
      return;
    }

    // Validation (Requirement 34)
    for (let i = 0; i < articles.length; i++) {
      const art = articles[i];
      if (!art.nomProduit.trim()) {
        setError(`L'article N° ${i + 1} doit avoir un nom`);
        return;
      }
      if (art.quantite <= 0) {
        setError(`La quantité pour "${art.nomProduit}" doit être supérieure à 0`);
        return;
      }
      if (art.prixUnitaire < 0) {
        setError(`Le prix pour "${art.nomProduit}" ne peut pas être négatif`);
        return;
      }
    }

    if (fraisLivraisonChine < 0) {
      setError('Les frais de livraison ne peuvent pas être négatifs');
      return;
    }

    onSave({
      clientId,
      date: new Date(date).toISOString(),
      articles,
      sousTotal,
      fraisLivraisonChine: Number(fraisLivraisonChine) || 0,
      fraisTransactionPourcent: Number(fraisTransactionPourcent) || 0,
      fraisTransaction,
      total,
      statut,
      notes,
      conditions,
      isArchived: initialData ? initialData.isArchived : false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {initialData ? `Modifier le devis ${initialData.numero}` : 'Nouveau devis de sourcing'}
            </h3>
            <p className="text-xs text-slate-500">
              Calcul automatique des frais Alibaba et taux de transaction
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800">
              {error}
            </div>
          )}

          {/* Top Client & Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Client destinataire *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner un client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({c.telephone} - {c.ville})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Statut du devis
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(['Brouillon', 'Envoyé', 'Accepté', 'Refusé', 'Expiré'] as DevisStatut[]).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setStatut(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statut === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* ARTICLES SECTION (Section 10) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Articles & Produits ({articles.length})
              </h4>
              <button
                type="button"
                onClick={handleAddArticle}
                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un article
              </button>
            </div>

            <div className="space-y-3">
              {articles.map((art, idx) => (
                <div
                  key={art.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500 text-[10px]">
                      ARTICLE #{idx + 1}
                    </span>
                    {articles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveArticle(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="Supprimer l'article"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Photo upload / preview */}
                    <div className="sm:col-span-3 flex flex-col items-center justify-center">
                      {art.photo ? (
                        <div className="relative group w-full h-20 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700">
                          <img
                            src={art.photo}
                            alt="Produit"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateArticle(idx, 'photo', '')}
                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                          >
                            Supprimer
                          </button>
                        </div>
                      ) : (
                        <label className="w-full h-20 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 flex flex-col items-center justify-center cursor-pointer bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors">
                          <Camera className="w-5 h-5 mb-0.5" />
                          <span className="text-[9px] text-center px-1">Photo / Caméra</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(idx, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Product Name & Description */}
                    <div className="sm:col-span-9 space-y-2">
                      <input
                        type="text"
                        value={art.nomProduit}
                        onChange={(e) => handleUpdateArticle(idx, 'nomProduit', e.target.value)}
                        placeholder="Nom du produit (ex: Montre connectée Smartwatch T900)*"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        required
                      />
                      <input
                        type="text"
                        value={art.description || ''}
                        onChange={(e) => handleUpdateArticle(idx, 'description', e.target.value)}
                        placeholder="Description facultative (couleur, spécifications, modèle)..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <input
                        type="url"
                        value={art.lienAlibaba || ''}
                        onChange={(e) => handleUpdateArticle(idx, 'lienAlibaba', e.target.value)}
                        placeholder="Lien Alibaba / 1688 facultatif (https://...)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Pricing row */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <div>
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400">
                        Prix unitaire ({parametres.devise})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={art.prixUnitaire === 0 ? '' : art.prixUnitaire}
                        onChange={(e) => handleUpdateArticle(idx, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400">
                        Quantité
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={art.quantite}
                        onChange={(e) => handleUpdateArticle(idx, 'quantite', parseInt(e.target.value, 10) || 1)}
                        className="w-full px-2.5 py-1.5 font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 dark:text-slate-400">
                        Total ligne
                      </label>
                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold font-mono text-slate-900 dark:text-white text-right">
                        {formatCurrency(art.total, parametres.devise)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CALCUL DU DEVIS (Section 11) */}
          <div className="bg-blue-50/60 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-2.5">
            <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-bold text-[11px] uppercase tracking-wider">
              <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Récapitulatif & Calculs automatiques
            </div>

            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span>Sous-total articles :</span>
              <span className="font-mono font-bold">{formatCurrency(sousTotal, parametres.devise)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 items-center">
              <span className="text-slate-700 dark:text-slate-300">
                Frais de livraison en Chine :
              </span>
              <input
                type="number"
                min="0"
                value={fraisLivraisonChine === 0 ? '' : fraisLivraisonChine}
                onChange={(e) => setFraisLivraisonChine(parseFloat(e.target.value) || 0)}
                placeholder="0 FCFA"
                className="w-full px-2.5 py-1 text-right font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 items-center">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                Frais de transaction :
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={fraisTransactionPourcent}
                  onChange={(e) => setFraisTransactionPourcent(parseFloat(e.target.value) || 0)}
                  className="w-12 px-1 py-0.5 text-center text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                %
              </span>
              <div className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(fraisTransaction, parametres.devise)}
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200 dark:border-blue-900/80 flex justify-between items-center text-sm font-bold text-blue-950 dark:text-white">
              <span>TOTAL DEVIS :</span>
              <span className="text-base text-blue-600 dark:text-blue-400 font-mono">
                {formatCurrency(total, parametres.devise)}
              </span>
            </div>
          </div>

          {/* Notes & Terms */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes complémentaires (facultatif)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : emballage étanche, contrôle qualité usine..."
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Conditions de vente & de sourcing
            </label>
            <textarea
              rows={2}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" />
              {initialData ? 'Mettre à jour le devis' : 'Enregistrer le devis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
