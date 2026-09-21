import React, { useRef } from 'react';
import { UserPlus, Smartphone, X, FileText, ChevronRight, Upload } from 'lucide-react';
import { isContactPickerSupported } from '../utils/contactPicker';

interface AddClientChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectManual: () => void;
  onSelectImportPhone: () => void;
  onSelectVCardImport?: (file: File) => void;
}

export const AddClientChoiceModal: React.FC<AddClientChoiceModalProps> = ({
  isOpen,
  onClose,
  onSelectManual,
  onSelectImportPhone,
  onSelectVCardImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobileContactSupported = isContactPickerSupported();

  if (!isOpen) return null;

  const handleVcfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSelectVCardImport) {
      onSelectVCardImport(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Ajouter un client
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choisissez votre méthode de création de client
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3 pt-1">
          {/* Option 1: Saisie manuelle */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectManual();
            }}
            className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-left transition group cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Nouveau client
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Saisie manuelle des informations (Nom, prénom, téléphone, ville, quartier)
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 shrink-0 mt-2.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>

          {/* Option 2: Importer depuis le téléphone */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectImportPhone();
            }}
            className="w-full p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/80 hover:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 text-left transition group cursor-pointer shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200 group-hover:text-indigo-600 transition-colors">
                      📱 Importer depuis mes contacts
                    </h4>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      Rapide
                    </span>
                  </div>
                  <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 mt-0.5">
                    Sélection directe dans le répertoire téléphonique de votre smartphone
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 shrink-0 mt-2.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>

          {/* Windows / PC Alternative: vCard import option */}
          {!isMobileContactSupported && onSelectVCardImport && (
            <div className="pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".vcf,text/vcard"
                className="hidden"
                onChange={handleVcfChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importer un fichier contact vCard (.vcf) sur PC</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
