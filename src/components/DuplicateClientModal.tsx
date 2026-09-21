import React from 'react';
import { AlertTriangle, Eye, X, Phone, User } from 'lucide-react';
import { Client } from '../types';

interface DuplicateClientModalProps {
  isOpen: boolean;
  phone: string;
  existingClient: Client | null;
  onViewClient: (client: Client) => void;
  onClose: () => void;
}

export const DuplicateClientModal: React.FC<DuplicateClientModalProps> = ({
  isOpen,
  phone,
  existingClient,
  onViewClient,
  onClose,
}) => {
  if (!isOpen || !existingClient) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-md w-full p-5 shadow-2xl border border-amber-300 dark:border-amber-800/80 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Numéro de téléphone déjà existant
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              Ce numéro est déjà enregistré pour ce client.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Client summary card */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-xs text-slate-900 dark:text-white">
              {existingClient.nom} {existingClient.prenom ? `(${existingClient.prenom})` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>Tél : {existingClient.telephone}</span>
          </div>
          {existingClient.ville && (
            <p className="text-[11px] text-slate-500">
              Localisation : {existingClient.ville} {existingClient.quartier ? `- ${existingClient.quartier}` : ''}
            </p>
          )}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Pour préserver l'intégrité de vos devis et commandes, l'application évite les doublons. Souhaitez-vous consulter la fiche de ce client existant ?
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-center"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              onViewClient(existingClient);
              onClose();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
          >
            <Eye className="w-4 h-4" />
            Voir le client existant
          </button>
        </div>
      </div>
    </div>
  );
};
