import React, { useState, useEffect } from 'react';
import { X, CreditCard, Check, AlertTriangle } from 'lucide-react';
import { Commande, Client, ModePaiement, Paiement } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';

interface PaiementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (paiementData: Omit<Paiement, 'id' | 'numero'>) => void;
  preselectedCommande?: Commande | null;
}

export const PaiementFormModal: React.FC<PaiementFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  preselectedCommande,
}) => {
  const { commandes, clients, parametres } = useApp();

  const [commandeId, setCommandeId] = useState('');
  const [montant, setMontant] = useState<number>(0);
  const [modePaiement, setModePaiement] = useState<ModePaiement>('TMoney');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [error, setError] = useState('');
  const [showOverpaymentWarning, setShowOverpaymentWarning] = useState(false);

  // Filter commands that have an outstanding balance or are active
  const selectableCommandes = commandes.filter((c) => !c.isArchived);

  useEffect(() => {
    if (preselectedCommande) {
      setCommandeId(preselectedCommande.id);
      setMontant(preselectedCommande.solde > 0 ? preselectedCommande.solde : 0);
    } else if (selectableCommandes.length > 0 && !commandeId) {
      setCommandeId(selectableCommandes[0].id);
      setMontant(selectableCommandes[0].solde > 0 ? selectableCommandes[0].solde : 0);
    }
    setDate(new Date().toISOString().slice(0, 10));
    setReference('');
    setNote('');
    setError('');
    setShowOverpaymentWarning(false);
  }, [isOpen, preselectedCommande]);

  if (!isOpen) return null;

  const currentCommande = selectableCommandes.find((c) => c.id === commandeId);
  const currentClient = currentCommande
    ? clients.find((cl) => cl.id === currentCommande.clientId)
    : null;

  const handleSelectCommande = (cmdId: string) => {
    setCommandeId(cmdId);
    const target = selectableCommandes.find((c) => c.id === cmdId);
    if (target) {
      setMontant(target.solde > 0 ? target.solde : 0);
    }
  };

  const handleProceedSave = () => {
    if (!currentCommande) {
      setError('Veuillez sélectionner une commande');
      return;
    }
    if (montant <= 0) {
      setError('Le montant du paiement doit être supérieur à zéro');
      return;
    }

    onSave({
      clientId: currentCommande.clientId,
      commandeId: currentCommande.id,
      date: new Date(date).toISOString(),
      montant: Number(montant),
      modePaiement,
      reference: reference.trim(),
      note: note.trim(),
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCommande) {
      setError('Veuillez sélectionner une commande');
      return;
    }
    if (montant <= 0) {
      setError('Le montant du paiement doit être supérieur à zéro');
      return;
    }

    // Check for overpayment (Section 34)
    if (montant > currentCommande.solde && currentCommande.solde > 0) {
      setShowOverpaymentWarning(true);
      return;
    }

    handleProceedSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-900 dark:text-white">
              Enregistrer un paiement
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overpayment Warning Modal Overlay (Section 34) */}
        {showOverpaymentWarning && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Paiement supérieur au solde de la commande !
              </p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Le solde actuel est de {formatCurrency(currentCommande?.solde || 0, parametres.devise)}, mais vous saisissez {formatCurrency(montant, parametres.devise)}. Confirmez-vous ce montant ?
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleProceedSave}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold"
                >
                  Oui, accepter
                </button>
                <button
                  type="button"
                  onClick={() => setShowOverpaymentWarning(false)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-semibold"
                >
                  Modifier le montant
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300 rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          {/* Commande Selection */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Commande concernée *
            </label>
            <select
              value={commandeId}
              onChange={(e) => handleSelectCommande(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              required
            >
              {selectableCommandes.map((cmd) => {
                const cl = clients.find((c) => c.id === cmd.clientId);
                return (
                  <option key={cmd.id} value={cmd.id}>
                    {cmd.numero} - {cl?.nom} (Solde: {formatCurrency(cmd.solde, parametres.devise)})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Current Commande Financial Card */}
          {currentCommande && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Client :</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentClient?.nom}</span>
              </div>
              <div className="flex justify-between">
                <span>Total commande :</span>
                <span className="font-mono font-semibold">{formatCurrency(currentCommande.montantTotal, parametres.devise)}</span>
              </div>
              <div className="flex justify-between">
                <span>Déjà payé :</span>
                <span className="font-mono text-emerald-600 font-semibold">{formatCurrency(currentCommande.montantPaye, parametres.devise)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                <span>Solde restant à régler :</span>
                <span className="font-mono text-rose-600">{formatCurrency(currentCommande.solde, parametres.devise)}</span>
              </div>
            </div>
          )}

          {/* Montant */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Montant versé ({parametres.devise}) *
            </label>
            <input
              type="number"
              min="1"
              value={montant === 0 ? '' : montant}
              onChange={(e) => setMontant(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-full px-3 py-2 text-base font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400"
              required
            />
          </div>

          {/* Mode de paiement (Section 19) */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mode de paiement
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['TMoney', 'Flooz', 'Espèces', 'Virement bancaire', 'Autre'] as ModePaiement[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setModePaiement(mode)}
                  className={`py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-all ${
                    modePaiement === mode
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Référence / N° transaction
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="ID TMoney, reçu..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Note (facultatif)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Acompte 50%, remise au magasin..."
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" />
              Valider le versement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
