import React from 'react';
import { Phone, Check, X } from 'lucide-react';

interface SelectPhoneModalProps {
  isOpen: boolean;
  contactName: string;
  phones: string[];
  selectedPhone: string;
  onSelect: (phone: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const SelectPhoneModal: React.FC<SelectPhoneModalProps> = ({
  isOpen,
  contactName,
  phones,
  selectedPhone,
  onSelect,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Choisir un numéro
              </h3>
              <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                {contactName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          Ce contact possède plusieurs numéros. Sélectionnez le numéro principal à associer à sa fiche client :
        </p>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {phones.map((phone, idx) => {
            const isSelected = (selectedPhone === phone) || (!selectedPhone && idx === 0);
            return (
              <button
                key={`${phone}-${idx}`}
                type="button"
                onClick={() => onSelect(phone)}
                className={`w-full p-3 rounded-xl border text-left text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Phone className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{phone}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Valider ce numéro
          </button>
        </div>
      </div>
    </div>
  );
};
